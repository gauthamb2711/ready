import { createClient } from "@/lib/supabase/server";
import type {
  StudentSubject,
  StudentUnit,
  CurriculumTopic,
  CurriculumSubtopic,
  LearningObjective,
  PreparationLevel,
} from "@/types/database.types";
import { resolveTargetScoreNumber } from "@/lib/intelligence/gap";

export interface CreateSubjectInput {
  name: string;
  code?: string;
  description?: string;
  examDate?: string;
  targetScore: string;
  availableDailyStudyTime: string;
  currentPrepLevel: PreparationLevel;
}

export interface CurriculumHierarchyUnit extends StudentUnit {
  topics: Array<
    CurriculumTopic & {
      subtopics: Array<
        CurriculumSubtopic & {
          learningObjectives: LearningObjective[];
        }
      >;
    }
  >;
}

export interface SubjectWithCurriculum {
  subject: StudentSubject;
  units: CurriculumHierarchyUnit[];
}

/**
 * Creates a student subject and sets initial target/gap scores.
 */
export async function createStudentSubject(
  userId: string,
  input: CreateSubjectInput
): Promise<StudentSubject> {
  const supabase = await createClient();

  const targetScoreNum = resolveTargetScoreNumber(input.targetScore);
  const initialCurrentCapability =
    input.currentPrepLevel === "REVISED"
      ? 50
      : input.currentPrepLevel === "COMPLETED"
      ? 40
      : input.currentPrepLevel === "SOME_PREPARATION"
      ? 20
      : 0;

  const initialGap = Math.max(0, targetScoreNum - initialCurrentCapability);

  const subjectRecord = {
    user_id: userId,
    name: input.name.trim(),
    code: input.code?.trim() || null,
    description: input.description?.trim() || null,
    exam_date: input.examDate || null,
    target_score: input.targetScore,
    available_daily_study_time: input.availableDailyStudyTime,
    current_prep_level: input.currentPrepLevel,
    current_capability_score: initialCurrentCapability,
    target_capability_score: targetScoreNum,
    capability_gap: initialGap,
  };

  // 1. Pre-flight parent profile verification: Ensure public.profiles record exists
  const { data: parentProfile, error: profileCheckError } = await (
    supabase.from("profiles") as any
  )
    .select("id, account_state, account_type")
    .eq("id", userId)
    .maybeSingle();

  if (profileCheckError || !parentProfile) {
    throw new Error(
      `Cannot create subject: Parent profile record for user '${userId}' does not exist in public.profiles. Identity synchronization required.`
    );
  }

  const { data, error } = await (supabase.from("student_subjects") as any)
    .insert(subjectRecord)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create subject");
  }

  return data as StudentSubject;
}

/**
 * Retrieves all subjects belonging to the authenticated student.
 */
export async function getStudentSubjects(userId: string): Promise<StudentSubject[]> {
  const supabase = await createClient();

  const { data, error } = await (supabase.from("student_subjects") as any)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching student subjects:", error);
    return [];
  }

  return (data || []) as StudentSubject[];
}

/**
 * Retrieves a single student subject by ID, guaranteeing ownership isolation.
 */
