import { createClient } from "@/lib/supabase/server";
import type {
  AccountState,
  CognitiveLevel,
  QualityReport,
  TeacherAssessment,
  TeacherAssessmentQuestion,
  TeacherAssessmentStatus,
  TeacherAssessmentType,
  TeacherCurriculumSubtopic,
  TeacherCurriculumTopic,
  TeacherCurriculumUnit,
  TeacherDifficulty,
  TeacherLearningObjective,
  TeacherQuestion,
  TeacherQuestionOption,
  TeacherQuestionStatus,
  TeacherQuestionType,
  TeacherSubject,
} from "@/types/database.types";
import {
  generateDeterministicQuestions,
  validateQuestionQuality,
  validateQuestionStatusTransition,
  validateAssessmentStatusTransition,
  validateAssessmentForPublishing,
} from "@/lib/intelligence/teacher-quality";

// ==============================================================================
// AUDIT LOGGING HELPER
// ==============================================================================
export async function logTeacherAuditEvent(
  supabase: any,
  actorId: string,
  action: string,
  entityType: string,
  entityId?: string | null,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await (supabase.from("audit_logs") as any).insert({
      actor_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details: details || {},
    });
  } catch (err) {
    console.error("[TeacherService] Audit log write warning:", err);
  }
}

// ==============================================================================
// AUTHORIZATION & VERIFICATION GATEKEEPING
// ==============================================================================

export interface TeacherAuthVerificationResult {
  authorized: boolean;
  isVerified: boolean;
  status: string;
  error?: string;
  userId?: string;
}

/**
 * Asserts that the authenticated user has the TEACHER role and is actively VERIFIED.
 * Rejects unverified, pending, rejected, or non-teacher users.
 */
export async function verifyTeacherPrivilege(
  targetUserId?: string
): Promise<TeacherAuthVerificationResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { authorized: false, isVerified: false, status: "UNAUTHENTICATED", error: "Authentication required." };
  }

  // Prevent cross-user ID tampering: caller cannot spoof a different userId
  if (targetUserId && targetUserId !== user.id) {
    return {
      authorized: false,
      isVerified: false,
      status: "FORBIDDEN",
      error: "Security Alert: Cross-user ID tampering detected.",
    };
  }

  // Fetch profile
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("id, account_type, account_state")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return { authorized: false, isVerified: false, status: "PROFILE_NOT_FOUND", error: "User profile not found." };
  }

  // Fetch roles
  const { data: userRoles } = await (supabase.from("user_roles") as any)
    .select("role")
    .eq("user_id", user.id);

  const roles = (userRoles || []).map((r: any) => r.role);
  const isPlatformAdmin = roles.includes("PLATFORM_ADMIN") || roles.includes("SECURITY_ADMIN");

  const hasTeacherRole =
    isPlatformAdmin ||
    roles.includes("TEACHER") ||
    roles.includes("INSTRUCTOR") ||
    profile.account_type === "TEACHER";

  if (!hasTeacherRole) {
    return {
      authorized: false,
      isVerified: false,
      status: "ROLE_MISMATCH",
      error: "Access Denied: Teacher role required.",
      userId: user.id,
    };
  }

  const accountState = profile.account_state;
  if (["SUSPENDED", "REVOKED", "REJECTED"].includes(accountState)) {
    return {
      authorized: false,
      isVerified: false,
      status: accountState,
      error: `Access Denied: Account is ${accountState}.`,
      userId: user.id,
    };
  }

  const isVerified = isPlatformAdmin || accountState === "VERIFIED" || accountState === "ACTIVE";

  if (!isVerified) {
    return {
      authorized: true, // User can access verification portal
      isVerified: false, // But cannot perform privileged actions
      status: accountState, // PENDING or UNDER_REVIEW
      error: "Privileged action requires verified teacher credentials.",
      userId: user.id,
    };
  }

  return {
    authorized: true,
    isVerified: true,
    status: accountState,
    userId: user.id,
  };
}

// ==============================================================================
// 1. DASHBOARD STATS
// ==============================================================================

export interface TeacherDashboardStats {
  verificationStatus: AccountState;
  isVerified: boolean;
  totalSubjects: number;
  totalTopics: number;
  totalQuestions: number;
  approvedQuestions: number;
  draftQuestions: number;
  reviewQuestions: number;
  totalAssessments: number;
}

export async function getTeacherDashboardStats(userId: string): Promise<TeacherDashboardStats> {
  const supabase = await createClient();

  const { data: profile } = await (supabase.from("profiles") as any)
    .select("account_state")
    .eq("id", userId)
    .single();

  const status: AccountState = profile?.account_state || "PENDING";
  const isVerified = status === "VERIFIED" || status === "ACTIVE";

  // Subjects count
  const { count: totalSubjects } = await (supabase.from("teacher_subjects") as any)
    .select("*", { count: "exact", head: true })
    .eq("owner_id", userId)
    .eq("status", "ACTIVE");

  // Topics count
  const { count: totalTopics } = await (supabase.from("teacher_curriculum_topics") as any)
    .select("*", { count: "exact", head: true })
    .eq("owner_id", userId);

  // Questions counts
  const { data: questions } = await (supabase.from("teacher_questions") as any)
    .select("status")
    .eq("owner_id", userId);

  const totalQuestions = questions?.length || 0;
  const approvedQuestions = questions?.filter((q: any) => q.status === "APPROVED").length || 0;
  const draftQuestions = questions?.filter((q: any) => q.status === "DRAFT").length || 0;
  const reviewQuestions = questions?.filter((q: any) => q.status === "REVIEW").length || 0;

  // Assessments count
  const { count: totalAssessments } = await (supabase.from("teacher_assessments") as any)
    .select("*", { count: "exact", head: true })
    .eq("owner_id", userId);

  return {
    verificationStatus: status,
    isVerified,
    totalSubjects: totalSubjects || 0,
    totalTopics: totalTopics || 0,
    totalQuestions,
    approvedQuestions,
    draftQuestions,
    reviewQuestions,
    totalAssessments: totalAssessments || 0,
  };
}

// ==============================================================================
// 2. SUBJECT MANAGEMENT
// ==============================================================================

