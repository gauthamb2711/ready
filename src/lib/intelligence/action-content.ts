import type {
  CapabilityClassification,
  LearningActionType,
  QuestionDifficulty,
} from "@/types/database.types";

export interface UnderstandContent {
  learningObjective: string;
  whatYouNeedToUnderstand: string;
  keyConcepts: string[];
  simpleExplanation: string;
  example: string;
  workedExample: {
    problem: string;
    steps: Array<{ stepNumber: number; title: string; explanation: string }>;
    conclusion: string;
  };
  commonMistakes: Array<{ mistake: string; correction: string }>;
  quickCheck: Array<{
    id: string;
    prompt: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }>;
}

export interface GuidedPracticeQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  hints: string[];
  stepByStepSolution: string[];
  explanation: string;
  marks: number;
}

export interface RecallActivity {
  id: string;
  type: "KEY_TERM" | "DEFINITION_MATCH" | "STEP_ORDERING";
  prompt: string;
  options?: string[]; // for selection or ordering
  correctAnswer: string;
  explanation: string;
}

export interface VerificationQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  difficulty: QuestionDifficulty;
  explanation: string;
  marks: number;
}

export interface ClientSafeQuestion {
  id: string;
  prompt: string;
  options: string[];
  difficulty?: QuestionDifficulty;
  marks?: number;
}

/**
 * Strips correct answers and evaluation keys before delivering question sets to the client.
 */
export function stripAnswerKeys<T extends { id: string; prompt: string; options: string[] }>(
  questions: T[]
): ClientSafeQuestion[] {
  return questions.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    options: [...q.options],
    difficulty: (q as any).difficulty,
    marks: (q as any).marks,
  }));
}

/**
 * Provides deterministic structured content for the UNDERSTAND action.
 */
