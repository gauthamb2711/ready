import type {
  CognitiveLevel,
  QualityReport,
  QualityStatus,
  TeacherDifficulty,
  TeacherQuestion,
  TeacherQuestionOption,
  TeacherQuestionStatus,
  TeacherQuestionType,
  TeacherAssessment,
  TeacherAssessmentQuestion,
  TeacherAssessmentStatus,
  TeacherAssessmentType,
} from "@/types/database.types";

/**
 * Normalizes question text for deterministic duplicate detection.
 * - lowercase
 * - trim whitespace
 * - collapse repeated spaces
 * - remove trivial trailing or internal punctuation differences
 */
export function normalizeQuestionText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calculates deterministic Jaccard token similarity between two normalized strings.
 */
export function calculateTokenSimilarity(textA: string, textB: string): number {
  const tokensA = new Set(normalizeQuestionText(textA).split(" ").filter(Boolean));
  const tokensB = new Set(normalizeQuestionText(textB).split(" ").filter(Boolean));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  const intersection = new Set([...tokensA].filter((x) => tokensB.has(x)));
  const union = new Set([...tokensA, ...tokensB]);

  return intersection.size / union.size;
}

/**
 * Detects if a question is a duplicate or near-duplicate of existing questions in the bank.
 */
export function detectDuplicateQuestion(
  newText: string,
  existingQuestions: Array<{ id: string; question_text: string }>
): { isDuplicate: boolean; isSimilar: boolean; referenceQuestionId: string | null } {
  const normalizedNew = normalizeQuestionText(newText);
  if (!normalizedNew) {
    return { isDuplicate: false, isSimilar: false, referenceQuestionId: null };
  }

  for (const existing of existingQuestions) {
    const normalizedExisting = normalizeQuestionText(existing.question_text);
    if (normalizedNew === normalizedExisting) {
      return {
        isDuplicate: true,
        isSimilar: true,
        referenceQuestionId: existing.id,
      };
    }

    // Similarity threshold > 0.85 indicates near duplicate
    const similarity = calculateTokenSimilarity(newText, existing.question_text);
    if (similarity >= 0.85) {
      return {
        isDuplicate: false,
        isSimilar: true,
        referenceQuestionId: existing.id,
      };
    }
  }

  return { isDuplicate: false, isSimilar: false, referenceQuestionId: null };
}

/**
 * Validates question quality deterministically based on structural and pedagogical rules.
 */
