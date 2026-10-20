import type {
  QuestionDifficulty,
  QuestionType,
  TopicPerformanceStatus,
  MockExamDifficulty,
} from "@/types/database.types";
import { DETERMINISTIC_QUESTION_BANK, SeedQuestionDefinition } from "./questions-bank";
import { getRetentionQuestions } from "./retention-questions";

export interface MockQuestionDefinition {
  id: string;
  topicTitle: string;
  subtopicTitle?: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: QuestionDifficulty;
  questionType: QuestionType;
  marks: number;
}

export interface ClientSafeMockQuestion {
  id: string;
  question_id: string;
  display_order: number;
  topic_title: string;
  prompt: string;
  options: string[];
  question_type: QuestionType;
  difficulty: QuestionDifficulty;
  marks: number;
}

export interface MockTopicEvaluation {
  topicTitle: string;
  questionsTotal: number;
  questionsAttempted: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  marksEarned: number;
  totalMarks: number;
  percentage: number;
  status: TopicPerformanceStatus;
}

export interface MockEvaluationResult {
  score: number;
  totalMarks: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  timeUsedSeconds: number;
  isExpired: boolean;
  topicBreakdown: Record<string, MockTopicEvaluation>;
  strongTopics: string[];
  weakTopics: string[];
  needsPracticeTopics: string[];
  unverifiedTopics: string[];
  evaluatedResponses: Array<{
    questionId: string;
    selectedAnswer: string | null;
    isCorrect: boolean;
    awardedMarks: number;
    correctAnswer: string;
    explanation: string;
  }>;
}