export function getUnderstandContent(
  topicTitle: string,
  objectiveDescription?: string | null
): UnderstandContent {
  const cleanTitle = topicTitle.trim();
  const obj = objectiveDescription || `Understand core principles and operational mechanisms of ${cleanTitle}.`;

  if (cleanTitle.toLowerCase().includes("lr parsing") || cleanTitle.toLowerCase().includes("parsing")) {
    return {
      learningObjective: obj,
      whatYouNeedToUnderstand:
        "LR parsing is a bottom-up parsing technique that reads input Left-to-right and constructs a Rightmost derivation in reverse. It avoids backtracking using deterministic state transition tables.",
      keyConcepts: [
        "Shift action pushes the current terminal token onto the state stack.",
        "Reduce action replaces handles (a RHS production match) with its non-terminal LHS.",
        "LR(1) items include lookahead sets to resolve ambiguities before shifting or reducing.",
        "Conflicts arise when a state simultaneously qualifies for both shift and reduce (S/R) or multiple reduces (R/R).",
      ],
      simpleExplanation:
        "Think of LR parsing like assembling a jigsaw puzzle from left to right: you hold pieces on a tray (the stack) until a cluster forms a recognized picture component (the handle), then group them into a larger sub-assembly (reduction).",
      example:
        "Given expression E -> E + T | T. When looking at token '+', if E has been recognized, the parser shifts '+' onto the stack rather than immediately reducing, because '+' has further right-hand binding.",
      workedExample: {
        problem: "Determine if grammar S -> a S b | ab can be parsed by an SLR(1) table without conflict.",
        steps: [
          {
            stepNumber: 1,
            title: "Compute Canonical LR(0) Collection",
            explanation:
              "Generate state I0 with S' -> .S. Closure adds S -> .a S b and S -> .ab. On transition 'a', state I1 receives S -> a .S b and S -> a .b.",
          },
          {
            stepNumber: 2,
            title: "Compute FOLLOW Sets",
            explanation:
              "FOLLOW(S) = { $, b }. SLR(1) restricts reduction actions for S -> ab to columns in FOLLOW(S).",
          },
          {
            stepNumber: 3,
            title: "Check Action Table Columns",
            explanation:
              "In state with completed item S -> ab., reductions occur under column 'b' and '$'. Shift actions occur only on terminal 'b' in S -> a S .b. Because shift and reduce target distinct lookaheads, no conflict exists.",
          },
        ],
        conclusion: "The grammar is successfully accepted in SLR(1) with zero shift-reduce conflicts.",
      },
      commonMistakes: [
        {
          mistake: "Assuming LR(0) items always require lookahead during closure.",
          correction: "LR(0) items only store the dot position; lookaheads are only introduced in LR(1) and LALR(1).",
        },
        {
          mistake: "Placing reductions in all columns in SLR(1).",
          correction: "Reductions in SLR(1) are placed ONLY in columns belonging to FOLLOW(LHS).",
        },
      ],
      quickCheck: [
        {
          id: "qc_1",
          prompt: "In bottom-up parsing, what does the 'handle' represent?",
          options: [
            "A substring matching the RHS of a production whose reduction represents one step in reverse rightmost derivation",
            "The first token in the input stream",
            "The error recovery token",
            "The root non-terminal of the parse tree",
          ],
          correctAnswer:
            "A substring matching the RHS of a production whose reduction represents one step in reverse rightmost derivation",
          explanation: "The handle is the specific RHS substring that is reduced at each bottom-up step.",
        },
        {
          id: "qc_2",
          prompt: "What causes a Reduce-Reduce conflict in an LR parsing table?",
          options: [
            "A single state contains two distinct completed productions that share a lookahead symbol",
            "The grammar contains left recursion",
            "The stack overflows available memory",
            "A terminal symbol matches the end-of-file token",
          ],
          correctAnswer:
            "A single state contains two distinct completed productions that share a lookahead symbol",
          explanation: "If two productions A -> alpha. and B -> beta. compete for the same lookahead, the parser cannot decide which non-terminal to reduce to.",
        },
      ],
    };
  }

  // Generic deterministic fallback for any topic
  return {
    learningObjective: obj,
    whatYouNeedToUnderstand: `Mastering ${cleanTitle} requires understanding its foundational definitions, structural constraints, and systematic step-by-step algorithms.`,
    keyConcepts: [
      `Core structural properties and invariants of ${cleanTitle}.`,
      "Common edge conditions and boundary constraint handling.",
      "Algorithmic efficiency, time complexity, and memory considerations.",
      "Pattern recognition for applying this concept to complex problem variations.",
    ],
    simpleExplanation: `At its core, ${cleanTitle} organizes information systematically so that operations can execute with deterministic predictability and minimal overhead.`,
    example: `Applying ${cleanTitle} in practice allows complex operations to decompose into clean, verifiable sub-steps.`,
    workedExample: {
      problem: `Apply the principles of ${cleanTitle} to solve an initial baseline scenario.`,
      steps: [
        {
          stepNumber: 1,
          title: "Identify Invariants",
          explanation: "Analyze the input specifications and establish the operational constraints.",
        },
        {
          stepNumber: 2,
          title: "Execute Core Transformation",
          explanation: "Apply the standard deterministic algorithm step-by-step without skipping edge cases.",
        },
        {
          stepNumber: 3,
          title: "Verify Outcome",
          explanation: "Check the resulting output against expected correctness criteria.",
        },
      ],
      conclusion: "The scenario is resolved systematically and fulfills all criteria.",
    },
    commonMistakes: [
      {
        mistake: "Skipping boundary verification before proceeding with the main algorithm.",
        correction: "Always validate base conditions and terminal states first.",
      },
      {
        mistake: "Conflating average-case behavior with worst-case operational guarantees.",
        correction: "Analyze both average and asymptotic worst-case bounds explicitly.",
      },
    ],
    quickCheck: [
      {
        id: "qc_generic_1",
        prompt: `Which of the following best characterizes the primary objective of ${cleanTitle}?`,
        options: [
          `To enforce structural invariants and maintain predictable operational performance`,
          "To eliminate all memory allocations completely",
          "To bypass all syntax validation rules",
          "To execute random heuristic searches without guarantees",
        ],
        correctAnswer: `To enforce structural invariants and maintain predictable operational performance`,
        explanation: "Consistent structural invariants are essential for deterministic operational guarantees.",
      },
    ],
  };
}