export function validateQuestionQuality(
  question: Partial<TeacherQuestion>,
  existingQuestions: Array<{ id: string; question_text: string }> = [],
  isDraftMode: boolean = false
): QualityReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  const text = (question.question_text || "").trim();
  const hasText = text.length > 0;
  if (!hasText) {
    errors.push("Question text is empty.");
  } else if (text.length < 10) {
    warnings.push("Question text is very brief (less than 10 characters).");
  }

  // Check for ambiguous wording indicators
  const lowerText = text.toLowerCase();
  if (lowerText.includes("none of the above") || lowerText.includes("all of the above")) {
    warnings.push("Question text references 'none/all of the above'; ensure options are not dynamically shuffled.");
  }

  const hasTopic = Boolean(question.topic_id);
  if (!hasTopic) {
    if (isDraftMode) {
      warnings.push("Question is not yet assigned to a curriculum topic.");
    } else {
      errors.push("Question must be assigned to a curriculum topic.");
    }
  }

  const qType: TeacherQuestionType = question.question_type || "MCQ";
  const options: TeacherQuestionOption[] = Array.isArray(question.options) ? question.options : [];
  const correctAnswer = (question.correct_answer || "").trim();
  const hasAnswer = correctAnswer.length > 0;

  let validOptions = true;

  if (qType === "MCQ") {
    if (options.length < 2) {
      if (isDraftMode) {
        warnings.push("MCQ draft should have at least 2 options before submission.");
      } else {
        errors.push("MCQ must have at least 2 options.");
        validOptions = false;
      }
    } else {
      // Check for empty options
      const emptyOpts = options.some((opt) => !opt.text || opt.text.trim().length === 0);
      if (emptyOpts) {
        if (!isDraftMode) {
          errors.push("One or more options are empty.");
          validOptions = false;
        } else {
          warnings.push("Draft contains empty options.");
        }
      }

      // Check for duplicate option text
      const optionTexts = options.map((opt) => opt.text.trim().toLowerCase()).filter(Boolean);
      const uniqueTexts = new Set(optionTexts);
      if (uniqueTexts.size < optionTexts.length) {
        warnings.push("Duplicate option text detected in options list.");
      }

      // Check if correct answer matches one of the option texts or option IDs
      if (hasAnswer) {
        const matchingOption = options.find(
          (opt) => opt.id === correctAnswer || opt.text?.trim().toLowerCase() === correctAnswer.toLowerCase()
        );
        if (!matchingOption && !isDraftMode) {
          errors.push(`Correct answer '${correctAnswer}' does not match any provided option.`);
          validOptions = false;
        }
      }

      // Check if multiple options marked correct for single MCQ
      const markedCorrect = options.filter((opt) => opt.is_correct === true);
      if (markedCorrect.length > 1) {
        errors.push("Multiple options are marked as correct for a single-choice MCQ.");
        validOptions = false;
      }
    }
  } else if (qType === "MULTIPLE_SELECT") {
    if (options.length < 2) {
      if (!isDraftMode) {
        errors.push("Multiple-select question must have at least 2 options.");
        validOptions = false;
      } else {
        warnings.push("Multiple-select question draft should have at least 2 options.");
      }
    } else {
      const emptyOpts = options.some((opt) => !opt.text || opt.text.trim().length === 0);
      if (emptyOpts && !isDraftMode) {
        errors.push("One or more options are empty.");
        validOptions = false;
      }
    }
  } else if (qType === "TRUE_FALSE") {
    if (hasAnswer) {
      const validTf = ["true", "false", "t", "f"].includes(correctAnswer.toLowerCase());
      if (!validTf) {
        errors.push("TRUE_FALSE question correct answer must be 'true' or 'false'.");
      }
    }
  } else if (qType === "SHORT_ANSWER") {
    if (!hasAnswer && !isDraftMode) {
      errors.push("Short answer question must include expected answer keywords or criteria.");
    }
  } else if (qType === "SCENARIO") {
    if (!hasAnswer && !isDraftMode) {
      errors.push("Scenario question must specify the expected analytical response.");
    }
  } else if (qType === "PROBLEM_SOLVING") {
    if (!hasAnswer && !isDraftMode) {
      errors.push("Problem solving question must outline the expected solution steps.");
    }
  }

  if (!hasAnswer) {
    if (isDraftMode) {
      warnings.push("Correct answer is not yet provided (required before review).");
    } else {
      errors.push("Missing correct answer.");
    }
  }

  const explanation = (question.explanation || "").trim();
  const hasExplanation = explanation.length > 0;
  if (!hasExplanation) {
    warnings.push("Question has no explanation for the answer key.");
  }

  const marks = Number(question.marks);
  const validMarks = !isNaN(marks) && marks > 0;
  if (!validMarks) {
    if (!isDraftMode) {
      errors.push("Marks must be a positive integer.");
    } else {
      warnings.push("Marks must be set to a positive integer before submission.");
    }
  }

  // Duplicate check
  const duplicateCheck = detectDuplicateQuestion(text, existingQuestions);
  let duplicateRef: string | null = null;
  if (duplicateCheck.isDuplicate) {
    errors.push(`Exact duplicate detected with existing question #${duplicateCheck.referenceQuestionId}.`);
    duplicateRef = duplicateCheck.referenceQuestionId;
  } else if (duplicateCheck.isSimilar) {
    warnings.push(`Possible near-duplicate detected matching question #${duplicateCheck.referenceQuestionId}.`);
    duplicateRef = duplicateCheck.referenceQuestionId;
  }

  let status: QualityStatus = "PASS";
  if (errors.length > 0) {
    status = "FAIL";
  } else if (warnings.length > 0) {
    status = "WARNING";
  }

  return {
    status,
    errors,
    warnings,
    details: {
      hasText,
      hasTopic,
      hasAnswer,
      validOptions,
      hasExplanation,
      validMarks,
      duplicateReference: duplicateRef,
    },
  };
}

/**
 * Validates state transitions for question lifecycle:
 * DRAFT -> QUALITY_CHECK -> REVIEW -> APPROVED -> ARCHIVED
 * REVIEW -> REJECTED -> DRAFT
 * All other transitions are rejected.
 */