// Additional Deterministic Questions covering DBMS, OS, Compiler Design, and Algorithms
export const EXTENDED_MOCK_QUESTIONS: MockQuestionDefinition[] = [
  // --- DBMS: Normalization ---
  {
    id: "dbms-norm-01",
    topicTitle: "Normalization",
    subtopicTitle: "3NF and BCNF",
    prompt: "A relation R is in Boyce-Codd Normal Form (BCNF) if and only if for every non-trivial functional dependency X -> Y:",
    options: [
      "X is a superkey of R",
      "Y is a prime attribute",
      "X is a subset of Y",
      "Y is a superkey of R",
    ],
    correctAnswer: "X is a superkey of R",
    explanation: "BCNF strictly requires the determinant X to be a superkey for every non-trivial functional dependency X -> Y.",
    difficulty: "MEDIUM",
    questionType: "MCQ",
    marks: 2,
  },
  {
    id: "dbms-norm-02",
    topicTitle: "Normalization",
    subtopicTitle: "Lossless Decomposition",
    prompt: "Which property is guaranteed by a lossless-join decomposition of a relation schema?",
    options: [
      "Natural join of decomposed tables reconstructs the original table without spurious tuples",
      "All functional dependencies are preserved",
      "All tables have identical primary keys",
      "No null values are present in foreign keys",
    ],
    correctAnswer: "Natural join of decomposed tables reconstructs the original table without spurious tuples",
    explanation: "A lossless-join decomposition ensures that the natural join of projections yields exactly the original relation without spurious tuples.",
    difficulty: "EASY",
    questionType: "MCQ",
    marks: 1,
  },
  {
    id: "dbms-norm-03",
    topicTitle: "Normalization",
    subtopicTitle: "2NF Violations",
    prompt: "Second Normal Form (2NF) prohibits which of the following dependencies?",
    options: [
      "Partial dependencies of non-prime attributes on a candidate key",
      "Transitive dependencies among non-prime attributes",
      "Multi-valued dependencies",
      "Join dependencies",
    ],
    correctAnswer: "Partial dependencies of non-prime attributes on a candidate key",
    explanation: "2NF requires 1NF and no non-prime attribute to be functionally dependent on a proper subset of any candidate key.",
    difficulty: "MEDIUM",
    questionType: "MCQ",
    marks: 2,
  },

  // --- DBMS: Transactions ---
  {
    id: "dbms-trans-01",
    topicTitle: "Transactions",
    subtopicTitle: "ACID Properties",
    prompt: "Which ACID property guarantees that intermediate states of concurrent transactions are invisible to each other?",
    options: ["Isolation", "Atomicity", "Consistency", "Durability"],
    correctAnswer: "Isolation",
    explanation: "Isolation ensures concurrent execution of transactions leaves the database in the same state as serial execution, preventing dirty reads.",
    difficulty: "EASY",
    questionType: "MCQ",
    marks: 1,
  },
  {
    id: "dbms-trans-02",
    topicTitle: "Transactions",
    subtopicTitle: "Two-Phase Locking (2PL)",
    prompt: "Rigorous Two-Phase Locking (Strict 2PL with exclusive and shared locks held until commit) guarantees:",
    options: [
      "Conflict serializability and strict schedules (cascade-free)",
      "Freedom from deadlocks",
      "Non-serializable execution",
      "Immediate commit without write-ahead logging",
    ],
    correctAnswer: "Conflict serializability and strict schedules (cascade-free)",
    explanation: "Holding all locks until the end of the transaction ensures conflict serializability and avoids cascading aborts.",
    difficulty: "HARD",
    questionType: "MCQ",
    marks: 3,
  },
  {
    id: "dbms-trans-03",
    topicTitle: "Transactions",
    subtopicTitle: "Conflict Serializability",
    prompt: "A schedule is conflict serializable if its precedence (serialization) graph:",
    options: [
      "Is an acyclic directed graph",
      "Contains at least one cycle",
      "Has equal number of read and write nodes",
      "Contains no abort operations",
    ],
    correctAnswer: "Is an acyclic directed graph",
    explanation: "The absence of cycles in the precedence graph is both necessary and sufficient for conflict serializability.",
    difficulty: "MEDIUM",
    questionType: "MCQ",
    marks: 2,
  },

  // --- DBMS: SQL ---
  {
    id: "dbms-sql-01",
    topicTitle: "SQL",
    subtopicTitle: "Joins and Aggregation",
    prompt: "In standard SQL, which clause is evaluated AFTER the GROUP BY clause to filter groups?",
    options: ["HAVING", "WHERE", "ORDER BY", "DISTINCT"],
    correctAnswer: "HAVING",
    explanation: "The HAVING clause filters aggregated groups generated by GROUP BY, unlike WHERE which filters individual rows before grouping.",
    difficulty: "EASY",
    questionType: "MCQ",
    marks: 1,
  },
  {
    id: "dbms-sql-02",
    topicTitle: "SQL",
    subtopicTitle: "Correlated Subqueries",
    prompt: "What characterizes a correlated subquery in SQL?",
    options: [
      "It references columns from the outer query and executes once for each candidate row",
      "It executes only once and passes a static result table to the outer query",
      "It requires a UNION operator between queries",
      "It cannot contain an ORDER BY clause",
    ],
    correctAnswer: "It references columns from the outer query and executes once for each candidate row",
    explanation: "A correlated subquery references values from the enclosing outer query, making its evaluation dependent on each outer row.",
    difficulty: "MEDIUM",
    questionType: "MCQ",
    marks: 2,
  },

  // --- DBMS: Indexing ---
  {
    id: "dbms-index-01",
    topicTitle: "Indexing",
    subtopicTitle: "B+ Tree Indexes",
    prompt: "In a B+ Tree of order m, what data is stored in the leaf nodes?",
    options: [
      "All search keys along with record pointers/data, linked sequentially",
      "Only internal router keys with no record pointers",
      "Only overflow blocks for collision resolution",
      "The entire database schema metadata",
    ],
    correctAnswer: "All search keys along with record pointers/data, linked sequentially",
    explanation: "In B+ Trees, all actual data records/pointers reside in leaf nodes, linked as a doubly-linked list for efficient range scans.",
    difficulty: "MEDIUM",
    questionType: "MCQ",
    marks: 2,
  },
  {
    id: "dbms-index-02",
    topicTitle: "Indexing",
    subtopicTitle: "Clustered vs Non-Clustered",
    prompt: "How many clustered indexes can exist on a single database table?",
    options: [
      "At most one",
      "Up to 16",
      "Unlimited",
      "Exactly equal to the number of columns",
    ],
    correctAnswer: "At most one",
    explanation: "Because a clustered index dictates the physical storage order of table rows on disk, only one clustered index can exist per table.",
    difficulty: "EASY",
    questionType: "MCQ",
    marks: 1,
  },

  // --- DBMS: ER Model ---
  {
    id: "dbms-er-01",
    topicTitle: "ER Model",
    subtopicTitle: "Weak Entity Sets",
    prompt: "In an Entity-Relationship (ER) model, how is a weak entity set identified?",
    options: [
      "By combining its partial key with the primary key of its identifying owner entity set",
      "By using an arbitrary candidate key of another entity",
      "By assigning a foreign key with cascade delete",
      "Weak entity sets do not have any identifying keys",
    ],
    correctAnswer: "By combining its partial key with the primary key of its identifying owner entity set",
    explanation: "A weak entity set lacks a primary key of its own and depends on the primary key of the owner entity set plus its own discriminator (partial key).",
    difficulty: "MEDIUM",
    questionType: "MCQ",
    marks: 2,
  },

  // --- COMPILER DESIGN: LR Parsing & SLR ---
  {
    id: "cd-lr-01",
    topicTitle: "LR Parsing",
    subtopicTitle: "Item Sets and Lookaheads",
    prompt: "In LR(1) items of the form [A -> alpha . beta, a], what does 'a' represent?",
    options: [
      "The terminal lookahead expected after A is reduced",
      "The starting non-terminal of the grammar",
      "The number of characters read so far",
      "The shift action index in the parsing table",
    ],
    correctAnswer: "The terminal lookahead expected after A is reduced",
    explanation: "In an LR(1) item [A -> alpha . beta, a], 'a' is the lookahead terminal that must follow the reduction of non-terminal A.",
    difficulty: "MEDIUM",
    questionType: "MCQ",
    marks: 2,
  },
  {
    id: "cd-lr-02",
    topicTitle: "SLR Parsing",
    subtopicTitle: "Conflict Resolution",
    prompt: "When does an SLR(1) parser report a Reduce-Reduce conflict in state I?",
    options: [
      "When two distinct reductions have intersecting FOLLOW sets",
      "When an item can both shift and reduce on the same lookahead",
      "When the start symbol has multiple productions",
      "When the grammar is left-recursive",
    ],
    correctAnswer: "When two distinct reductions have intersecting FOLLOW sets",
    explanation: "A reduce-reduce conflict in SLR(1) happens when state I contains two completed productions A -> alpha . and B -> beta . such that FOLLOW(A) intersects FOLLOW(B).",
    difficulty: "HARD",
    questionType: "MCQ",
    marks: 3,
  },
  {
    id: "cd-syntax-01",
    topicTitle: "Syntax Analysis",
    subtopicTitle: "Ambiguity in Grammars",
    prompt: "Which of the following is an undecidable problem in formal language theory?",
    options: [
      "Determining whether an arbitrary Context-Free Grammar is ambiguous",
      "Determining whether a CFG is in Chomsky Normal Form",
      "Determining whether a regular grammar produces the empty string",
      "Computing FIRST and FOLLOW sets for a given CFG",
    ],
    correctAnswer: "Determining whether an arbitrary Context-Free Grammar is ambiguous",
    explanation: "Grammar ambiguity for arbitrary CFGs is proven undecidable by reduction from Post Correspondence Problem (PCP).",
    difficulty: "HARD",
    questionType: "MCQ",
    marks: 3,
  },

  // --- OPERATING SYSTEMS: Synchronization & Memory ---
  {
    id: "os-sync-01",
    topicTitle: "Process Synchronization",
    subtopicTitle: "Peterson's Solution",
    prompt: "Peterson's solution for two-process mutual exclusion relies on which two shared variables?",
    options: [
      "boolean flag[2] and integer turn",
      "counting semaphore and mutex",
      "monitor condition variables",
      "atomic compare-and-swap register only",
    ],
    correctAnswer: "boolean flag[2] and integer turn",
    explanation: "Peterson's algorithm coordinates mutual exclusion between two processes using a 2-element boolean flag array and a turn variable.",
    difficulty: "MEDIUM",
    questionType: "MCQ",
    marks: 2,
  },
  {
    id: "os-mem-01",
    topicTitle: "Memory Management",
    subtopicTitle: "Virtual Memory and Paging",
    prompt: "What is Belady's Anomaly in page replacement algorithms?",
    options: [
      "Allocating more page frames results in an increased number of page faults",
      "LRU page replacement causes thrashing on circular loops",
      "The page table cannot fit in main memory",
      "Translation Lookaside Buffer (TLB) hits decrease with larger cache",
    ],
    correctAnswer: "Allocating more page frames results in an increased number of page faults",
    explanation: "Belady's anomaly occurs in FIFO replacement where granting more frames leads to more page faults for certain reference strings.",
    difficulty: "MEDIUM",
    questionType: "MCQ",
    marks: 2,
  },
];