/**
 * Provides deterministic questions for GUIDED_PRACTICE.
 */
export function getGuidedPracticeQuestions(
  topicTitle: string,
  learningObjective?: string | null
): GuidedPracticeQuestion[] {
  const cleanTitle = topicTitle.trim();

  if (cleanTitle.toLowerCase().includes("lr parsing") || cleanTitle.toLowerCase().includes("parsing")) {
    return [
      {
        id: "gp_1",
        prompt:
          "Consider the grammar production A -> alpha . a beta in state I. If the next input token is 'a', which action must the LR parser take?",
        options: [
          "Shift 'a' onto the stack and transition to state GOTO(I, a)",
          "Reduce by production A -> alpha",
          "Declare a syntax error immediately",
          "Halt and accept the input",
        ],
        correctAnswer: "Shift 'a' onto the stack and transition to state GOTO(I, a)",
        hints: [
          "Notice where the dot is placed relative to terminal symbol 'a'.",
          "The dot is immediately before 'a', meaning 'a' is expected next in the input stream.",
        ],
        stepByStepSolution: [
          "Step 1: Inspect the item A -> alpha . a beta.",
          "Step 2: Since the dot precedes terminal 'a', the parser has not yet consumed 'a'.",
          "Step 3: When terminal 'a' appears on the input stream, the valid action is a SHIFT.",
          "Step 4: The parser pushes 'a' along with state GOTO(I, a) onto the stack.",
        ],
        explanation:
          "When the dot precedes a terminal in an LR item, encountering that terminal triggers a shift action moving the dot past that terminal.",
        marks: 2,
      },
      {
        id: "gp_2",
        prompt:
          "In an SLR(1) parsing table, a state contains the completed item B -> gamma . If FOLLOW(B) = { +, $ }, in which table columns should the reduce action be entered?",
        options: [
          "Only columns '+' and '$'",
          "All terminal columns in the grammar",
          "Only in the '$' end-marker column",
          "Only in non-terminal GOTO columns",
        ],
        correctAnswer: "Only columns '+' and '$'",
        hints: [
          "Recall how Simple LR (SLR) restricts reductions compared to LR(0).",
          "SLR(1) only allows reductions where the following input token can legally follow the LHS non-terminal.",
        ],
        stepByStepSolution: [
          "Step 1: Identify that B -> gamma . is a completed reduction item.",
          "Step 2: In canonical LR(0), reductions fill every terminal column.",
          "Step 3: In SLR(1), reductions are strictly restricted to members of FOLLOW(B).",
          "Step 4: Given FOLLOW(B) = { +, $ }, reductions are placed only under '+' and '$'.",
        ],
        explanation:
          "SLR(1) tables resolve potential conflicts by placing reductions solely under the lookahead symbols in FOLLOW of the reduced non-terminal.",
        marks: 2,
      },
    ];
  }

  // Generic fallback practice
  return [
    {
      id: "gp_gen_1",
      prompt: `Given an input configuration under ${cleanTitle}, what is the prerequisite check before triggering state transition?`,
      options: [
        "Verify that base invariants and boundary conditions are satisfied",
        "Clear all accumulated state without validation",
        "Assume infinite recursion without base cases",
        "Invert all logical operators unconditionally",
      ],
      correctAnswer: "Verify that base invariants and boundary conditions are satisfied",
      hints: [
        "Consider how predictable algorithms avoid edge-case failures.",
        "Validating invariants is always the required first step.",
      ],
      stepByStepSolution: [
        "Step 1: Check whether the incoming input meets established format bounds.",
        "Step 2: Confirm boundary conditions do not trigger null or overflow exceptions.",
        "Step 3: Proceed with state transition only once preconditions are verified.",
      ],
      explanation: "Precondition verification guarantees that state transitions execute deterministically.",
      marks: 2,
    },
  ];
}