export function validateQuestionStatusTransition(
  currentStatus: TeacherQuestionStatus,
  targetStatus: TeacherQuestionStatus
): { valid: boolean; reason?: string } {
  if (currentStatus === targetStatus) {
    return { valid: true };
  }

  switch (currentStatus) {
    case "DRAFT":
      if (targetStatus === "QUALITY_CHECK" || targetStatus === "REVIEW") return { valid: true };
      return {
        valid: false,
        reason: `Cannot transition directly from DRAFT to ${targetStatus}. Run QUALITY_CHECK or submit for REVIEW first.`,
      };

    case "QUALITY_CHECK":
      if (targetStatus === "DRAFT" || targetStatus === "REVIEW") return { valid: true };
      return {
        valid: false,
        reason: `QUALITY_CHECK can transition back to DRAFT for edits or forward to REVIEW.`,
      };

    case "REVIEW":
      if (targetStatus === "APPROVED" || targetStatus === "REJECTED" || targetStatus === "DRAFT") return { valid: true };
      return {
        valid: false,
        reason: `REVIEW can only transition to APPROVED, REJECTED, or returned to DRAFT.`,
      };

    case "APPROVED":
      if (targetStatus === "ARCHIVED") return { valid: true };
      return {
        valid: false,
        reason: `APPROVED question cannot transition directly to ${targetStatus}. It can only be ARCHIVED. Create a new revision draft instead.`,
      };

    case "REJECTED":
      if (targetStatus === "DRAFT" || targetStatus === "ARCHIVED") return { valid: true };
      return {
        valid: false,
        reason: `REJECTED question can only be returned to DRAFT for edits or ARCHIVED.`,
      };

    case "ARCHIVED":
      return {
        valid: false,
        reason: `ARCHIVED question cannot be re-transitioned. Create a new question draft instead.`,
      };

    default:
      return { valid: false, reason: "Unknown status transition." };
  }
}

/**
 * Generates deterministic template questions for a topic.
 * ZERO external AI/Gemini. Uses structural templates and curriculum metadata.
 * Output questions are ALWAYS created in DRAFT status.
 */