/**
 * Builds the combined question repository from deterministic seed banks.
 */
export function getMasterMockQuestionPool(): MockQuestionDefinition[] {
  const pool: MockQuestionDefinition[] = [...EXTENDED_MOCK_QUESTIONS];

  // Convert Day 3 questions
  DETERMINISTIC_QUESTION_BANK.forEach((q, idx) => {
    pool.push({
      id: `seed-d3-${idx}`,
      topicTitle: q.topicTitle,
      subtopicTitle: q.subtopicTitle,
      prompt: q.prompt,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      questionType: q.type,
      marks: q.marks,
    });
  });

  // Convert Day 6 retention questions
  const sampleTopics = ["LR Parsing", "SLR Parsing", "Syntax Analysis", "Process Synchronization"];
  sampleTopics.forEach((t) => {
    const qList = getRetentionQuestions(t, "RETENTION_24H");
    qList.forEach((q) => {
      pool.push({
        id: q.id,
        topicTitle: t,
        prompt: q.prompt,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        questionType: "MCQ",
        marks: q.marks,
      });
    });
  });

  return pool;
}

/**
 * Server-side question selector for mock exams.
 * Ensures:
 * 1. Filtered by target subject/topics where applicable.
 * 2. No duplicate questions within one mock exam.
 * 3. Topic coverage balanced across requested topics.
 * 4. Difficulty filtering / balanced distribution.
 * 5. Shuffled display order server-side.
 */