export async function getTeacherSubjects(
  userId: string,
  options?: {
    organizationId?: string | null;
  }
): Promise<TeacherSubject[]> {
  const supabase = await createClient();

  // Fetch active org memberships
  const { data: orgMemberships } = await (supabase.from("organization_members") as any)
    .select("organization_id")
    .eq("user_id", userId)
    .eq("status", "ACTIVE");

  const orgIds = (orgMemberships || [])
    .map((m: any) => m.organization_id)
    .filter(Boolean);

  let query = (supabase.from("teacher_subjects") as any).select("*");

  if (options?.organizationId) {
    query = query.eq("organization_id", options.organizationId);
  } else if (orgIds.length > 0) {
    query = query.or(`owner_id.eq.${userId},organization_id.in.(${orgIds.join(",")})`);
  } else {
    query = query.eq("owner_id", userId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as TeacherSubject[];
}

export async function getTeacherSubjectDetails(
  userId: string,
  subjectId: string
): Promise<TeacherSubject | null> {
  const supabase = await createClient();
  const { data, error } = await (supabase.from("teacher_subjects") as any)
    .select("*")
    .eq("id", subjectId)
    .maybeSingle();

  if (error || !data) return null;

  // 1. Direct owner match
  if (data.owner_id === userId) {
    return data as TeacherSubject;
  }

  // 2. Institutional match: verify active organization membership
  if (data.organization_id) {
    const { data: member } = await (supabase.from("organization_members") as any)
      .select("id, status, role")
      .eq("organization_id", data.organization_id)
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (member) {
      return data as TeacherSubject;
    }
  }

  // 3. Platform Admin check
  const { data: isPlatformAdmin } = await (supabase.rpc as any)("is_platform_admin", { user_id: userId });
  if (isPlatformAdmin) {
    return data as TeacherSubject;
  }

  return null;
}

export async function createTeacherSubject(
  userId: string,
  payload: {
    name: string;
    code?: string;
    description?: string;
    education_level?: string;
    academic_year?: string;
    organization_id?: string | null;
  }
): Promise<TeacherSubject> {
  if (!payload.name || !payload.name.trim()) {
    throw new Error("Subject name is required.");
  }

  const supabase = await createClient();

  // If organization_id is provided, verify active organization membership
  if (payload.organization_id) {
    const { data: member } = await (supabase.from("organization_members") as any)
      .select("id, role, status")
      .eq("organization_id", payload.organization_id)
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    const { data: isPlatformAdmin } = await (supabase.rpc as any)("is_platform_admin", { user_id: userId });

    if (!member && !isPlatformAdmin) {
      throw new Error("You are not an active member of the specified organization.");
    }
  }

  const insertData: any = {
    owner_id: userId,
    name: payload.name.trim(),
    code: payload.code?.trim() || null,
    description: payload.description?.trim() || null,
    education_level: payload.education_level?.trim() || null,
    academic_year: payload.academic_year?.trim() || null,
    status: "ACTIVE",
  };

  if (payload.organization_id) {
    insertData.organization_id = payload.organization_id;
  }

  let { data, error } = await (supabase.from("teacher_subjects") as any)
    .insert(insertData)
    .select()
    .single();

  // Handle PGRST204 resilience if organization_id column is pending on remote schema
  if (error && error.code === "PGRST204" && insertData.organization_id) {
    delete insertData.organization_id;
    const retry = await (supabase.from("teacher_subjects") as any)
      .insert(insertData)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw new Error(error.message);

  await logTeacherAuditEvent(supabase, userId, "subject.created", "teacher_subject", (data as any)?.id, {
    name: (data as any)?.name,
    organization_id: payload.organization_id || null,
  });

  return data as TeacherSubject;
}

export async function updateTeacherSubject(
  userId: string,
  subjectId: string,
  updates: Partial<Pick<TeacherSubject, "name" | "code" | "description" | "education_level" | "academic_year" | "status">>
): Promise<TeacherSubject> {
  const supabase = await createClient();

  // Enforce access authorization
  const existing = await getTeacherSubjectDetails(userId, subjectId);
  if (!existing) {
    throw new Error("Subject not found or access denied.");
  }

  const { data, error } = await (supabase.from("teacher_subjects") as any)
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", subjectId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logTeacherAuditEvent(supabase, userId, "subject.updated", "teacher_subject", subjectId, updates);

  return data as TeacherSubject;
}

export async function archiveTeacherSubject(userId: string, subjectId: string): Promise<void> {
  await updateTeacherSubject(userId, subjectId, { status: "ARCHIVED" });
}

// ==============================================================================
// 3. CURRICULUM TREE BUILDER
// ==============================================================================

export interface CurriculumTreeUnit extends TeacherCurriculumUnit {
  topics: Array<
    TeacherCurriculumTopic & {
      subtopics: Array<
        TeacherCurriculumSubtopic & {
          learningObjectives: TeacherLearningObjective[];
        }
      >;
    }
  >;
}

export async function getCurriculumTree(userId: string, subjectId: string): Promise<CurriculumTreeUnit[]> {
  const supabase = await createClient();

  // Verify subject authorization
  const subject = await getTeacherSubjectDetails(userId, subjectId);
  if (!subject) throw new Error("Subject not found or access denied.");

  const [unitsRes, topicsRes] = await Promise.all([
    (supabase.from("teacher_curriculum_units") as any)
      .select("*")
      .eq("subject_id", subjectId)
      .order("sequence"),
    (supabase.from("teacher_curriculum_topics") as any)
      .select("*")
      .eq("subject_id", subjectId)
      .order("sequence"),
  ]);

  const units = (unitsRes.data || []) as TeacherCurriculumUnit[];
  const topics = (topicsRes.data || []) as TeacherCurriculumTopic[];
  const topicIds = topics.map((t) => t.id);

  let subtopics: TeacherCurriculumSubtopic[] = [];
  let objectives: TeacherLearningObjective[] = [];

  if (topicIds.length > 0) {
    const { data: subData } = await (supabase.from("teacher_curriculum_subtopics") as any)
      .select("*")
      .in("topic_id", topicIds)
      .order("sequence");
    subtopics = (subData || []) as TeacherCurriculumSubtopic[];

    const subtopicIds = subtopics.map((s) => s.id);
    if (subtopicIds.length > 0) {
      const { data: objData } = await (supabase.from("teacher_learning_objectives") as any)
        .select("*")
        .in("subtopic_id", subtopicIds)
        .order("sequence");
      objectives = (objData || []) as TeacherLearningObjective[];
    }
  }

  return units.map((unit) => {
    const unitTopics = topics
      .filter((t) => t.unit_id === unit.id)
      .map((topic) => {
        const topicSubtopics = subtopics
          .filter((st) => st.topic_id === topic.id)
          .map((subtopic) => {
            const subObjectives = objectives.filter((lo) => lo.subtopic_id === subtopic.id);
            return {
              ...subtopic,
              learningObjectives: subObjectives,
            };
          });
        return {
          ...topic,
          subtopics: topicSubtopics,
        };
      });

    return {
      ...unit,
      topics: unitTopics,
    };
  });
}

export async function addCurriculumUnit(
  userId: string,
  subjectId: string,
  title: string,
  sequence?: number
): Promise<TeacherCurriculumUnit> {
  const supabase = await createClient();
  const subject = await getTeacherSubjectDetails(userId, subjectId);
  if (!subject) throw new Error("Subject not found or access denied.");

  const { data, error } = await (supabase.from("teacher_curriculum_units") as any)
    .insert({
      subject_id: subjectId,
      owner_id: userId,
      title: title.trim(),
      sequence: sequence ?? 1,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as TeacherCurriculumUnit;
}

export async function addCurriculumTopic(
  userId: string,
  unitId: string,
  subjectId: string,
  title: string,
  importance: "CORE" | "IMPORTANT" | "SUPPLEMENTARY" | "HIGH" | "MEDIUM" | "LOW" = "MEDIUM",
  sequence?: number
): Promise<TeacherCurriculumTopic> {
  const supabase = await createClient();

  const subject = await getTeacherSubjectDetails(userId, subjectId);
  if (!subject) throw new Error("Subject not found or access denied.");

  const { data: unitRecord } = await (supabase.from("teacher_curriculum_units") as any)
    .select("id, subject_id")
    .eq("id", unitId)
    .maybeSingle();

  if (!unitRecord || unitRecord.subject_id !== subjectId) {
    throw new Error("Unit not found under the specified subject.");
  }

  const { data, error } = await (supabase.from("teacher_curriculum_topics") as any)
    .insert({
      unit_id: unitId,
      subject_id: subjectId,
      owner_id: userId,
      title: title.trim(),
      importance,
      sequence: sequence ?? 1,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as TeacherCurriculumTopic;
}

export async function addCurriculumSubtopic(
  userId: string,
  topicId: string,
  title: string,
  sequence?: number
): Promise<TeacherCurriculumSubtopic> {
  const supabase = await createClient();

  const { data: topicRecord } = await (supabase.from("teacher_curriculum_topics") as any)
    .select("id, subject_id")
    .eq("id", topicId)
    .maybeSingle();

  if (!topicRecord) {
    throw new Error("Topic not found or access denied.");
  }

  const subject = await getTeacherSubjectDetails(userId, topicRecord.subject_id);
  if (!subject) throw new Error("Subject not found or access denied.");

  const { data, error } = await (supabase.from("teacher_curriculum_subtopics") as any)
    .insert({
      topic_id: topicId,
      owner_id: userId,
      title: title.trim(),
      sequence: sequence ?? 1,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as TeacherCurriculumSubtopic;
}

export async function addCurriculumObjective(
  userId: string,
  subtopicId: string,
  description: string,
  sequence?: number
): Promise<TeacherLearningObjective> {
  const supabase = await createClient();

  const { data: subtopicRecord } = await (supabase.from("teacher_curriculum_subtopics") as any)
    .select("id, topic_id")
    .eq("id", subtopicId)
    .maybeSingle();

  if (!subtopicRecord) {
    throw new Error("Subtopic not found or access denied.");
  }

  const { data: topicRecord } = await (supabase.from("teacher_curriculum_topics") as any)
    .select("id, subject_id")
    .eq("id", subtopicRecord.topic_id)
    .maybeSingle();

  if (!topicRecord) {
    throw new Error("Parent topic not found.");
  }

  const subject = await getTeacherSubjectDetails(userId, topicRecord.subject_id);
  if (!subject) throw new Error("Subject not found or access denied.");

  const { data, error } = await (supabase.from("teacher_learning_objectives") as any)
    .insert({
      subtopic_id: subtopicId,
      owner_id: userId,
      description: description.trim(),
      sequence: sequence ?? 1,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as TeacherLearningObjective;
}

// ==============================================================================
// 4. QUESTION BANK MANAGEMENT
// ==============================================================================

export interface QuestionBankFilters {
  subjectId?: string;
  unitId?: string;
  topicId?: string;
  subtopic?: string;
  difficulty?: TeacherDifficulty;
  questionType?: TeacherQuestionType;
  cognitiveLevel?: CognitiveLevel;
  status?: TeacherQuestionStatus;
  searchTerm?: string;
  authorId?: string;
  organizationId?: string | null;
  sort?: "newest" | "oldest" | "updated" | "status";
}

export async function getTeacherQuestions(
  userId: string,
  filters: QuestionBankFilters = {}
): Promise<TeacherQuestion[]> {
  const supabase = await createClient();

  // If organizationId is specified, verify active membership
  if (filters.organizationId) {
    const { data: member } = await (supabase.from("organization_members") as any)
      .select("id, status, role")
      .eq("organization_id", filters.organizationId)
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    const { data: isPlatformAdmin } = await (supabase.rpc as any)("is_platform_admin", { user_id: userId });

    if (!member && !isPlatformAdmin) {
      throw new Error("Unauthorized access to organization question bank.");
    }
  }

  let query = (supabase.from("teacher_questions") as any).select("*");

  if (filters.organizationId) {
    query = query.eq("organization_id", filters.organizationId);
  } else if (filters.authorId) {
    query = query.eq("owner_id", filters.authorId);
  } else {
    // Independent or general teacher view: questions owned by the user
    query = query.eq("owner_id", userId);
  }

  if (filters.subjectId) query = query.eq("subject_id", filters.subjectId);
  if (filters.unitId) query = query.eq("unit_id", filters.unitId);
  if (filters.topicId) query = query.eq("topic_id", filters.topicId);
  if (filters.subtopic) query = query.ilike("subtopic", `%${filters.subtopic}%`);
  if (filters.difficulty) query = query.eq("difficulty", filters.difficulty);
  if (filters.questionType) query = query.eq("question_type", filters.questionType);
  if (filters.cognitiveLevel) query = query.eq("cognitive_level", filters.cognitiveLevel);
  if (filters.status) query = query.eq("status", filters.status);

  // Sorting
  switch (filters.sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "updated":
      query = query.order("updated_at", { ascending: false });
      break;
    case "status":
      query = query.order("status", { ascending: true }).order("created_at", { ascending: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let results = (data || []) as TeacherQuestion[];

  // Server-side search filtering (search term on question text, correct answer, or tags)
  if (filters.searchTerm && filters.searchTerm.trim()) {
    const term = filters.searchTerm.trim().toLowerCase();
    results = results.filter((q) => {
      const matchText = q.question_text?.toLowerCase().includes(term);
      const matchAnswer = q.correct_answer?.toLowerCase().includes(term);
      const matchTags = Array.isArray(q.tags) && q.tags.some((t: string) => t.toLowerCase().includes(term));
      const matchSubtopic = q.subtopic?.toLowerCase().includes(term);
      return matchText || matchAnswer || matchTags || matchSubtopic;
    });
  }

  return results;
}

export async function getTeacherQuestionCounts(
  userId: string,
  organizationId?: string | null
): Promise<{
  total: number;
  draft: number;
  qualityCheck: number;
  review: number;
  approved: number;
  rejected: number;
  archived: number;
}> {
  const questions = await getTeacherQuestions(userId, { organizationId });

  return {
    total: questions.length,
    draft: questions.filter((q) => q.status === "DRAFT").length,
    qualityCheck: questions.filter((q) => q.status === "QUALITY_CHECK").length,
    review: questions.filter((q) => q.status === "REVIEW").length,
    approved: questions.filter((q) => q.status === "APPROVED").length,
    rejected: questions.filter((q) => q.status === "REJECTED").length,
    archived: questions.filter((q) => q.status === "ARCHIVED").length,
  };
}

export async function getTeacherQuestionDetails(
  userId: string,
  questionId: string,
  organizationId?: string | null
): Promise<TeacherQuestion | null> {
  const supabase = await createClient();

  const { data, error } = await (supabase.from("teacher_questions") as any)
    .select("*")
    .eq("id", questionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  // Authorization check: User must be author OR active member of question's organization OR platform admin
  const isAuthor = data.owner_id === userId;
  let isOrgMember = false;

  if (data.organization_id) {
    const { data: member } = await (supabase.from("organization_members") as any)
      .select("id")
      .eq("organization_id", data.organization_id)
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    isOrgMember = Boolean(member);
  }

  const { data: isPlatformAdmin } = await (supabase.rpc as any)("is_platform_admin", { user_id: userId });

  if (!isAuthor && !isOrgMember && !isPlatformAdmin) {
    return null; // Deny access across tenant boundaries
  }

  return data as TeacherQuestion;
}

export async function getQuestionAuditLogs(questionId: string) {
  const supabase = await createClient();
  const { data, error } = await (supabase.from("audit_logs") as any)
    .select("id, actor_id, action, entity_type, entity_id, details, created_at")
    .eq("entity_id", questionId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function createTeacherQuestion(
  userId: string,
  payload: {
    subject_id: string;
    unit_id?: string | null;
    topic_id?: string | null;
    subtopic?: string | null;
    subtopic_id?: string | null;
    learning_objective_id?: string | null;
    question_type: TeacherQuestionType;
    question_text: string;
    options?: TeacherQuestionOption[];
    correct_answer?: string | null;
    explanation?: string | null;
    difficulty: TeacherDifficulty;
    cognitive_level: CognitiveLevel;
    marks: number;
    tags?: string[];
    estimated_time?: number;
    organization_id?: string | null;
    status?: TeacherQuestionStatus;
  }
): Promise<TeacherQuestion> {
  const supabase = await createClient();

  // If organizationId is provided, verify active organization membership
  if (payload.organization_id) {
    const { data: member } = await (supabase.from("organization_members") as any)
      .select("id")
      .eq("organization_id", payload.organization_id)
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (!member) {
      throw new Error("You do not belong to the selected organization.");
    }
  }

  const isDraftMode = (payload.status || "DRAFT") === "DRAFT";

  // Fetch existing questions by this author / organization for duplicate check
  const existingQuestions = await getTeacherQuestions(userId, {
    subjectId: payload.subject_id,
    organizationId: payload.organization_id,
  });

  // Run deterministic quality check
  const qualityReport = validateQuestionQuality(
    {
      ...payload,
      owner_id: userId,
      topic_id: payload.topic_id || undefined,
      correct_answer: payload.correct_answer || undefined,
    },
    existingQuestions.map((q) => ({ id: q.id, question_text: q.question_text })),
    isDraftMode
  );

  // If not draft and quality check failed, reject
  if (!isDraftMode && qualityReport.status === "FAIL") {
    throw new Error(`Question quality validation failed: ${qualityReport.errors.join("; ")}`);
  }

  const insertData = {
    owner_id: userId,
    organization_id: payload.organization_id || null,
    subject_id: payload.subject_id,
    unit_id: payload.unit_id || null,
    topic_id: payload.topic_id || null,
    subtopic: payload.subtopic?.trim() || null,
    subtopic_id: payload.subtopic_id || null,
    learning_objective_id: payload.learning_objective_id || null,
    question_type: payload.question_type,
    question_text: payload.question_text.trim(),
    options: payload.options || [],
    correct_answer: payload.correct_answer?.trim() || null,
    explanation: payload.explanation?.trim() || null,
    difficulty: payload.difficulty,
    cognitive_level: payload.cognitive_level,
    marks: payload.marks || 1,
    tags: payload.tags || [],
    estimated_time: payload.estimated_time || 60,
    status: payload.status || "DRAFT",
    quality_status: qualityReport.status,
    quality_report: qualityReport,
  };

  let { data, error } = await (supabase.from("teacher_questions") as any)
    .insert(insertData)
    .select()
    .single();

  if (error && (error.code === "PGRST204" || error.message?.includes("column"))) {
    // Schema cache has not yet refreshed with Day 9 migration columns
    const baseData: Record<string, any> = { ...insertData };
    delete baseData.subtopic;
    delete baseData.subtopic_id;
    delete baseData.tags;
    delete baseData.estimated_time;
    delete baseData.rejection_reason;
    delete baseData.reviewed_by;
    delete baseData.reviewed_at;
    delete baseData.review_notes;
    const retry = await (supabase.from("teacher_questions") as any)
      .insert(baseData)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw new Error(error.message);

  // Audit event
  await logTeacherAuditEvent(
    supabase,
    userId,
    "QUESTION_CREATED",
    "teacher_question",
    (data as any)?.id,
    {
      question_type: (data as any)?.question_type,
      marks: (data as any)?.marks,
      status: (data as any)?.status,
      organization_id: payload.organization_id,
    }
  );

  return data as TeacherQuestion;
}

export async function updateTeacherQuestion(
  userId: string,
  questionId: string,
  updates: Partial<TeacherQuestion> & {
    isDraftMode?: boolean;
    organizationId?: string | null;
  }
): Promise<TeacherQuestion> {
  const supabase = await createClient();
  const existing = await getTeacherQuestionDetails(userId, questionId, updates.organizationId);
  if (!existing) throw new Error("Question not found or access denied.");

  // Immutability Rule: APPROVED questions cannot be silently modified
  if (existing.status === "APPROVED") {
    throw new Error(
      "APPROVED questions cannot be directly modified. Create a new revision draft or archive the question."
    );
  }

  const merged = { ...existing, ...updates };
  const existingQuestions = await getTeacherQuestions(userId, {
    subjectId: existing.subject_id,
    organizationId: existing.organization_id,
  });
  const otherQuestions = existingQuestions.filter((q) => q.id !== questionId);

  const isDraftMode = updates.isDraftMode ?? (merged.status === "DRAFT");
  const qualityReport = validateQuestionQuality(
    merged,
    otherQuestions.map((q) => ({ id: q.id, question_text: q.question_text })),
    isDraftMode
  );

  if (!isDraftMode && qualityReport.status === "FAIL") {
    throw new Error(`Question quality validation failed: ${qualityReport.errors.join("; ")}`);
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    quality_status: qualityReport.status,
    quality_report: qualityReport,
  };

  if (updates.question_text !== undefined) updatePayload.question_text = updates.question_text.trim();
  if (updates.options !== undefined) updatePayload.options = updates.options;
  if (updates.correct_answer !== undefined) updatePayload.correct_answer = updates.correct_answer?.trim() || null;
  if (updates.explanation !== undefined) updatePayload.explanation = updates.explanation?.trim() || null;
  if (updates.difficulty !== undefined) updatePayload.difficulty = updates.difficulty;
  if (updates.cognitive_level !== undefined) updatePayload.cognitive_level = updates.cognitive_level;
  if (updates.marks !== undefined) updatePayload.marks = updates.marks;
  if (updates.topic_id !== undefined) updatePayload.topic_id = updates.topic_id || null;
  if (updates.unit_id !== undefined) updatePayload.unit_id = updates.unit_id || null;
  if (updates.subtopic !== undefined) updatePayload.subtopic = updates.subtopic?.trim() || null;
  if (updates.subtopic_id !== undefined) updatePayload.subtopic_id = updates.subtopic_id || null;
  if (updates.tags !== undefined) updatePayload.tags = updates.tags;
  if (updates.estimated_time !== undefined) updatePayload.estimated_time = updates.estimated_time;

  const { data, error } = await (supabase.from("teacher_questions") as any)
    .update(updatePayload)
    .eq("id", questionId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logTeacherAuditEvent(supabase, userId, "QUESTION_UPDATED", "teacher_question", questionId, {
    status: (data as any)?.status,
  });

  return data as TeacherQuestion;
}

export async function transitionTeacherQuestionStatus(
  userId: string,
  questionId: string,
  targetStatus: TeacherQuestionStatus,
  options?: {
    rejectionReason?: string;
    reviewNotes?: string;
    organizationId?: string | null;
  }
): Promise<TeacherQuestion> {
  const supabase = await createClient();
  const existing = await getTeacherQuestionDetails(userId, questionId, options?.organizationId);
  if (!existing) throw new Error("Question not found or access denied.");

  // Ordinary teachers cannot approve their own questions (conflict of interest)
  if (targetStatus === "APPROVED") {
    const { data: isPlatformAdmin } = await (supabase.rpc as any)("is_platform_admin", { user_id: userId });
    if (existing.owner_id === userId && !isPlatformAdmin) {
      throw new Error("Forbidden: Ordinary teachers cannot approve their own questions. Institutional peer or administrator review is required.");
    }
  }

  const transitionCheck = validateQuestionStatusTransition(existing.status, targetStatus);
  if (!transitionCheck.valid) {
    throw new Error(transitionCheck.reason || "Invalid status transition.");
  }

  // Quality check requirement for REVIEW or APPROVED
  if (targetStatus === "REVIEW" || targetStatus === "APPROVED") {
    const existingQuestions = await getTeacherQuestions(userId, {
      subjectId: existing.subject_id,
      organizationId: existing.organization_id,
    });
    const otherQuestions = existingQuestions.filter((q) => q.id !== questionId);
    const qualityReport = validateQuestionQuality(
      existing,
      otherQuestions.map((q) => ({ id: q.id, question_text: q.question_text })),
      false // strict validation mode
    );

    if (qualityReport.status === "FAIL") {
      throw new Error(`Cannot transition to ${targetStatus}: ${qualityReport.errors.join("; ")}`);
    }
  }

  // Rejection requires a reason
  if (targetStatus === "REJECTED" && (!options?.rejectionReason || !options.rejectionReason.trim())) {
    throw new Error("A rejection reason is required when rejecting a question.");
  }

  const updateFields: Record<string, unknown> = {
    status: targetStatus,
    updated_at: new Date().toISOString(),
  };

  if (targetStatus === "REJECTED") {
    updateFields.rejection_reason = options?.rejectionReason?.trim();
    updateFields.reviewed_by = userId;
    updateFields.reviewed_at = new Date().toISOString();
    updateFields.review_notes = options?.reviewNotes?.trim() || null;
  } else if (targetStatus === "APPROVED") {
    updateFields.rejection_reason = null;
    updateFields.reviewed_by = userId;
    updateFields.reviewed_at = new Date().toISOString();
    updateFields.review_notes = options?.reviewNotes?.trim() || null;
  } else if (targetStatus === "DRAFT") {
    // When returning to draft, keep previous rejection reason visible or clear as desired
    updateFields.review_notes = options?.reviewNotes?.trim() || null;
  }

  const { data, error } = await (supabase.from("teacher_questions") as any)
    .update(updateFields)
    .eq("id", questionId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Map to core Day 9 audit action names
  let auditAction = "QUESTION_UPDATED";
  if (targetStatus === "REVIEW") auditAction = "QUESTION_SUBMITTED_REVIEW";
  else if (targetStatus === "APPROVED") auditAction = "QUESTION_APPROVED";
  else if (targetStatus === "REJECTED") auditAction = "QUESTION_REJECTED";
  else if (targetStatus === "ARCHIVED") auditAction = "QUESTION_ARCHIVED";
  else if (targetStatus === "QUALITY_CHECK") auditAction = "QUESTION_QUALITY_CHECKED";

  await logTeacherAuditEvent(supabase, userId, auditAction, "teacher_question", questionId, {
    previousStatus: existing.status,
    newStatus: targetStatus,
    rejectionReason: options?.rejectionReason,
  });

  return data as TeacherQuestion;
}

// ==============================================================================
// 5. ASSESSMENT FOUNDATION & EXAM MANAGEMENT (DAY 10)
// ==============================================================================

const DAY10_CONFIG_TAG = "[DAY10_CONFIG]";

function extractAssessmentConfig(rawDescription: string | null): {
  cleanDescription: string | null;
  config: Record<string, any>;
} {
  if (!rawDescription) return { cleanDescription: null, config: {} };
  const idx = rawDescription.indexOf(DAY10_CONFIG_TAG);
  if (idx === -1) return { cleanDescription: rawDescription, config: {} };

  const cleanDescription = rawDescription.slice(0, idx).trim() || null;
  const configJson = rawDescription.slice(idx + DAY10_CONFIG_TAG.length).trim();
  try {
    const config = JSON.parse(configJson);
    return { cleanDescription, config };
  } catch {
    return { cleanDescription: rawDescription, config: {} };
  }
}

function parseAssessmentRecord(row: any): TeacherAssessment {
  const { cleanDescription, config } = extractAssessmentConfig(row.description);

  return {
    id: row.id,
    owner_id: row.owner_id,
    organization_id: row.organization_id || null,
    subject_id: row.subject_id,
    title: row.title,
    description: cleanDescription,
    instructions: row.instructions || config.instructions || null,
    assessment_type: (row.assessment_type || config.assessment_type || "EXAM") as TeacherAssessmentType,
    status: (row.status || "DRAFT") as TeacherAssessmentStatus,
    duration_minutes: Number(row.duration_minutes ?? config.duration_minutes ?? 60),
    total_marks: Number(row.total_marks ?? config.total_marks ?? 0),
    pass_percentage: Number(row.pass_percentage ?? config.pass_percentage ?? 40),
    scheduled_start: row.scheduled_start || config.scheduled_start || null,
    scheduled_end: row.scheduled_end || config.scheduled_end || null,
    attempt_limit: Number(row.attempt_limit ?? config.attempt_limit ?? 1),
    shuffle_questions: Boolean(row.shuffle_questions ?? config.shuffle_questions ?? false),
    shuffle_options: Boolean(row.shuffle_options ?? config.shuffle_options ?? false),
    created_at: row.created_at,
    updated_at: row.updated_at,
    subject: row.teacher_subjects || undefined,
  };
}

export async function getTeacherAssessments(
  userId: string,
  filters?: {
    subjectId?: string;
    status?: TeacherAssessmentStatus;
    organizationId?: string | null;
  }
): Promise<TeacherAssessment[]> {
  const supabase = await createClient();

  if (filters?.organizationId) {
    const { data: member } = await (supabase.from("organization_members") as any)
      .select("id, status")
      .eq("organization_id", filters.organizationId)
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    const { data: isPlatformAdmin } = await (supabase.rpc as any)("is_platform_admin", { user_id: userId });

    if (!member && !isPlatformAdmin) {
      throw new Error("Unauthorized: Access denied to organization assessments.");
    }
  }

  let query = (supabase.from("teacher_assessments") as any)
    .select("*, teacher_subjects(*)")
    .order("created_at", { ascending: false });

  if (filters?.organizationId) {
    query = query.eq("organization_id", filters.organizationId);
  } else {
    query = query.eq("owner_id", userId);
  }

  if (filters?.subjectId) query = query.eq("subject_id", filters.subjectId);
  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const assessments = (data || []).map(parseAssessmentRecord);

  // Fetch question counts and calculate total marks
  for (const a of assessments) {
    const { data: qRows } = await (supabase.from("teacher_assessment_questions") as any)
      .select("marks")
      .eq("assessment_id", a.id);
    a.question_count = qRows?.length || 0;
    if (qRows && qRows.length > 0) {
      const sum = qRows.reduce((acc: number, curr: any) => acc + (curr.marks || 1), 0);
      if (a.total_marks === 0 || a.total_marks !== sum) {
        a.total_marks = sum;
      }
    }
  }

  return assessments;
}

export async function getTeacherAssessmentDetails(
  userId: string,
  assessmentId: string,
  options?: {
    organizationId?: string | null;
    isStudent?: boolean;
  }
): Promise<{ assessment: TeacherAssessment; questions: TeacherAssessmentQuestion[] } | null> {
  const supabase = await createClient();

  const { data: row, error } = await (supabase.from("teacher_assessments") as any)
    .select("*, teacher_subjects(*)")
    .eq("id", assessmentId)
    .maybeSingle();

  if (error || !row) return null;

  // Authorization check
  const isOwner = row.owner_id === userId;
  const { data: isPlatformAdmin } = await (supabase.rpc as any)("is_platform_admin", { user_id: userId });

  let hasOrgAccess = false;
  if (row.organization_id) {
    const { data: member } = await (supabase.from("organization_members") as any)
      .select("id, status")
      .eq("organization_id", row.organization_id)
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .maybeSingle();
    hasOrgAccess = Boolean(member);
  }

  const isStudent = options?.isStudent ?? false;
  if (isStudent) {
    if (row.status !== "PUBLISHED") {
      throw new Error("Assessment is not currently published.");
    }
  } else if (!isOwner && !hasOrgAccess && !isPlatformAdmin) {
    throw new Error("Access denied: You are not authorized to view this assessment.");
  }

  const assessment = parseAssessmentRecord(row);

  // Fetch attached questions
  const { data: qRows } = await (supabase.from("teacher_assessment_questions") as any)
    .select("*, teacher_questions(*)")
    .eq("assessment_id", assessmentId)
    .order("display_order", { ascending: true });

  const questions: TeacherAssessmentQuestion[] = (qRows || []).map((q: any) => {
    let qData = q.teacher_questions;
    // Security: NEVER expose correct_answer or internal notes to students!
    if (isStudent && qData) {
      const { correct_answer, rejection_reason, review_notes, ...safeQuestion } = qData;
      qData = safeQuestion;
    }

    return {
      id: q.id,
      assessment_id: q.assessment_id,
      question_id: q.question_id,
      display_order: q.display_order,
      marks: q.marks,
      is_mandatory: q.is_mandatory ?? true,
      section_name: q.section_name ?? null,
      created_at: q.created_at,
      question: qData,
    };
  });

  assessment.question_count = questions.length;
  if (questions.length > 0) {
    assessment.total_marks = questions.reduce((acc, curr) => acc + (curr.marks || 1), 0);
  }

  return { assessment, questions };
}

export async function createTeacherAssessment(
  userId: string,
  payload: {
    subject_id: string;
    title: string;
    description?: string | null;
    instructions?: string | null;
    assessment_type?: TeacherAssessmentType;
    duration_minutes?: number;
    total_marks?: number;
    pass_percentage?: number;
    scheduled_start?: string | null;
    scheduled_end?: string | null;
    attempt_limit?: number;
    shuffle_questions?: boolean;
    shuffle_options?: boolean;
    organization_id?: string | null;
  }
): Promise<TeacherAssessment> {
  if (!payload.title || !payload.title.trim()) {
    throw new Error("Assessment title is required.");
  }
  if (!payload.subject_id) {
    throw new Error("Subject is required.");
  }

  const duration = Number(payload.duration_minutes ?? 60);
  if (duration <= 0 || duration > 1440) {
    throw new Error("Assessment duration must be between 1 and 1440 minutes.");
  }

  const passPct = Number(payload.pass_percentage ?? 40);
  if (passPct < 0 || passPct > 100) {
    throw new Error("Pass percentage must be between 0% and 100%.");
  }

  if (payload.scheduled_start && payload.scheduled_end) {
    if (new Date(payload.scheduled_end).getTime() <= new Date(payload.scheduled_start).getTime()) {
      throw new Error("Scheduled end time must be strictly after the start time.");
    }
  }

  const supabase = await createClient();
  const subject = await getTeacherSubjectDetails(userId, payload.subject_id);
  if (!subject) throw new Error("Subject not found or access denied.");

  let targetOrgId = payload.organization_id || subject.organization_id || null;
  if (targetOrgId) {
    const { data: member } = await (supabase.from("organization_members") as any)
      .select("id, status")
      .eq("organization_id", targetOrgId)
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    const { data: isPlatformAdmin } = await (supabase.rpc as any)("is_platform_admin", { user_id: userId });

    if (!member && !isPlatformAdmin) {
      throw new Error("Unauthorized: Active institutional faculty membership required for organization assessment.");
    }
  }

  const assessmentType = payload.assessment_type || "EXAM";
  const attemptLimit = Math.max(1, payload.attempt_limit ?? 1);

  // Attempt direct insertion with Day 10 columns
  const fullRecord: Record<string, any> = {
    owner_id: userId,
    subject_id: payload.subject_id,
    organization_id: targetOrgId,
    title: payload.title.trim(),
    description: payload.description?.trim() || null,
    instructions: payload.instructions?.trim() || null,
    assessment_type: assessmentType,
    status: "DRAFT",
    duration_minutes: duration,
    total_marks: payload.total_marks ?? 0,
    pass_percentage: passPct,
    scheduled_start: payload.scheduled_start || null,
    scheduled_end: payload.scheduled_end || null,
    attempt_limit: attemptLimit,
    shuffle_questions: Boolean(payload.shuffle_questions),
    shuffle_options: Boolean(payload.shuffle_options),
  };

  let insertedRow: any = null;
  const { data: directData, error: directErr } = await (supabase.from("teacher_assessments") as any)
    .insert(fullRecord)
    .select("*, teacher_subjects(*)")
    .single();

  if (!directErr && directData) {
    insertedRow = directData;
  } else {
    // Fallback: encode Day 10 attributes into description tag if migration not yet applied remotely
    const configPayload = {
      instructions: payload.instructions?.trim() || null,
      assessment_type: assessmentType,
      duration_minutes: duration,
      total_marks: payload.total_marks ?? 0,
      pass_percentage: passPct,
      scheduled_start: payload.scheduled_start || null,
      scheduled_end: payload.scheduled_end || null,
      attempt_limit: attemptLimit,
      shuffle_questions: Boolean(payload.shuffle_questions),
      shuffle_options: Boolean(payload.shuffle_options),
    };

    const combinedDescription = `${payload.description?.trim() || ""}\n\n${DAY10_CONFIG_TAG} ${JSON.stringify(configPayload)}`.trim();

    const coreRecord = {
      owner_id: userId,
      subject_id: payload.subject_id,
      organization_id: targetOrgId,
      title: payload.title.trim(),
      description: combinedDescription,
      status: "DRAFT",
    };

    const { data: fallbackData, error: fallbackErr } = await (supabase.from("teacher_assessments") as any)
      .insert(coreRecord)
      .select("*, teacher_subjects(*)")
      .single();

    if (fallbackErr) throw new Error(fallbackErr.message);
    insertedRow = fallbackData;
  }

  await logTeacherAuditEvent(supabase, userId, "assessment.created", "teacher_assessment", insertedRow.id, {
    title: insertedRow.title,
    organizationId: targetOrgId,
  });

  return parseAssessmentRecord(insertedRow);
}

export async function updateTeacherAssessment(
  userId: string,
  assessmentId: string,
  payload: {
    title?: string;
    description?: string | null;
    instructions?: string | null;
    assessment_type?: TeacherAssessmentType;
    duration_minutes?: number;
    pass_percentage?: number;
    scheduled_start?: string | null;
    scheduled_end?: string | null;
    attempt_limit?: number;
    shuffle_questions?: boolean;
    shuffle_options?: boolean;
  }
): Promise<TeacherAssessment> {
  const supabase = await createClient();

  const details = await getTeacherAssessmentDetails(userId, assessmentId);
  if (!details) throw new Error("Assessment not found or access denied.");
  const existing = details.assessment;

  if (payload.duration_minutes !== undefined) {
    const duration = Number(payload.duration_minutes);
    if (duration <= 0 || duration > 1440) {
      throw new Error("Assessment duration must be between 1 and 1440 minutes.");
    }
  }

  if (payload.pass_percentage !== undefined) {
    const passPct = Number(payload.pass_percentage);
    if (passPct < 0 || passPct > 100) {
      throw new Error("Pass percentage must be between 0% and 100%.");
    }
  }

  const start = payload.scheduled_start !== undefined ? payload.scheduled_start : existing.scheduled_start;
  const end = payload.scheduled_end !== undefined ? payload.scheduled_end : existing.scheduled_end;
  if (start && end && new Date(end).getTime() <= new Date(start).getTime()) {
    throw new Error("Scheduled end time must be strictly after the start time.");
  }

  // Attempt direct update
  const directFields: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.title) directFields.title = payload.title.trim();
  if (payload.description !== undefined) directFields.description = payload.description?.trim() || null;
  if (payload.instructions !== undefined) directFields.instructions = payload.instructions?.trim() || null;
  if (payload.assessment_type) directFields.assessment_type = payload.assessment_type;
  if (payload.duration_minutes !== undefined) directFields.duration_minutes = payload.duration_minutes;
  if (payload.pass_percentage !== undefined) directFields.pass_percentage = payload.pass_percentage;
  if (payload.scheduled_start !== undefined) directFields.scheduled_start = payload.scheduled_start;
  if (payload.scheduled_end !== undefined) directFields.scheduled_end = payload.scheduled_end;
  if (payload.attempt_limit !== undefined) directFields.attempt_limit = payload.attempt_limit;
  if (payload.shuffle_questions !== undefined) directFields.shuffle_questions = payload.shuffle_questions;
  if (payload.shuffle_options !== undefined) directFields.shuffle_options = payload.shuffle_options;

  let updatedRow: any = null;
  const { data: directData, error: directErr } = await (supabase.from("teacher_assessments") as any)
    .update(directFields)
    .eq("id", assessmentId)
    .select("*, teacher_subjects(*)")
    .single();

  if (!directErr && directData) {
    updatedRow = directData;
  } else {
    // Fallback: encode into description
    const config = {
      instructions: payload.instructions !== undefined ? payload.instructions : existing.instructions,
      assessment_type: payload.assessment_type || existing.assessment_type,
      duration_minutes: payload.duration_minutes ?? existing.duration_minutes,
      total_marks: existing.total_marks,
      pass_percentage: payload.pass_percentage ?? existing.pass_percentage,
      scheduled_start: start,
      scheduled_end: end,
      attempt_limit: payload.attempt_limit ?? existing.attempt_limit,
      shuffle_questions: payload.shuffle_questions ?? existing.shuffle_questions,
      shuffle_options: payload.shuffle_options ?? existing.shuffle_options,
    };

    const baseDesc = payload.description !== undefined ? (payload.description || "") : (existing.description || "");
    const combinedDesc = `${baseDesc.trim()}\n\n${DAY10_CONFIG_TAG} ${JSON.stringify(config)}`.trim();

    const fallbackFields: Record<string, any> = {
      description: combinedDesc,
      updated_at: new Date().toISOString(),
    };
    if (payload.title) fallbackFields.title = payload.title.trim();

    const { data: fallbackData, error: fallbackErr } = await (supabase.from("teacher_assessments") as any)
      .update(fallbackFields)
      .eq("id", assessmentId)
      .select("*, teacher_subjects(*)")
      .single();

    if (fallbackErr) throw new Error(fallbackErr.message);
    updatedRow = fallbackData;
  }

  await logTeacherAuditEvent(supabase, userId, "assessment.updated", "teacher_assessment", assessmentId, {
    title: updatedRow.title,
  });

  return parseAssessmentRecord(updatedRow);
}

export async function transitionTeacherAssessmentStatus(
  userId: string,
  assessmentId: string,
  targetStatus: TeacherAssessmentStatus
): Promise<TeacherAssessment> {
  const supabase = await createClient();

  const details = await getTeacherAssessmentDetails(userId, assessmentId);
  if (!details) throw new Error("Assessment not found or access denied.");
  const { assessment, questions } = details;

  // 1. Legal lifecycle check
  const transitionCheck = validateAssessmentStatusTransition(assessment.status, targetStatus);
  if (!transitionCheck.valid) {
    throw new Error(transitionCheck.reason || "Invalid status transition.");
  }

  // 2. Publication validation checks
  let calculatedMarks = assessment.total_marks;
  if (targetStatus === "PUBLISHED") {
    const pubValidation = validateAssessmentForPublishing(assessment, questions);
    if (!pubValidation.valid) {
      throw new Error(`Cannot publish assessment: ${pubValidation.errors.join("; ")}`);
    }
    calculatedMarks = pubValidation.calculatedMarks;
  }

  // 3. Update status
  const updateFields: Record<string, any> = {
    status: targetStatus,
    updated_at: new Date().toISOString(),
  };

  // Try updating total_marks if column exists
  let updatedRow: any = null;
  const { data: directData, error: directErr } = await (supabase.from("teacher_assessments") as any)
    .update({ ...updateFields, total_marks: calculatedMarks })
    .eq("id", assessmentId)
    .select("*, teacher_subjects(*)")
    .single();

  if (!directErr && directData) {
    updatedRow = directData;
  } else {
    const { data: fallbackData, error: fallbackErr } = await (supabase.from("teacher_assessments") as any)
      .update(updateFields)
      .eq("id", assessmentId)
      .select("*, teacher_subjects(*)")
      .single();

    if (fallbackErr) throw new Error(fallbackErr.message);
    updatedRow = fallbackData;
  }

  const auditAction =
    targetStatus === "PUBLISHED"
      ? "assessment.published"
      : targetStatus === "CLOSED"
      ? "assessment.closed"
      : "assessment.archived";

  await logTeacherAuditEvent(supabase, userId, auditAction, "teacher_assessment", assessmentId, {
    previousStatus: assessment.status,
    newStatus: targetStatus,
    questionsCount: questions.length,
    totalMarks: calculatedMarks,
  });

  const res = parseAssessmentRecord(updatedRow);
  res.total_marks = calculatedMarks;
  return res;
}

export async function attachQuestionsToAssessment(
  userId: string,
  assessmentId: string,
  questionsToAttach: Array<string | { questionId: string; marks?: number; displayOrder?: number }>
): Promise<TeacherAssessmentQuestion[]> {
  const supabase = await createClient();

  const details = await getTeacherAssessmentDetails(userId, assessmentId);
  if (!details) throw new Error("Assessment not found or access denied.");
  const { assessment, questions: existingAttached } = details;

  // Protect published assessment with existing attempts
  if (assessment.status === "CLOSED" || assessment.status === "ARCHIVED") {
    throw new Error(`Cannot modify questions on an assessment with status '${assessment.status}'.`);
  }

  // Normalize input
  const normalizedEntries = questionsToAttach.map((item, idx) => {
    if (typeof item === "string") {
      return { questionId: item, marks: 1, displayOrder: existingAttached.length + idx + 1 };
    }
    return {
      questionId: item.questionId,
      marks: Math.max(1, Number(item.marks || 1)),
      displayOrder: item.displayOrder ?? existingAttached.length + idx + 1,
    };
  });

  // Check for duplicates within input
  const inputIds = new Set<string>();
  for (const entry of normalizedEntries) {
    if (inputIds.has(entry.questionId)) {
      throw new Error(`Duplicate question detected in payload (ID: ${entry.questionId}). Each question can only be added once.`);
    }
    inputIds.add(entry.questionId);
  }

  // Fetch candidate questions from Question Bank
  const questionIds = normalizedEntries.map((e) => e.questionId);
  const { data: dbQuestions, error: fetchErr } = await (supabase.from("teacher_questions") as any)
    .select("*")
    .in("id", questionIds);

  if (fetchErr || !dbQuestions || dbQuestions.length !== questionIds.length) {
    throw new Error("One or more question IDs were not found or access was denied.");
  }

  // Authorization and approval verification
  for (const q of dbQuestions) {
    const isOwner = q.owner_id === userId;
    const sameOrg = assessment.organization_id && q.organization_id === assessment.organization_id;
    if (!isOwner && !sameOrg) {
      throw new Error(`Unauthorized: Question ${q.id} belongs to a different owner or organization.`);
    }
  }

  const records = normalizedEntries.map((entry) => ({
    assessment_id: assessmentId,
    question_id: entry.questionId,
    display_order: entry.displayOrder,
    marks: entry.marks,
  }));

  const { data, error } = await (supabase.from("teacher_assessment_questions") as any)
    .upsert(records, { onConflict: "assessment_id,question_id" })
    .select();

  if (error) throw new Error(error.message);

  // Recalculate and update total marks on the assessment
  const { data: allQuestions } = await (supabase.from("teacher_assessment_questions") as any)
    .select("marks")
    .eq("assessment_id", assessmentId);

  const newTotalMarks = (allQuestions || []).reduce((sum: number, q: any) => sum + (q.marks || 1), 0);

  try {
    await (supabase.from("teacher_assessments") as any)
      .update({ total_marks: newTotalMarks, updated_at: new Date().toISOString() })
      .eq("id", assessmentId);
  } catch {
    // Non-blocking if total_marks column unmigrated
  }

  await logTeacherAuditEvent(supabase, userId, "assessment.questions_attached", "teacher_assessment", assessmentId, {
    attachedCount: records.length,
    newTotalMarks,
  });

  return (data || []) as TeacherAssessmentQuestion[];
}

export async function detachQuestionFromAssessment(
  userId: string,
  assessmentId: string,
  questionId: string
): Promise<void> {
  const supabase = await createClient();

  const details = await getTeacherAssessmentDetails(userId, assessmentId);
  if (!details) throw new Error("Assessment not found or access denied.");
  const { assessment } = details;

  if (assessment.status === "CLOSED" || assessment.status === "ARCHIVED") {
    throw new Error(`Cannot modify questions on an assessment with status '${assessment.status}'.`);
  }

  const { error } = await (supabase.from("teacher_assessment_questions") as any)
    .delete()
    .eq("assessment_id", assessmentId)
    .eq("question_id", questionId);

  if (error) throw new Error(error.message);

  // Recalculate marks
  const { data: remaining } = await (supabase.from("teacher_assessment_questions") as any)
    .select("marks")
    .eq("assessment_id", assessmentId);

  const newTotalMarks = (remaining || []).reduce((sum: number, q: any) => sum + (q.marks || 1), 0);

  try {
    await (supabase.from("teacher_assessments") as any)
      .update({ total_marks: newTotalMarks, updated_at: new Date().toISOString() })
      .eq("id", assessmentId);
  } catch {
    // Non-blocking
  }

  await logTeacherAuditEvent(supabase, userId, "assessment.question_detached", "teacher_assessment", assessmentId, {
    detachedQuestionId: questionId,
    newTotalMarks,
  });
}

export async function reorderAssessmentQuestions(
  userId: string,
  assessmentId: string,
  orderedQuestionIds: string[]
): Promise<void> {
  const supabase = await createClient();

  const details = await getTeacherAssessmentDetails(userId, assessmentId);
  if (!details) throw new Error("Assessment not found or access denied.");

  for (let i = 0; i < orderedQuestionIds.length; i++) {
    await (supabase.from("teacher_assessment_questions") as any)
      .update({ display_order: i + 1 })
      .eq("assessment_id", assessmentId)
      .eq("question_id", orderedQuestionIds[i]);
  }

  await logTeacherAuditEvent(supabase, userId, "assessment.questions_reordered", "teacher_assessment", assessmentId, {
    reorderedCount: orderedQuestionIds.length,
  });
}

export async function deleteTeacherAssessment(
  userId: string,
  assessmentId: string
): Promise<void> {
  const supabase = await createClient();

  const details = await getTeacherAssessmentDetails(userId, assessmentId);
  if (!details) throw new Error("Assessment not found or access denied.");
  const { assessment } = details;

  if (assessment.status === "PUBLISHED" || assessment.status === "CLOSED") {
    throw new Error(`Cannot delete an assessment in '${assessment.status}' status. Archive it instead.`);
  }

  const { error } = await (supabase.from("teacher_assessments") as any)
    .delete()
    .eq("id", assessmentId)
    .eq("owner_id", userId);

  if (error) throw new Error(error.message);

  await logTeacherAuditEvent(supabase, userId, "assessment.deleted", "teacher_assessment", assessmentId, {
    deletedTitle: assessment.title,
  });
}

export async function generateAndSaveTemplateQuestions(
  userId: string,
  params: {
    topicTitle: string;
    topicId: string;
    subjectId: string;
    unitId?: string | null;
    count?: number;
  }
): Promise<TeacherQuestion[]> {
  const generatedTemplates = generateDeterministicQuestions({
    topicTitle: params.topicTitle,
    topicId: params.topicId,
    subjectId: params.subjectId,
    unitId: params.unitId,
    ownerId: userId,
    count: params.count || 4,
  });

  const createdQuestions: TeacherQuestion[] = [];
  for (const t of generatedTemplates) {
    const q = await createTeacherQuestion(userId, {
      subject_id: t.subject_id,
      unit_id: t.unit_id,
      topic_id: t.topic_id,
      question_type: t.question_type,
      question_text: t.question_text,
      options: t.options,
      correct_answer: t.correct_answer,
      explanation: t.explanation,
      difficulty: t.difficulty,
      cognitive_level: t.cognitive_level,
      marks: t.marks,
      status: "DRAFT",
    });
    createdQuestions.push(q);
  }

  return createdQuestions;
}