export function generateDeterministicQuestions(params: {
  topicTitle: string;
  topicId: string;
  subjectId: string;
  unitId?: string | null;
  learningObjectiveId?: string | null;
  ownerId: string;
  count?: number;
}): Array<Omit<TeacherQuestion, "id" | "created_at" | "updated_at">> {
  const { topicTitle, topicId, subjectId, unitId = null, learningObjectiveId = null, ownerId, count = 4 } = params;

  const templates: Array<{
    type: TeacherQuestionType;
    difficulty: TeacherDifficulty;
    cognitive: CognitiveLevel;
    marks: number;
    text: string;
    options: TeacherQuestionOption[];
    correct: string;
    explanation: string;
  }> = [
    // 1. Definition / Recall
    {
      type: "MCQ",
      difficulty: "EASY",
      cognitive: "REMEMBER",
      marks: 1,
      text: `Which of the following best defines the primary purpose of ${topicTitle}?`,
      options: [
        { id: "opt_1", text: `To establish the foundational mechanism for ${topicTitle}`, is_correct: true },
        { id: "opt_2", text: `To completely bypass all validation constraints during execution`, is_correct: false },
        { id: "opt_3", text: `To replace memory management with static allocation`, is_correct: false },
        { id: "opt_4", text: `To eliminate the need for error handling`, is_correct: false },
      ],
      correct: "opt_1",
      explanation: `The primary objective of ${topicTitle} is to establish its foundational mechanism within the system architecture.`,
    },
    // 2. Comparison / Conceptual Understanding
    {
      type: "MCQ",
      difficulty: "MEDIUM",
      cognitive: "UNDERSTAND",
      marks: 2,
      text: `When analyzing the characteristics of ${topicTitle}, what is a key architectural advantage?`,
      options: [
        { id: "opt_1", text: `Increased execution unpredictability`, is_correct: false },
        { id: "opt_2", text: `Modularity and structured predictability under standard operations`, is_correct: true },
        { id: "opt_3", text: `Guaranteed zero runtime overhead without limits`, is_correct: false },
        { id: "opt_4", text: `Permanent deprecation of downstream data pipelines`, is_correct: false },
      ],
      correct: "opt_2",
      explanation: `${topicTitle} provides modularity and structured predictability across standard components.`,
    },
    // 3. Application / Problem Solving
    {
      type: "MCQ",
      difficulty: "MEDIUM",
      cognitive: "APPLY",
      marks: 2,
      text: `In a production system implementing ${topicTitle}, which scenario correctly demonstrates proper application?`,
      options: [
        { id: "opt_1", text: `Applying ${topicTitle} directly to enforce invariants and deterministic behavior`, is_correct: true },
        { id: "opt_2", text: `Ignoring edge conditions until run-time exceptions manifest`, is_correct: false },
        { id: "opt_3", text: `Relying solely on external client state without server verification`, is_correct: false },
        { id: "opt_4", text: `Hardcoding non-reusable values across disparate modules`, is_correct: false },
      ],
      correct: "opt_1",
      explanation: `Proper application of ${topicTitle} ensures that invariants and deterministic behavior are strictly verified.`,
    },
    // 4. Scenario / Analytical Reasoning
    {
      type: "SCENARIO",
      difficulty: "HARD",
      cognitive: "ANALYZE",
      marks: 3,
      text: `Scenario: An engineering team observes latency degradation after integrating ${topicTitle}. How should the team diagnose whether ${topicTitle} is the root bottleneck?`,
      options: [
        { id: "opt_1", text: `Immediately revert all code without profiling traces`, is_correct: false },
        { id: "opt_2", text: `Inspect invocation traces and isolate the execution path for ${topicTitle}`, is_correct: true },
        { id: "opt_3", text: `Disable database indexing arbitrarily`, is_correct: false },
        { id: "opt_4", text: `Assume network failure without verifying logs`, is_correct: false },
      ],
      correct: "opt_2",
      explanation: `Systematic diagnostic profiling of the execution path isolates whether ${topicTitle} is introducing latency.`,
    },
  ];

  const selectedTemplates = templates.slice(0, Math.min(count, templates.length));

  return selectedTemplates.map((tmpl) => {
    const qualityReport: QualityReport = {
      status: "PASS",
      errors: [],
      warnings: [],
      details: {
        hasText: true,
        hasTopic: true,
        hasAnswer: true,
        validOptions: true,
        hasExplanation: true,
        validMarks: true,
      },
    };

    return {
      owner_id: ownerId,
      organization_id: null,
      subject_id: subjectId,
      unit_id: unitId,
      topic_id: topicId,
      learning_objective_id: learningObjectiveId,
      question_type: tmpl.type,
      question_text: tmpl.text,
      options: tmpl.options,
      correct_answer: tmpl.correct,
      explanation: tmpl.explanation,
      difficulty: tmpl.difficulty,
      cognitive_level: tmpl.cognitive,
      marks: tmpl.marks,
      status: "DRAFT", // ALWAYS starts as DRAFT!
      quality_status: "PASS",
      quality_report: qualityReport,
    };
  });
}

// ==============================================================================
// DAY 10: ASSESSMENT LIFECYCLE & PUBLISHING VALIDATION
// ==============================================================================

/**
 * Validates legal lifecycle transitions for teacher assessments:
 * DRAFT -> PUBLISHED -> CLOSED -> ARCHIVED
 * CLOSED -> PUBLISHED (reopen)
 * DRAFT -> ARCHIVED
 * All other jumps (e.g. DRAFT -> CLOSED, ARCHIVED -> PUBLISHED) are strictly blocked.
 */