export function selectMockQuestions(params: {
  topicTitles?: string[];
  totalQuestions: number;
  difficulty?: MockExamDifficulty;
  questionType?: QuestionType;
}): MockQuestionDefinition[] {
  const masterPool = getMasterMockQuestionPool();
  const targetCount = Math.max(1, Math.min(params.totalQuestions, 50));

  // 1. Filter candidates by topics if specified
  let candidates = masterPool;
  if (params.topicTitles && params.topicTitles.length > 0) {
    const normalizedTitles = params.topicTitles.map((t) => t.trim().toLowerCase());
    const topicFiltered = masterPool.filter((q) =>
      normalizedTitles.some(
        (nt) =>
          q.topicTitle.trim().toLowerCase() === nt ||
          q.topicTitle.trim().toLowerCase().includes(nt) ||
          nt.includes(q.topicTitle.trim().toLowerCase())
      )
    );
    if (topicFiltered.length >= 3) {
      candidates = topicFiltered;
    }
  }

  // 2. Filter or balance by difficulty
  if (params.difficulty && params.difficulty !== "MIXED") {
    const diffFiltered = candidates.filter((q) => q.difficulty === params.difficulty);
    if (diffFiltered.length >= targetCount) {
      candidates = diffFiltered;
    }
  }

  // 3. Prevent duplicate prompts/questions using unique set
  const seenPrompts = new Set<string>();
  const uniquePool: MockQuestionDefinition[] = [];
  for (const q of candidates) {
    const key = q.prompt.trim().toLowerCase();
    if (!seenPrompts.has(key)) {
      seenPrompts.add(key);
      uniquePool.push(q);
    }
  }

  // 4. Topic-balanced selection
  const topicBuckets = new Map<string, MockQuestionDefinition[]>();
  for (const q of uniquePool) {
    const t = q.topicTitle;
    if (!topicBuckets.has(t)) topicBuckets.set(t, []);
    topicBuckets.get(t)!.push(q);
  }

  const selected: MockQuestionDefinition[] = [];
  const selectedKeys = new Set<string>();

  // Round-robin selection across available topics to ensure balanced distribution
  let addedInRound = true;
  while (selected.length < targetCount && addedInRound) {
    addedInRound = false;
    for (const [topic, qList] of topicBuckets.entries()) {
      if (selected.length >= targetCount) break;
      const nextUnused = qList.find((q) => !selectedKeys.has(q.prompt.trim().toLowerCase()));
      if (nextUnused) {
        selected.push(nextUnused);
        selectedKeys.add(nextUnused.prompt.trim().toLowerCase());
        addedInRound = true;
      }
    }
  }

  // If still below target count, backfill from remaining unique pool
  if (selected.length < targetCount) {
    for (const q of uniquePool) {
      if (selected.length >= targetCount) break;
      const key = q.prompt.trim().toLowerCase();
      if (!selectedKeys.has(key)) {
        selected.push(q);
        selectedKeys.add(key);
      }
    }
  }

  // 5. Server-side deterministic/seeded shuffle
  // We perform an in-place Fisher-Yates shuffle
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }

  return selected;
}

/**
 * Strips correct answers and explanations before sending questions to the client.
 */
export function stripMockAnswerKeys(
  questions: Array<{
    id: string;
    question_id: string;
    display_order: number;
    topic_title: string;
    prompt: string;
    options: string[] | unknown;
    question_type: QuestionType;
    difficulty: QuestionDifficulty;
    marks: number;
  }>
): ClientSafeMockQuestion[] {
  return questions.map((q) => {
    let opts: string[] = [];
    if (Array.isArray(q.options)) {
      opts = q.options as string[];
    } else if (typeof q.options === "string") {
      try {
        opts = JSON.parse(q.options);
      } catch {
        opts = [];
      }
    }

    return {
      id: q.id,
      question_id: q.question_id,
      display_order: q.display_order,
      topic_title: q.topic_title,
      prompt: q.prompt,
      options: opts,
      question_type: q.question_type,
      difficulty: q.difficulty,
      marks: q.marks,
    };
  });
}