/**
 * Provides deterministic activities for RECALL.
 */
export function getRecallActivities(
  topicTitle: string,
  learningObjective?: string | null
): RecallActivity[] {
  const cleanTitle = topicTitle.trim();

  if (cleanTitle.toLowerCase().includes("lr parsing") || cleanTitle.toLowerCase().includes("parsing")) {
    return [
      {
        id: "rec_1",
        type: "KEY_TERM",
        prompt:
          "In bottom-up parsing, what term describes the substring on the stack that matches a production RHS and is ready to be reduced?",
        correctAnswer: "handle",
        explanation:
          "A 'handle' is a production RHS together with a position in the right-sentential form where reduction occurs.",
      },
      {
        id: "rec_2",
        type: "DEFINITION_MATCH",
        prompt:
          "Match the parsing conflict: The parser cannot determine whether to consume another token or trigger a reduction.",
        options: ["Shift-Reduce Conflict", "Reduce-Reduce Conflict", "Lexical Error", "Type Inversion"],
        correctAnswer: "Shift-Reduce Conflict",
        explanation:
          "A Shift-Reduce conflict occurs when a state has both a shift item and a completed reduce item valid on the same lookahead.",
      },
      {
        id: "rec_3",
        type: "STEP_ORDERING",
        prompt:
          "What set of the non-terminal determines where reductions are placed in an SLR(1) parsing table?",
        options: ["FIRST", "FOLLOW", "CLOSURE", "GOTO"],
        correctAnswer: "FOLLOW",
        explanation:
          "SLR(1) tables place reduce actions specifically under the tokens that belong to the FOLLOW set of the reduced non-terminal.",
      },
    ];
  }

  return [
    {
      id: "rec_gen_1",
      type: "KEY_TERM",
      prompt: `In the study of ${cleanTitle}, what is the term used to describe a condition that must remain true throughout every valid execution step?`,
      correctAnswer: "invariant",
      explanation: "An 'invariant' is an assertion that holds true at critical checkpoints throughout execution.",
    },
  ];
}

/**
 * Provides PRE-LEARNING verification questions (baseline capability check).
 */
export function getPreLearningQuestions(
  topicTitle: string,
  learningObjective?: string | null
): VerificationQuestion[] {
  const clean = topicTitle.trim().toLowerCase();

  if (clean.includes("lr parsing") || clean.includes("parsing")) {
    return [
      {
        id: "pre_lr_1",
        prompt:
          "What is the fundamental difference between LR(0) and SLR(1) parsing tables?",
        options: [
          "SLR(1) places reductions only under FOLLOW(A), while LR(0) places reductions across all terminal columns",
          "LR(0) can parse ambiguous grammars, whereas SLR(1) cannot",
          "SLR(1) uses multiple lookahead tokens, whereas LR(0) uses one",
          "LR(0) is top-down, while SLR(1) is bottom-up",
        ],
        correctAnswer:
          "SLR(1) places reductions only under FOLLOW(A), while LR(0) places reductions across all terminal columns",
        difficulty: "MEDIUM",
        explanation:
          "SLR(1) refines LR(0) by using FOLLOW sets to place reduction actions selectively.",
        marks: 2,
      },
      {
        id: "pre_lr_2",
        prompt:
          "If an LR state contains [A -> alpha .] and [B -> beta .], what type of conflict is present if their lookaheads overlap?",
        options: [
          "Reduce-Reduce conflict",
          "Shift-Reduce conflict",
          "First-Follow conflict",
          "Operator-precedence conflict",
        ],
        correctAnswer: "Reduce-Reduce conflict",
        difficulty: "EASY",
        explanation:
          "Two completed items competing on the same lookahead create a Reduce-Reduce conflict.",
        marks: 1,
      },
    ];
  }

  return [
    {
      id: "pre_gen_1",
      prompt: `Before applying ${topicTitle}, what is the primary structural property that must be verified?`,
      options: [
        "Input adherence to established type invariants and preconditions",
        "Total absence of memory pointers",
        "Execution in constant time without iteration",
        "Random permutation of input parameters",
      ],
      correctAnswer: "Input adherence to established type invariants and preconditions",
      difficulty: "EASY",
      explanation: "Structural type invariants must be validated before executing transitions.",
      marks: 1,
    },
    {
      id: "pre_gen_2",
      prompt: `When an edge condition is encountered in ${topicTitle}, what is the appropriate deterministic behavior?`,
      options: [
        "Handle the terminal condition via explicit boundary logic without crashing",
        "Silently discard all input data",
        "Enter an infinite wait loop",
        "Rewrite the underlying grammar unpredictably",
      ],
      correctAnswer: "Handle the terminal condition via explicit boundary logic without crashing",
      difficulty: "MEDIUM",
      explanation: "Explicit boundary logic handles edge cases without runtime failures.",
      marks: 2,
    },
  ];
}

