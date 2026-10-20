export type AccountType =
  | "STUDENT"
  | "CANDIDATE"
  | "PROFESSIONAL"
  | "TEACHER"
  | "COLLEGE_UNIVERSITY"
  | "COMPANY";

export type AccountState =
  | "PENDING"
  | "ACTIVE"
  | "VERIFIED"
  | "REJECTED"
  | "SUSPENDED"
  | "REVOKED";

export type SystemRole =
  | "STUDENT"
  | "CANDIDATE"
  | "PROFESSIONAL"
  | "TEACHER"
  | "INSTRUCTOR"
  | "COLLEGE_ADMIN"
  | "DEPARTMENT_ADMIN"
  | "EXAM_ADMIN"
  | "COMPANY_ADMIN"
  | "RECRUITER"
  | "TRAINING_MANAGER"
  | "ASSESSMENT_MANAGER"
  | "PLATFORM_ADMIN"
  | "SECURITY_ADMIN"
  | "SUPPORT_ADMIN";

export type OrgType =
  | "COLLEGE_UNIVERSITY"
  | "COLLEGE"
  | "UNIVERSITY"
  | "COMPANY"
  | "TRAINING_INSTITUTE"
  | "EXAM_BODY"
  | "OTHER";

export type OrgMemberStatus = "INVITED" | "ACTIVE" | "SUSPENDED" | "REMOVED" | "PENDING" | "INACTIVE";

export type PreparationLevel =
  | "NOT_STARTED"
  | "BASIC"
  | "SOME_PREPARATION"
  | "COMPLETED"
  | "REVISED";

export type ExamTiming =
  | "TOMORROW"
  | "WITHIN_3_DAYS"
  | "WITHIN_1_WEEK"
  | "WITHIN_2_WEEKS"
  | "WITHIN_1_MONTH"
  | "MORE_THAN_1_MONTH";

export type ConfidenceLevel =
  | "VERY_LOW"
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "VERY_HIGH";

export type QuestionType =
  | "MCQ"
  | "SHORT_ANSWER"
  | "PROBLEM_SOLVING"
  | "APPLICATION"
  | "REASONING"
  | "DEBUGGING";

export type QuestionDifficulty = "EASY" | "MEDIUM" | "HARD";

export type CapabilityClassification =
  | "STRONG"
  | "KNOWN"
  | "UNKNOWN"
  | "FORGOTTEN"
  | "MISUNDERSTOOD"
  | "FALSE_CONFIDENCE"
  | "NOT_TESTED";

export type PlanMode =
  | "FOUNDATION"
  | "CATCH_UP"
  | "NORMAL_PREP"
  | "EARLY_PREP"
  | "RESCUE"
  | "OPTIMIZATION";

export type LearningActionType =
  | "UNDERSTAND"
  | "EXPLAIN"
  | "EXAMPLE"
  | "GUIDED_PRACTICE"
  | "INDEPENDENT_PRACTICE"
  | "RECALL"
  | "APPLICATION"
  | "REVIEW";

export type LearningActionStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "SKIPPED";

export type PlanItemPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  account_type: AccountType;
  account_state: AccountState;
  country_code: string;
  locale: string;
  timezone: string;
  avatar_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type OrganizationVerificationStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "REJECTED"
  | "SUSPENDED"
  | "REVOKED";

export type MembershipRequestStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "REMOVED";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: OrgType;
  verified: boolean;
  verification_status?: OrganizationVerificationStatus;
  country_code: string;
  timezone: string;
  settings: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: SystemRole;
  status: OrgMemberStatus;
  department_id?: string | null;
  joined_at: string;
  updated_at: string;
}

export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: SystemRole;
  organization_id: string | null;
  assigned_at: string;
  assigned_by: string | null;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  created_at: string;
}