/**
 * Server-side evaluation of mock exam responses.
 * Never trusts client score or timer.
 */
export function evaluateMockSubmission(params: {
  questions: Array<{
    id: string;
    question_id: string;
    topic_title: string;
    prompt: string;
    options: string[] | unknown;
    correct_answer: string;
    explanation: string | null;
    marks: number;
  }>;
  responses: Array<{
    question_id: string;
    selected_answer: string | null;
  }>;
  durationSeconds: number;
  startedAt: Date;
  submittedAt: Date;
}): MockEvaluationResult {
  const elapsedSeconds = Math.max(
    0,
    Math.round((params.submittedAt.getTime() - params.startedAt.getTime()) / 1000)
  );

  // 15 second network grace period
  const isExpired = elapsedSeconds > params.durationSeconds + 15;

  const responseMap = new Map<string, string | null>();
  params.responses.forEach((r) => {
    responseMap.set(r.question_id, r.selected_answer);
  });

  let totalMarks = 0;
  let score = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  const topicMap = new Map<
    string,
    {
      questionsTotal: number;
      questionsAttempted: number;
      correctCount: number;
      incorrectCount: number;
      unansweredCount: number;
      marksEarned: number;
      totalMarks: number;
    }
  >();

  const evaluatedResponses: MockEvaluationResult["evaluatedResponses"] = [];

  for (const q of params.questions) {
    totalMarks += q.marks;
    const selectedAnswer = responseMap.get(q.question_id) ?? null;

    if (!topicMap.has(q.topic_title)) {
      topicMap.set(q.topic_title, {
        questionsTotal: 0,
        questionsAttempted: 0,
        correctCount: 0,
        incorrectCount: 0,
        unansweredCount: 0,
        marksEarned: 0,
        totalMarks: 0,
      });
    }

    const tData = topicMap.get(q.topic_title)!;
    tData.questionsTotal += 1;
    tData.totalMarks += q.marks;

    if (selectedAnswer === null || selectedAnswer === undefined || selectedAnswer.trim() === "") {
      unansweredCount += 1;
      tData.unansweredCount += 1;
      evaluatedResponses.push({
        questionId: q.question_id,
        selectedAnswer: null,
        isCorrect: false,
        awardedMarks: 0,
        correctAnswer: q.correct_answer,
        explanation: q.explanation || "No explanation provided.",
      });
      continue;
    }

    tData.questionsAttempted += 1;
    const isCorrect =
      selectedAnswer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();

    if (isCorrect) {
      correctCount += 1;
      score += q.marks;
      tData.correctCount += 1;
      tData.marksEarned += q.marks;
    } else {
      incorrectCount += 1;
      tData.incorrectCount += 1;
    }

    evaluatedResponses.push({
      questionId: q.question_id,
      selectedAnswer,
      isCorrect,
      awardedMarks: isCorrect ? q.marks : 0,
      correctAnswer: q.correct_answer,
      explanation: q.explanation || "No explanation provided.",
    });
  }

  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

  // Build topic breakdown
  const topicBreakdown: Record<string, MockTopicEvaluation> = {};
  const strongTopics: string[] = [];
  const weakTopics: string[] = [];
  const needsPracticeTopics: string[] = [];
  const unverifiedTopics: string[] = [];

  for (const [topicTitle, tData] of topicMap.entries()) {
    const topicPct =
      tData.totalMarks > 0 ? Math.round((tData.marksEarned / tData.totalMarks) * 100) : 0;

    let status: TopicPerformanceStatus;
    if (tData.questionsAttempted < 2) {
      status = "NOT_ENOUGH_EVIDENCE";
      unverifiedTopics.push(topicTitle);
    } else if (topicPct >= 80) {
      status = "STRONG";
      strongTopics.push(topicTitle);
    } else if (topicPct >= 60) {
      status = "NEEDS_PRACTICE";
      needsPracticeTopics.push(topicTitle);
    } else {
      status = "WEAK";
      weakTopics.push(topicTitle);
    }

    topicBreakdown[topicTitle] = {
      topicTitle,
      ...tData,
      percentage: topicPct,
      status,
    };
  }

  return {
    score,
    totalMarks,
    percentage,
    correctCount,
    incorrectCount,
    unansweredCount,
    timeUsedSeconds: elapsedSeconds,
    isExpired,
    topicBreakdown,
    strongTopics,
    weakTopics,
    needsPracticeTopics,
    unverifiedTopics,
    evaluatedResponses,
  };
}