/**
 * Provides POST-LEARNING verification questions (tests same objective using equivalent-but-different questions).
 */
export function getPostLearningQuestions(
  topicTitle: string,
  learningObjective?: string | null
): VerificationQuestion[] {
  const clean = topicTitle.trim().toLowerCase();

  if (clean.includes("lr parsing") || clean.includes("parsing")) {
    return [
      {
        id: "post_lr_1",
        prompt:
          "In an SLR(1) parser, if state I4 contains the reduction item S -> a b . and FOLLOW(S) = { $ }, in which column(s) will reduction 'r1' be placed?",
        options: [
          "Only in the '$' column",
          "In every terminal column including 'a' and 'b'",
          "In the 'a' column only",
          "In the non-terminal GOTO columns",
        ],
        correctAnswer: "Only in the '$' column",
        difficulty: "MEDIUM",
        explanation:
          "In SLR(1), reduction actions for production S -> alpha are placed strictly in the columns corresponding to FOLLOW(S). Since FOLLOW(S) = { $ }, it appears only under '$'.",
        marks: 2,
      },
      {
        id: "post_lr_2",
        prompt:
          "Which parsing conflict arises when an LR state contains both [E -> E . + T] and [E -> T .], and the next incoming lookahead token is '+'?",
        options: [
          "Shift-Reduce conflict",
          "Reduce-Reduce conflict",
          "Lookahead overflow",
          "Syntax acceptance",
        ],
        correctAnswer: "Shift-Reduce conflict",
        difficulty: "EASY",
        explanation:
          "The state can shift '+' according to E -> E . + T, or reduce T to E according to E -> T . on '+', creating a Shift-Reduce conflict.",
        marks: 1,
      },
    ];
  }

  return [
    {
      id: "post_gen_1",
      prompt: `Following the principles of ${topicTitle}, how does a deterministic system guarantee termination?`,
      options: [
        "By systematically progressing toward a well-defined base case or terminal state",
        "By relying on non-deterministic thread cancellation",
        "By discarding half the input randomly at each iteration",
        "By omitting boundary checks",
      ],
      correctAnswer:
        "By systematically progressing toward a well-defined base case or terminal state",
      difficulty: "MEDIUM",
      explanation: "Monotonic progress toward a terminal base case guarantees finite execution.",
      marks: 2,
    },
    {
      id: "post_gen_2",
      prompt: `What is the primary indicator that a concept in ${topicTitle} has been correctly applied?`,
      options: [
        "All outputs conform to verified structural specifications and invariants",
        "The code executed without taking any memory",
        "The compiler skipped syntax verification",
        "The input was completely reversed without reason",
      ],
      correctAnswer: "All outputs conform to verified structural specifications and invariants",
      difficulty: "EASY",
      explanation: "Conformance to specifications is the verified proof of correctness.",
      marks: 1,
    },
  ];
}