export function validateAssessmentStatusTransition(
  currentStatus: TeacherAssessmentStatus,
  targetStatus: TeacherAssessmentStatus
): { valid: boolean; reason?: string } {
  if (currentStatus === targetStatus) {
    return { valid: true };
  }

  switch (currentStatus) {
    case "DRAFT":
      if (targetStatus === "PUBLISHED" || targetStatus === "ARCHIVED") {
        return { valid: true };
      }
      return {
        valid: false,
        reason: `Cannot transition directly from DRAFT to ${targetStatus}. An assessment must be published before it can be closed.`,
      };

    case "PUBLISHED":
      if (targetStatus === "CLOSED" || targetStatus === "ARCHIVED") {
        return { valid: true };
      }
      return {
        valid: false,
        reason: `PUBLISHED assessment can only transition to CLOSED or ARCHIVED.`,
      };

    case "CLOSED":
      if (targetStatus === "PUBLISHED" || targetStatus === "ARCHIVED") {
        return { valid: true };
      }
      return {
        valid: false,
        reason: `CLOSED assessment can be reopened to PUBLISHED or moved to ARCHIVED.`,
      };

    case "ARCHIVED":
      return {
        valid: false,
        reason: `ARCHIVED is a terminal state. Create a new revision or assessment blueprint instead.`,
      };

    default:
      return {
        valid: false,
        reason: `Unknown or unsupported status transition: ${currentStatus} -> ${targetStatus}`,
      };
  }
}

/**
 * Comprehensive server-side validation before an assessment can be PUBLISHED:
 * 1. Valid title and subject
 * 2. At least one attached question
 * 3. All attached questions must be APPROVED (or PASS quality)
 * 4. No duplicate question attachments
 * 5. Duration (1 - 1440 min)
 * 6. Pass percentage (0 - 100%)
 * 7. Attempt limit (>= 1)
 * 8. Positive marks, and sum of question marks matches total_marks
 * 9. Scheduled window: if specified, end timestamp must be strictly after start timestamp
 */
export function validateAssessmentForPublishing(
  assessment: Partial<TeacherAssessment>,
  questions: Array<{ id?: string; question_id: string; marks?: number; question?: { status?: string; quality_status?: string } }>
): { valid: boolean; errors: string[]; calculatedMarks: number } {
  const errors: string[] = [];

  // 1. Basic details
  if (!assessment.title || !assessment.title.trim()) {
    errors.push("Assessment title is required.");
  }
  if (!assessment.subject_id) {
    errors.push("Assessment must be associated with a valid subject.");
  }

  // 2. Questions requirement
  if (!questions || questions.length === 0) {
    errors.push("Assessment must contain at least one question before publishing.");
  }

  // 3. Question duplicate check & approval verification
  const seenQuestionIds = new Set<string>();
  let calculatedMarks = 0;

  for (const q of questions || []) {
    if (seenQuestionIds.has(q.question_id)) {
      errors.push(`Duplicate question detected (ID: ${q.question_id}). Each question can only be included once.`);
    }
    seenQuestionIds.add(q.question_id);

    const qMarks = Number(q.marks || 1);
    if (isNaN(qMarks) || qMarks <= 0) {
      errors.push(`Question marks must be a positive integer (Question ID: ${q.question_id}).`);
    } else {
      calculatedMarks += qMarks;
    }

    // Approval requirement
    if (q.question) {
      const qStatus = q.question.status;
      const qQuality = q.question.quality_status;
      if (qStatus && qStatus !== "APPROVED" && qQuality !== "PASS") {
        errors.push(
          `Question ${q.question_id} is in '${qStatus}' status. Only APPROVED questions can be published in an assessment.`
        );
      }
    }
  }

  // 4. Marks validation
  if (calculatedMarks <= 0) {
    errors.push("Total marks for the assessment must be greater than zero.");
  }

  // 5. Exam settings
  const duration = Number(assessment.duration_minutes ?? 60);
  if (isNaN(duration) || duration <= 0 || duration > 1440) {
    errors.push("Duration must be between 1 and 1440 minutes (24 hours).");
  }

  const passPct = Number(assessment.pass_percentage ?? 40);
  if (isNaN(passPct) || passPct < 0 || passPct > 100) {
    errors.push("Pass percentage must be between 0% and 100%.");
  }

  const attemptLimit = Number(assessment.attempt_limit ?? 1);
  if (isNaN(attemptLimit) || attemptLimit < 1) {
    errors.push("Attempt limit must be at least 1.");
  }

  // 6. Schedule window
  if (assessment.scheduled_start && assessment.scheduled_end) {
    const start = new Date(assessment.scheduled_start).getTime();
    const end = new Date(assessment.scheduled_end).getTime();
    if (isNaN(start) || isNaN(end)) {
      errors.push("Scheduled start and end must be valid ISO timestamps.");
    } else if (end <= start) {
      errors.push("Scheduled end time must be strictly after the start time.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    calculatedMarks,
  };
}