export interface PrivateNote {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LearningPlan {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  mode: PlanMode;
  mode_reason: string;
  version: number;
  is_active: boolean;
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  daily_study_minutes: number;
  total_estimated_minutes: number;
  exam_date: string | null;
  target_score: string;
  current_capability_score: number;
  target_capability_score: number;
  capability_gap: number;
  days_remaining: number;
  gap_summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LearningPlanDay {
  id: string;
  plan_id: string;
  user_id: string;
  day_number: number;
  scheduled_date: string;
  week_number: number;
  theme: string | null;
  total_allocated_minutes: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
  created_at: string;
  updated_at: string;
}

export interface LearningPlanItem {
  id: string;
  plan_id: string;
  plan_day_id: string;
  user_id: string;
  topic_id: string | null;
  learning_objective_id: string | null;
  action_type: LearningActionType;
  title: string;
  description: string | null;
  estimated_minutes: number;
  priority: PlanItemPriority;
  reason: string;
  capability_state: CapabilityClassification;
  sequence: number;
  status: LearningActionStatus;
  completed_at: string | null;
  actual_minutes_spent: number;
  created_at: string;
  updated_at: string;
}

export type LearningGainCategory =
  | "GAINED"
  | "IMPROVED"
  | "STABLE"
  | "INSUFFICIENT_EVIDENCE";

export type ActionWorkspaceStage =
  | "PRE_VERIFICATION"
  | "LEARNING_ACTIVE"
  | "POST_VERIFICATION"
  | "COMPLETED";

export interface LearningActionSession {
  id: string;
  user_id: string;
  plan_item_id: string;
  action_type: LearningActionType;
  current_stage: ActionWorkspaceStage;
  started_at: string;
  completed_at: string | null;
  actual_minutes_spent: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LearningVerificationAssessment {
  id: string;
  user_id: string;
  plan_item_id: string;
  topic_id: string | null;
  learning_objective_id: string | null;
  type: "PRE_LEARNING" | "POST_LEARNING";
  total_questions: number;
  correct_count: number;
  score_percentage: number;
  completed_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface LearningVerificationResponse {
  id: string;
  assessment_id: string;
  user_id: string;
  question_id: string;
  question_prompt: string;
  student_answer: string | null;
  correct_answer: string | null;
  is_correct: boolean;
  marks: number;
  time_spent_seconds: number;
  created_at: string;
}

export interface LearningGainRecord {
  id: string;
  user_id: string;
  plan_item_id: string;
  topic_id: string | null;
  learning_objective_id: string | null;
  pre_score: number;
  post_score: number;
  gain_points: number;
  pre_questions: number;
  post_questions: number;
  category: LearningGainCategory;
  category_reason: string;
  previous_capability_state: CapabilityClassification | null;
  new_capability_state: CapabilityClassification | null;
  measurement_method: string;
  measured_at: string;
  created_at: string;
}

export interface StudentProgress {
  id: string;
  user_id: string;
  subject_id: string;
  total_actions_scheduled: number;
  total_actions_completed: number;
  total_study_minutes_spent: number;
  average_learning_gain: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export type RetentionStage = "RETENTION_24H" | "RETENTION_7D" | "RETENTION_30D";

export type RetentionCheckStatus =
  | "SCHEDULED"
  | "AVAILABLE"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "SKIPPED"
  | "EXPIRED";

export type RetentionStatus =
  | "RETAINED"
  | "STABLE"
  | "DECLINING"
  | "NEEDS_REVIEW"
  | "INSUFFICIENT_EVIDENCE";

export interface RetentionCheck {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id: string | null;
  learning_objective_id: string | null;
  learning_item_id: string | null;
  learning_gain_record_id: string | null;
  retention_stage: RetentionStage;
  scheduled_at: string;
  available_at: string;
  started_at: string | null;
  completed_at: string | null;
  status: RetentionCheckStatus;
  score: number | null;
  question_count: number;
  correct_count: number;
  retention_percentage: number | null;
  baseline_score: number;
  performance_delta: number | null;
  retention_status: RetentionStatus | null;
  revision_item_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RetentionResponse {
  id: string;
  retention_check_id: string;
  user_id: string;
  question_id: string;
  question_prompt: string;
  student_answer: string | null;
  correct_answer: string | null;
  is_correct: boolean;
  marks: number;
  time_spent_seconds: number;
  created_at: string;
}

export type ReadinessStatus =
  | "NOT_READY"
  | "NEEDS_WORK"
  | "DEVELOPING"
  | "READY"
  | "HIGHLY_READY";

export type ReadinessComponentType =
  | "MASTERY"
  | "LEARNING_GAIN"
  | "RETENTION"
  | "COVERAGE"
  | "MOCK_PERFORMANCE"
  | "TIME_READINESS";

export type ReadinessEvidenceStatus = "SUFFICIENT" | "LIMITED" | "INSUFFICIENT";

export interface ReadinessAssessment {
  id: string;
  user_id: string;
  subject_id: string;
  score: number;
  status: ReadinessStatus;
  calculated_at: string;
  evidence_version: string;
  exam_date: string | null;
  days_remaining: number | null;
  current_capability: number;
  target_capability: number;
  capability_gap: number;
  summary: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ReadinessComponent {
  id: string;
  readiness_assessment_id: string;
  user_id: string;
  component_type: ReadinessComponentType;
  score: number | null;
  weight: number;
  effective_weight: number;
  evidence_status: ReadinessEvidenceStatus;
  explanation: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type MockExamDifficulty = "EASY" | "MEDIUM" | "HARD" | "MIXED";

export type MockExamStatus =
  | "DRAFT"
  | "READY"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "EXPIRED"
  | "CANCELLED";

export type MockAttemptStatus =
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "EXPIRED"
  | "CANCELLED";

export type TopicPerformanceStatus =
  | "STRONG"
  | "NEEDS_PRACTICE"
  | "WEAK"
  | "NOT_ENOUGH_EVIDENCE"
  | "CRITICAL_WEAK"
  | "NOT_YET_VERIFIED";

export interface MockExam {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  total_questions: number;
  total_marks: number;
  duration_seconds: number;
  difficulty: MockExamDifficulty;
  status: MockExamStatus;
  started_at: string | null;
  submitted_at: string | null;
  config: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MockExamQuestion {
  id: string;
  mock_exam_id: string;
  question_id: string;
  topic_id: string | null;
  topic_title: string;
  prompt: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
  question_type: QuestionType;
  difficulty: QuestionDifficulty;
  display_order: number;
  marks: number;
  created_at: string;
}

export interface MockExamAttempt {
  id: string;
  mock_exam_id: string;
  user_id: string;
  started_at: string;
  submitted_at: string | null;
  score: number;
  percentage: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  time_used_seconds: number;
  status: MockAttemptStatus;
  topic_performance: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MockExamResponse {
  id: string;
  attempt_id: string;
  user_id: string;
  question_id: string;
  selected_answer: string | null;
  awarded_marks: number;
  is_correct: boolean;
  answered_at: string;
  created_at: string;
  updated_at: string;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  target_ecosystem: AccountType;
  status: AccountState;
  organization_name: string | null;
  work_email: string | null;
  notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface CandidateProfile {
  id: string;
  user_id: string;
  headline: string | null;
  summary: string | null;
  skills: Array<{ name: string; level: number; verified: boolean }>;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  organization_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface SecurityEvent {
  id: string;
  user_id: string | null;
  event_type: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  details: Record<string, unknown>;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  type: string;
  created_at: string;
}

export interface StudentSubject {
  id: string;
  user_id: string;
  name: string;
  code: string | null;
  description: string | null;
  exam_date: string | null;
  target_score: string;
  available_daily_study_time: string;
  current_prep_level: PreparationLevel;
  current_capability_score: number;
  target_capability_score: number;
  capability_gap: number;
  created_at: string;
  updated_at: string;
}

export interface StudentUnit {
  id: string;
  subject_id: string;
  user_id: string;
  title: string;
  sequence: number;
  created_at: string;
}

export interface CurriculumTopic {
  id: string;
  unit_id: string;
  subject_id: string;
  user_id: string;
  title: string;
  sequence: number;
  importance: "CORE" | "FOUNDATIONAL" | "ADVANCED";
  created_at: string;
}

export interface CurriculumSubtopic {
  id: string;
  topic_id: string;
  user_id: string;
  title: string;
  sequence: number;
  created_at: string;
}

export interface LearningObjective {
  id: string;
  subtopic_id: string;
  user_id: string;
  description: string;
  created_at: string;
}

export interface DiagnosticAssessment {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  intake_data: {
    exam_timing?: ExamTiming;
    target_score?: string;
    current_prep?: PreparationLevel;
    daily_study_time?: string;
    confidence_level?: ConfidenceLevel;
  };
  started_at: string | null;
  completed_at: string | null;
  total_questions: number;
  correct_count: number;
  score_percentage: number;
  current_capability_score: number;
  target_capability_score: number;
  capability_gap: number;
  summary: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DiagnosticQuestion {
  id: string;
  subject_id: string | null;
  unit_id: string | null;
  topic_id: string | null;
  subtopic_id: string | null;
  learning_objective_id: string | null;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  prompt: string;
  options: string[] | Array<{ id: string; text: string }>;
  correct_answer?: string; // Hidden on client for unsubmitted tests
  explanation: string | null;
  marks: number;
  created_at: string;
}

export interface DiagnosticResponse {
  id: string;
  diagnostic_id: string;
  user_id: string;
  question_id: string;
  student_answer: string | null;
  is_correct: boolean | null;
  score: number;
  time_spent_seconds: number;
  created_at: string;
}

export interface TopicCapabilityState {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id: string;
  classification: CapabilityClassification;
  current_capability_score: number;
  target_capability_score: number;
  capability_gap: number;
  confidence_reported: ConfidenceLevel | null;
  diagnostic_score: number;
  evidence_count: number;
  updated_at: string;
}

// ==============================================================================
// DAY 8: TEACHER ECOSYSTEM TYPES
// ==============================================================================

export type TeacherQuestionStatus =
  | "DRAFT"
  | "QUALITY_CHECK"
  | "REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "ARCHIVED";

export type TeacherQuestionType =
  | "MCQ"
  | "MULTIPLE_SELECT"
  | "TRUE_FALSE"
  | "SHORT_ANSWER"
  | "SCENARIO"
  | "PROBLEM_SOLVING";

export type TeacherDifficulty = "EASY" | "MEDIUM" | "HARD";

export type CognitiveLevel =
  | "REMEMBER"
  | "UNDERSTAND"
  | "APPLY"
  | "ANALYZE"
  | "EVALUATE";

export type QualityStatus = "PASS" | "WARNING" | "FAIL";

export interface QualityReport {
  status: QualityStatus;
  errors: string[];
  warnings: string[];
  details: {
    hasText: boolean;
    hasTopic: boolean;
    hasAnswer: boolean;
    validOptions?: boolean;
    hasExplanation: boolean;
    validMarks: boolean;
    duplicateReference?: string | null;
  };
}

export interface TeacherSubject {
  id: string;
  owner_id: string;
  organization_id?: string | null;
  name: string;
  code: string | null;
  description: string | null;
  education_level: string | null;
  academic_year: string | null;
  status: "ACTIVE" | "ARCHIVED";
  created_at: string;
  updated_at: string;
}

export interface TeacherCurriculumUnit {
  id: string;
  subject_id: string;
  owner_id: string;
  title: string;
  sequence: number;
  created_at: string;
  updated_at: string;
}

export interface TeacherCurriculumTopic {
  id: string;
  unit_id: string;
  subject_id: string;
  owner_id: string;
  title: string;
  sequence: number;
  importance: "CORE" | "IMPORTANT" | "SUPPLEMENTARY" | "HIGH" | "MEDIUM" | "LOW";
  created_at: string;
  updated_at: string;
}

export interface TeacherCurriculumSubtopic {
  id: string;
  topic_id: string;
  owner_id: string;
  title: string;
  sequence: number;
  created_at: string;
  updated_at: string;
}

export interface TeacherLearningObjective {
  id: string;
  subtopic_id: string;
  owner_id: string;
  description: string;
  sequence: number;
  created_at: string;
  updated_at: string;
}

export interface TeacherQuestionOption {
  id: string;
  text: string;
  is_correct?: boolean;
}

export interface TeacherQuestion {
  id: string;
  owner_id: string;
  organization_id: string | null;
  subject_id: string;
  unit_id: string | null;
  topic_id: string | null;
  subtopic?: string | null;
  subtopic_id?: string | null;
  learning_objective_id: string | null;
  question_type: TeacherQuestionType;
  question_text: string;
  options: TeacherQuestionOption[];
  correct_answer: string | null;
  explanation: string | null;
  difficulty: TeacherDifficulty;
  cognitive_level: CognitiveLevel;
  marks: number;
  tags?: string[];
  estimated_time?: number;
  rejection_reason?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  status: TeacherQuestionStatus;
  quality_status: QualityStatus;
  quality_report: QualityReport;
  created_at: string;
  updated_at: string;
}

export type TeacherAssessmentStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
export type TeacherAssessmentType = "EXAM" | "QUIZ" | "ASSIGNMENT" | "DIAGNOSTIC" | "MOCK";

export interface TeacherAssessment {
  id: string;
  owner_id: string;
  organization_id?: string | null;
  subject_id: string;
  title: string;
  description: string | null;
  instructions?: string | null;
  assessment_type: TeacherAssessmentType;
  status: TeacherAssessmentStatus;
  duration_minutes: number;
  total_marks: number;
  pass_percentage: number;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  attempt_limit: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  created_at: string;
  updated_at: string;
  subject?: TeacherSubject;
  question_count?: number;
  questions?: TeacherAssessmentQuestion[];
}

export interface TeacherAssessmentQuestion {
  id: string;
  assessment_id: string;
  question_id: string;
  display_order: number;
  marks: number;
  is_mandatory?: boolean;
  section_name?: string | null;
  created_at: string;
  question?: TeacherQuestion;
}

// ==============================================================================
// DAY 8.5: ORGANIZATION & MULTI-TENANT VERIFICATION TYPES
// ==============================================================================

export interface OrganizationVerification {
  id: string;
  organization_id: string;
  submitted_by: string;
  official_email: string;
  website_url: string | null;
  document_urls: string[];
  status: OrganizationVerificationStatus;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  submitted_at: string;
  updated_at: string;
  organization?: Organization;
}

export interface OrganizationDepartment {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMembershipRequest {
  id: string;
  organization_id: string;
  user_id: string;
  department_id: string | null;
  role: SystemRole;
  status: MembershipRequestStatus;
  institutional_id: string | null;
  work_email: string;
  notes: string | null;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  updated_at: string;
  organization?: Organization;
  department?: OrganizationDepartment | null;
  profile?: Profile;
}

export interface PlatformGlobalAnalytics {
  totalUsers: number;
  activeUsers: number;
  totalOrganizations: number;
  verifiedOrganizations: number;
  pendingOrganizations: number;
  activeColleges: number;
  activeCompanies: number;
  totalTeachers: number;
  totalStudents: number;
  totalAssessments: number;
  totalQuestions: number;
  totalMockExams: number;
  verifiedTeachers?: number;
  independentTeachers?: number;
  collegeTeachers?: number;
  accountStates?: {
    ACTIVE: number;
    PENDING: number;
    SUSPENDED: number;
  };
  generatedAt?: string;
}

export interface OrganizationAnalytics {
  organizationId: string;
  organizationName?: string;
  totalFaculty?: number;
  totalDepartments?: number;
  totalSubjects?: number;
  totalQuestions?: number;
  totalAssessments?: number;
  pendingFacultyRequests?: number;
  facultyCount?: number;
  studentCount?: number;
  departmentsCount?: number;
  subjectsCount?: number;
  assessmentsCount?: number;
  questionBankSize?: number;
  generatedAt?: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; email: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      organizations: {
        Row: Organization;
        Insert: Partial<Organization> & { name: string; slug: string };
        Update: Partial<Organization>;
        Relationships: [];
      };
      organization_members: {
        Row: OrganizationMember;
        Insert: Partial<OrganizationMember> & { organization_id: string; user_id: string };
        Update: Partial<OrganizationMember>;
        Relationships: [];
      };
      user_roles: {
        Row: UserRoleRecord;
        Insert: Partial<UserRoleRecord> & { user_id: string; role: SystemRole };
        Update: Partial<UserRoleRecord>;
        Relationships: [];
      };
      permissions: {
        Row: Permission;
        Insert: Permission;
        Update: Partial<Permission>;
        Relationships: [];
      };
      private_notes: {
        Row: PrivateNote;
        Insert: Partial<PrivateNote> & { user_id: string; content: string };
        Update: Partial<PrivateNote>;
        Relationships: [];
      };
      learning_plans: {
        Row: LearningPlan;
        Insert: Partial<LearningPlan> & { user_id: string; title: string };
        Update: Partial<LearningPlan>;
        Relationships: [];
      };
      verification_requests: {
        Row: VerificationRequest;
        Insert: Partial<VerificationRequest> & { user_id: string; target_ecosystem: AccountType };
        Update: Partial<VerificationRequest>;
        Relationships: [];
      };
      candidate_profiles: {
        Row: CandidateProfile;
        Insert: Partial<CandidateProfile> & { user_id: string };
        Update: Partial<CandidateProfile>;
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Partial<AuditLog> & { action: string; entity_type: string };
        Update: Partial<AuditLog>;
        Relationships: [];
      };
      security_events: {
        Row: SecurityEvent;
        Insert: Partial<SecurityEvent> & { event_type: string };
        Update: Partial<SecurityEvent>;
        Relationships: [];
      };
      notifications: {
        Row: NotificationItem;
        Insert: Partial<NotificationItem> & { user_id: string; title: string; message: string };
        Update: Partial<NotificationItem>;
        Relationships: [];
      };
      student_subjects: {
        Row: StudentSubject;
        Insert: Partial<StudentSubject> & { user_id: string; name: string };
        Update: Partial<StudentSubject>;
        Relationships: [];
      };
      student_units: {
        Row: StudentUnit;
        Insert: Partial<StudentUnit> & { subject_id: string; user_id: string; title: string };
        Update: Partial<StudentUnit>;
        Relationships: [];
      };
      curriculum_topics: {
        Row: CurriculumTopic;
        Insert: Partial<CurriculumTopic> & { unit_id: string; subject_id: string; user_id: string; title: string };
        Update: Partial<CurriculumTopic>;
        Relationships: [];
      };
      curriculum_subtopics: {
        Row: CurriculumSubtopic;
        Insert: Partial<CurriculumSubtopic> & { topic_id: string; user_id: string; title: string };
        Update: Partial<CurriculumSubtopic>;
        Relationships: [];
      };
      learning_objectives: {
        Row: LearningObjective;
        Insert: Partial<LearningObjective> & { subtopic_id: string; user_id: string; description: string };
        Update: Partial<LearningObjective>;
        Relationships: [];
      };
      diagnostic_assessments: {
        Row: DiagnosticAssessment;
        Insert: Partial<DiagnosticAssessment> & { user_id: string; subject_id: string; title: string };
        Update: Partial<DiagnosticAssessment>;
        Relationships: [];
      };
      diagnostic_questions: {
        Row: DiagnosticQuestion;
        Insert: Partial<DiagnosticQuestion> & { prompt: string; correct_answer: string };
        Update: Partial<DiagnosticQuestion>;
        Relationships: [];
      };
      diagnostic_responses: {
        Row: DiagnosticResponse;
        Insert: Partial<DiagnosticResponse> & { diagnostic_id: string; user_id: string; question_id: string };
        Update: Partial<DiagnosticResponse>;
        Relationships: [];
      };
      topic_capability_states: {
        Row: TopicCapabilityState;
        Insert: Partial<TopicCapabilityState> & { user_id: string; subject_id: string; topic_id: string };
        Update: Partial<TopicCapabilityState>;
        Relationships: [];
      };
      learning_action_sessions: {
        Row: LearningActionSession;
        Insert: Partial<LearningActionSession> & { user_id: string; plan_item_id: string; action_type: LearningActionType };
        Update: Partial<LearningActionSession>;
        Relationships: [];
      };
      learning_verification_assessments: {
        Row: LearningVerificationAssessment;
        Insert: Partial<LearningVerificationAssessment> & { user_id: string; plan_item_id: string; type: "PRE_LEARNING" | "POST_LEARNING" };
        Update: Partial<LearningVerificationAssessment>;
        Relationships: [];
      };
      learning_verification_responses: {
        Row: LearningVerificationResponse;
        Insert: Partial<LearningVerificationResponse> & { assessment_id: string; user_id: string; question_id: string; question_prompt: string };
        Update: Partial<LearningVerificationResponse>;
        Relationships: [];
      };
      learning_gain_records: {
        Row: LearningGainRecord;
        Insert: Partial<LearningGainRecord> & { user_id: string; plan_item_id: string; pre_score: number; post_score: number; gain_points: number; category: LearningGainCategory; category_reason: string };
        Update: Partial<LearningGainRecord>;
        Relationships: [];
      };
      student_progress: {
        Row: StudentProgress;
        Insert: Partial<StudentProgress> & { user_id: string; subject_id: string };
        Update: Partial<StudentProgress>;
        Relationships: [];
      };
      retention_checks: {
        Row: RetentionCheck;
        Insert: Partial<RetentionCheck> & {
          user_id: string;
          subject_id: string;
          retention_stage: RetentionStage;
          scheduled_at: string;
          available_at: string;
          baseline_score: number;
        };
        Update: Partial<RetentionCheck>;
        Relationships: [];
      };
      retention_responses: {
        Row: RetentionResponse;
        Insert: Partial<RetentionResponse> & {
          retention_check_id: string;
          user_id: string;
          question_id: string;
          question_prompt: string;
        };
        Update: Partial<RetentionResponse>;
        Relationships: [];
      };
      readiness_assessments: {
        Row: ReadinessAssessment;
        Insert: Partial<ReadinessAssessment> & {
          user_id: string;
          subject_id: string;
          score: number;
          status: ReadinessStatus;
        };
        Update: Partial<ReadinessAssessment>;
        Relationships: [];
      };
      readiness_components: {
        Row: ReadinessComponent;
        Insert: Partial<ReadinessComponent> & {
          readiness_assessment_id: string;
          user_id: string;
          component_type: ReadinessComponentType;
          weight: number;
          effective_weight: number;
          evidence_status: ReadinessEvidenceStatus;
          explanation: string;
        };
        Update: Partial<ReadinessComponent>;
        Relationships: [];
      };
      mock_exams: {
        Row: MockExam;
        Insert: Partial<MockExam> & {
          user_id: string;
          subject_id: string;
          title: string;
        };
        Update: Partial<MockExam>;
        Relationships: [];
      };
      mock_exam_questions: {
        Row: MockExamQuestion;
        Insert: Partial<MockExamQuestion> & {
          mock_exam_id: string;
          question_id: string;
          topic_title: string;
          prompt: string;
          correct_answer: string;
        };
        Update: Partial<MockExamQuestion>;
        Relationships: [];
      };
      mock_exam_attempts: {
        Row: MockExamAttempt;
        Insert: Partial<MockExamAttempt> & {
          mock_exam_id: string;
          user_id: string;
        };
        Update: Partial<MockExamAttempt>;
        Relationships: [];
      };
      mock_exam_responses: {
        Row: MockExamResponse;
        Insert: Partial<MockExamResponse> & {
          attempt_id: string;
          user_id: string;
          question_id: string;
        };
        Update: Partial<MockExamResponse>;
        Relationships: [];
      };
      teacher_subjects: {
        Row: TeacherSubject;
        Insert: Partial<TeacherSubject> & {
          owner_id: string;
          name: string;
        };
        Update: Partial<TeacherSubject>;
        Relationships: [];
      };
      teacher_curriculum_units: {
        Row: TeacherCurriculumUnit;
        Insert: Partial<TeacherCurriculumUnit> & {
          subject_id: string;
          owner_id: string;
          title: string;
        };
        Update: Partial<TeacherCurriculumUnit>;
        Relationships: [];
      };
      teacher_curriculum_topics: {
        Row: TeacherCurriculumTopic;
        Insert: Partial<TeacherCurriculumTopic> & {
          unit_id: string;
          subject_id: string;
          owner_id: string;
          title: string;
        };
        Update: Partial<TeacherCurriculumTopic>;
        Relationships: [];
      };
      teacher_curriculum_subtopics: {
        Row: TeacherCurriculumSubtopic;
        Insert: Partial<TeacherCurriculumSubtopic> & {
          topic_id: string;
          owner_id: string;
          title: string;
        };
        Update: Partial<TeacherCurriculumSubtopic>;
        Relationships: [];
      };
      teacher_learning_objectives: {
        Row: TeacherLearningObjective;
        Insert: Partial<TeacherLearningObjective> & {
          subtopic_id: string;
          owner_id: string;
          description: string;
        };
        Update: Partial<TeacherLearningObjective>;
        Relationships: [];
      };
      teacher_questions: {
        Row: TeacherQuestion;
        Insert: Partial<TeacherQuestion> & {
          owner_id: string;
          subject_id: string;
          topic_id: string;
          question_text: string;
          correct_answer: string;
        };
        Update: Partial<TeacherQuestion>;
        Relationships: [];
      };
      teacher_assessments: {
        Row: TeacherAssessment;
        Insert: Partial<TeacherAssessment> & {
          owner_id: string;
          subject_id: string;
          title: string;
        };
        Update: Partial<TeacherAssessment>;
        Relationships: [];
      };
      teacher_assessment_questions: {
        Row: TeacherAssessmentQuestion;
        Insert: Partial<TeacherAssessmentQuestion> & {
          assessment_id: string;
          question_id: string;
        };
        Update: Partial<TeacherAssessmentQuestion>;
        Relationships: [];
      };
      organization_verifications: {
        Row: OrganizationVerification;
        Insert: Partial<OrganizationVerification> & {
          organization_id: string;
          status: OrganizationVerificationStatus;
        };
        Update: Partial<OrganizationVerification>;
        Relationships: [];
      };
      organization_departments: {
        Row: OrganizationDepartment;
        Insert: Partial<OrganizationDepartment> & {
          organization_id: string;
          name: string;
        };
        Update: Partial<OrganizationDepartment>;
        Relationships: [];
      };
      organization_membership_requests: {
        Row: OrganizationMembershipRequest;
        Insert: Partial<OrganizationMembershipRequest> & {
          organization_id: string;
          user_id: string;
        };
        Update: Partial<OrganizationMembershipRequest>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      account_type: AccountType;
      account_state: AccountState;
      system_role: SystemRole;
      org_type: OrgType;
      org_member_status: OrgMemberStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