export async function getSubjectWithCurriculum(
  userId: string,
  subjectId: string
): Promise<SubjectWithCurriculum | null> {
  const supabase = await createClient();

  // 1. Fetch Subject with strict user_id check
  const { data: subjectData, error: subjectError } = await (
    supabase.from("student_subjects") as any
  )
    .select("*")
    .eq("id", subjectId)
    .eq("user_id", userId)
    .single();

  if (subjectError || !subjectData) {
    return null;
  }

  const subject = subjectData as StudentSubject;

  // 2. Fetch Units
  const { data: unitsData } = await (supabase.from("student_units") as any)
    .select("*")
    .eq("subject_id", subjectId)
    .eq("user_id", userId)
    .order("sequence", { ascending: true });

  const units = (unitsData || []) as StudentUnit[];

  // 3. Fetch Topics
  const { data: topicsData } = await (supabase.from("curriculum_topics") as any)
    .select("*")
    .eq("subject_id", subjectId)
    .eq("user_id", userId)
    .order("sequence", { ascending: true });

  const topics = (topicsData || []) as CurriculumTopic[];

  // 4. Fetch Subtopics
  const topicIds = topics.map((t) => t.id);
  let subtopics: CurriculumSubtopic[] = [];
  if (topicIds.length > 0) {
    const { data: subtopicsData } = await (supabase.from("curriculum_subtopics") as any)
      .select("*")
      .eq("user_id", userId)
      .in("topic_id", topicIds)
      .order("sequence", { ascending: true });

    subtopics = (subtopicsData || []) as CurriculumSubtopic[];
  }

  // 5. Fetch Learning Objectives
  const subtopicIds = subtopics.map((st) => st.id);
  let objectives: LearningObjective[] = [];
  if (subtopicIds.length > 0) {
    const { data: objData } = await (supabase.from("learning_objectives") as any)
      .select("*")
      .eq("user_id", userId)
      .in("subtopic_id", subtopicIds);

    objectives = (objData || []) as LearningObjective[];
  }

  // Assemble hierarchy: SUBJECT -> UNIT -> TOPIC -> SUBTOPIC -> LEARNING OBJECTIVE
  const hierarchyUnits: CurriculumHierarchyUnit[] = units.map((u) => {
    const unitTopics = topics
      .filter((t) => t.unit_id === u.id)
      .map((t) => {
        const topicSubtopics = subtopics
          .filter((st) => st.topic_id === t.id)
          .map((st) => {
            const stObjectives = objectives.filter((o) => o.subtopic_id === st.id);
            return {
              ...st,
              learningObjectives: stObjectives,
            };
          });

        return {
          ...t,
          subtopics: topicSubtopics,
        };
      });

    return {
      ...u,
      topics: unitTopics,
    };
  });

  return {
    subject,
    units: hierarchyUnits,
  };
}

/**
 * Adds a complete unit-topic-subtopic-objective node manually to a subject.
 */
export async function addCurriculumNode(
  userId: string,
  subjectId: string,
  input: {
    unitTitle: string;
    topicTitle: string;
    subtopicTitle: string;
    learningObjective: string;
    importance?: "CORE" | "FOUNDATIONAL" | "ADVANCED";
  }
) {
  const supabase = await createClient();

  // Verify subject ownership
  const { data: subject } = await (supabase.from("student_subjects") as any)
    .select("id")
    .eq("id", subjectId)
    .eq("user_id", userId)
    .single();

  if (!subject) throw new Error("Subject not found or unauthorized");

  // 1. Create Unit
  const { data: unit, error: unitError } = await (supabase.from("student_units") as any)
    .insert({
      subject_id: subjectId,
      user_id: userId,
      title: input.unitTitle.trim(),
    })
    .select()
    .single();

  if (unitError || !unit) throw new Error("Failed to create unit");

  // 2. Create Topic
  const { data: topic, error: topicError } = await (supabase.from("curriculum_topics") as any)
    .insert({
      unit_id: unit.id,
      subject_id: subjectId,
      user_id: userId,
      title: input.topicTitle.trim(),
      importance: input.importance || "CORE",
    })
    .select()
    .single();

  if (topicError || !topic) throw new Error("Failed to create topic");

  // 3. Create Subtopic
  const { data: subtopic, error: subtopicError } = await (
    supabase.from("curriculum_subtopics") as any
  )
    .insert({
      topic_id: topic.id,
      user_id: userId,
      title: input.subtopicTitle.trim(),
    })
    .select()
    .single();

  if (subtopicError || !subtopic) throw new Error("Failed to create subtopic");

  // 4. Create Learning Objective
  const { data: obj, error: objError } = await (
    supabase.from("learning_objectives") as any
  )
    .insert({
      subtopic_id: subtopic.id,
      user_id: userId,
      description: input.learningObjective.trim(),
    })
    .select()
    .single();

  if (objError || !obj) throw new Error("Failed to create learning objective");

  return { unit, topic, subtopic, learningObjective: obj };
}
