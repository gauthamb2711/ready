import type { RetentionStage, QuestionDifficulty } from "@/types/database.types";

export interface RetentionQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: QuestionDifficulty;
  marks: number;
  questionType: "CONCEPT_RECALL" | "APPLICATION" | "PROBLEM_SOLVING" | "STEP_ORDERING";
}

export interface ClientSafeRetentionQuestion {
  id: string;
  prompt: string;
  options: string[];
  difficulty: QuestionDifficulty;
  marks: number;
  questionType: string;
}

/**
 * Strips correct answers and evaluation keys before delivering retention questions to the client.
 */
export function stripRetentionAnswerKeys(
  questions: RetentionQuestion[]
): ClientSafeRetentionQuestion[] {
  return questions.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    options: [...q.options],
    difficulty: q.difficulty,
    marks: q.marks,
    questionType: q.questionType,
  }));
}

/**
 * Deterministically generates spaced retrieval questions for a topic and retention stage.
 * Uses distinct question variants for 24H, 7D, and 30D intervals.
 */
export function getRetentionQuestions(
  topicTitle: string,
  stage: RetentionStage
): RetentionQuestion[] {
  const cleanTitle = topicTitle.trim();
  const lower = cleanTitle.toLowerCase();

  // Parsing / Compilers Domain
  if (lower.includes("parsing") || lower.includes("compiler") || lower.includes("syntax")) {
    if (stage === "RETENTION_24H") {
      return [
        {
          id: `ret-24h-parse-1`,
          prompt: "In bottom-up LR parsing, what specific stack operation occurs when a handle is recognized?",
          options: [
            "A shift operation pushes the next lookahead token",
            "A reduce operation replaces the handle with the production's LHS non-terminal",
            "The parser clears the stack and resets to state 0",
            "An error recovery routine inserts an epsilon transition",
          ],
          correctAnswer: "A reduce operation replaces the handle with the production's LHS non-terminal",
          explanation: "When a handle (RHS of a production) is matched on the stack, the parser reduces it to the corresponding LHS non-terminal.",
          difficulty: "EASY",
          marks: 1,
          questionType: "CONCEPT_RECALL",
        },
        {
          id: `ret-24h-parse-2`,
          prompt: "How does SLR(1) parsing resolve potential shift-reduce conflicts compared to simple LR(0)?",
          options: [
            "It computes exact 1-lookahead terminal sets for every canonical item",
            "It consults the FOLLOW set of the LHS non-terminal to permit reduction only on valid following tokens",
            "It automatically prioritizes reduce actions over shift actions unconditionally",
            "It splits conflict states into two separate parse tables",
          ],
          correctAnswer: "It consults the FOLLOW set of the LHS non-terminal to permit reduction only on valid following tokens",
          explanation: "SLR(1) places reduction actions only in table cells corresponding to FOLLOW(A), avoiding conflicts with shifts on other terminals.",
          difficulty: "MEDIUM",
          marks: 2,
          questionType: "APPLICATION",
        },
        {
          id: `ret-24h-parse-3`,
          prompt: "Given state I containing items [A -> α.aβ] and [B -> γ.], under what condition does a Shift-Reduce conflict occur?",
          options: [
            "When token 'a' is in FOLLOW(B)",
            "When token 'a' is in FIRST(β)",
            "When 'a' is the end-of-input marker '$'",
            "When B is the start symbol of the grammar",
          ],
          correctAnswer: "When token 'a' is in FOLLOW(B)",
          explanation: "If lookahead 'a' can trigger a shift on item A and is simultaneously in FOLLOW(B) triggering a reduce, the parser cannot determine whether to shift or reduce.",
          difficulty: "HARD",
          marks: 2,
          questionType: "PROBLEM_SOLVING",
        },
      ];
    } else if (stage === "RETENTION_7D") {
      return [
        {
          id: `ret-7d-parse-1`,
          prompt: "Why can an LR(1) grammar parse constructs that cause reduce-reduce conflicts in an SLR(1) parser?",
          options: [
            "LR(1) carries lookaheads directly with each item rather than using broad FOLLOW sets",
            "LR(1) uses multiple parsing stacks simultaneously",
            "LR(1) grammars do not require augmented starting productions",
            "LR(1) parsers evaluate productions from right to left",
          ],
          correctAnswer: "LR(1) carries lookaheads directly with each item rather than using broad FOLLOW sets",
          explanation: "LR(1) items [A -> α.β, a] carry explicit context lookaheads, avoiding over-generalization caused by grammar-wide FOLLOW sets.",
          difficulty: "MEDIUM",
          marks: 2,
          questionType: "APPLICATION",
        },
        {
          id: `ret-7d-parse-2`,
          prompt: "What is the primary trade-off when converting canonical LR(1) parse tables into LALR(1) tables?",
          options: [
            "LALR(1) tables drastically reduce state count by merging identical cores, but can introduce reduce-reduce conflicts",
            "LALR(1) tables eliminate all shift-reduce conflicts at the cost of doubling the state count",
            "LALR(1) parsers require exponential time complexity compared to canonical LR(1)",
            "LALR(1) requires the input grammar to be strictly non-recursive",
          ],
          correctAnswer: "LALR(1) tables drastically reduce state count by merging identical cores, but can introduce reduce-reduce conflicts",
          explanation: "LALR merges states with identical LR(0) cores. While it maintains the same state size as SLR(1), it can occasionally create reduce-reduce conflicts.",
          difficulty: "HARD",
          marks: 2,
          questionType: "CONCEPT_RECALL",
        },
        {
          id: `ret-7d-parse-3`,
          prompt: "Which step ordering correctly reflects the construction pipeline of an LR parsing table?",
          options: [
            "Augment Grammar -> Generate Canonical Collection -> Compute Lookaheads/FOLLOW -> Populate GOTO/ACTION Table",
            "Populate ACTION Table -> Augment Grammar -> Compute FIRST Sets -> Run Closure",
            "Compute FOLLOW Sets -> Merge State Cores -> Shift Terminals -> Augment Grammar",
            "Tokenize Input -> Reverse Rightmost Derivation -> Compute Augmented Sets -> Parse Tree",
          ],
          correctAnswer: "Augment Grammar -> Generate Canonical Collection -> Compute Lookaheads/FOLLOW -> Populate GOTO/ACTION Table",
          explanation: "Standard pipeline: 1. Augment grammar with S' -> S. 2. Build canonical collection using closure and goto. 3. Compute follow/lookahead sets. 4. Populate table.",
          difficulty: "MEDIUM",
          marks: 1,
          questionType: "STEP_ORDERING",
        },
      ];
    } else {
      // 30D Retreival
      return [
        {
          id: `ret-30d-parse-1`,
          prompt: "In a 30-day concept verification: What distinguishes a viable handle in bottom-up parsing from any arbitrary substring matching a production RHS?",
          options: [
            "A handle is a substring that matches a RHS whose reduction represents a step in the reverse of a rightmost derivation",
            "A handle is any terminal substring that appears first in the input stream",
            "A handle is always composed strictly of non-terminal symbols",
            "A handle must always end with the end-of-string token '$'",
          ],
          correctAnswer: "A handle is a substring that matches a RHS whose reduction represents a step in the reverse of a rightmost derivation",
          explanation: "Not every match is a handle; a true handle corresponds strictly to the active reduction in the reverse rightmost derivation.",
          difficulty: "HARD",
          marks: 2,
          questionType: "CONCEPT_RECALL",
        },
        {
          id: `ret-30d-parse-2`,
          prompt: "When an LR parser detects an empty entry in its ACTION table during runtime execution, what occurs?",
          options: [
            "Syntax error is triggered and error recovery or rejection initiates",
            "The parser shifts the next three tokens automatically",
            "The stack is popped until state 0 is reached without notification",
            "A reduce action to the start symbol is attempted as fallback",
          ],
          correctAnswer: "Syntax error is triggered and error recovery or rejection initiates",
          explanation: "Blank entries in the ACTION table correspond to unexpected tokens given the current parser state, triggering syntax error handlers.",
          difficulty: "MEDIUM",
          marks: 1,
          questionType: "APPLICATION",
        },
        {
          id: `ret-30d-parse-3`,
          prompt: "Evaluate the capability hierarchy: Which of the following statements correctly ranks grammar parsing power?",
          options: [
            "LL(1) ⊂ SLR(1) ⊂ LALR(1) ⊂ LR(1)",
            "LR(1) ⊂ LALR(1) ⊂ SLR(1) ⊂ LL(1)",
            "SLR(1) ⊂ LL(1) ⊂ LR(1) ⊂ LALR(1)",
            "LALR(1) ⊂ SLR(1) ⊂ LR(1) ⊂ LL(1)",
          ],
          correctAnswer: "LL(1) ⊂ SLR(1) ⊂ LALR(1) ⊂ LR(1)",
          explanation: "Canonical LR(1) is the most powerful deterministic parsing method, strictly containing LALR(1), which contains SLR(1), which contains LL(1).",
          difficulty: "MEDIUM",
          marks: 2,
          questionType: "PROBLEM_SOLVING",
        },
      ];
    }
  }

  // Database / Normalization Domain
  if (lower.includes("dbms") || lower.includes("database") || lower.includes("normalization") || lower.includes("sql")) {
    return [
      {
        id: `ret-${stage.toLowerCase()}-db-1`,
        prompt: "What is the defining condition for a relational schema to satisfy Second Normal Form (2NF)?",
        options: [
          "It is in 1NF and every non-prime attribute is fully functionally dependent on the entire primary key",
          "It contains no multi-valued dependencies across tables",
          "Every determinant in the schema is a candidate key",
          "All attributes must be foreign keys to another table",
        ],
        correctAnswer: "It is in 1NF and every non-prime attribute is fully functionally dependent on the entire primary key",
        explanation: "2NF eliminates partial functional dependencies on composite primary keys.",
        difficulty: "EASY",
        marks: 1,
        questionType: "CONCEPT_RECALL",
      },
      {
        id: `ret-${stage.toLowerCase()}-db-2`,
        prompt: "If relation R(A, B, C, D) has functional dependencies A -> B and B -> C, which normal form violation exists?",
        options: [
          "Transitive dependency violating 3NF",
          "Partial dependency violating 2NF",
          "Multi-valued dependency violating 4NF",
          "No violation; schema is in BCNF",
        ],
        correctAnswer: "Transitive dependency violating 3NF",
        explanation: "A -> B and B -> C produces a transitive dependency A -> C where B is not a superkey, violating 3NF.",
        difficulty: "MEDIUM",
        marks: 2,
        questionType: "APPLICATION",
      },
      {
        id: `ret-${stage.toLowerCase()}-db-3`,
        prompt: "What guarantees are preserved when decomposing a relation into Boyce-Codd Normal Form (BCNF)?",
        options: [
          "Lossless join is always guaranteed, but dependency preservation is not guaranteed",
          "Both lossless join and dependency preservation are always guaranteed",
          "Dependency preservation is guaranteed, but lossless join is lost",
          "Neither lossless join nor dependency preservation can be achieved",
        ],
        correctAnswer: "Lossless join is always guaranteed, but dependency preservation is not guaranteed",
        explanation: "BCNF decomposition can always be made lossless join, but certain functional dependencies may span tables and cannot be preserved.",
        difficulty: "HARD",
        marks: 2,
        questionType: "PROBLEM_SOLVING",
      },
    ];
  }

  // Default / Universal Retrieval Questions (Customized with topic title)
  return [
    {
      id: `ret-${stage.toLowerCase()}-gen-1`,
      prompt: `In retrieving your knowledge of "${cleanTitle}": What is the primary operational objective or purpose of this concept?`,
      options: [
        `To provide structured, deterministic execution and state resolution for ${cleanTitle}`,
        `To eliminate the need for systematic testing and validation in ${cleanTitle}`,
        `To bypass underlying architectural constraints without verification`,
        `To convert asynchronous processes into unbuffered streams`,
      ],
      correctAnswer: `To provide structured, deterministic execution and state resolution for ${cleanTitle}`,
      explanation: `The fundamental purpose of ${cleanTitle} is to establish structured, predictable outcomes based on defined principles.`,
      difficulty: "EASY",
      marks: 1,
      questionType: "CONCEPT_RECALL",
    },
    {
      id: `ret-${stage.toLowerCase()}-gen-2`,
      prompt: `When applying ${cleanTitle} in a realistic system scenario, what key constraint must be satisfied?`,
      options: [
        `Preconditions and core invariant properties must be validated prior to state transitions`,
        `All dependencies must be decoupled from runtime monitoring entirely`,
        `System execution must proceed without error handling checkpoints`,
        `Resource boundaries must remain untracked during processing`,
      ],
      correctAnswer: `Preconditions and core invariant properties must be validated prior to state transitions`,
      explanation: `Practical application of ${cleanTitle} requires rigorous validation of invariants and boundaries.`,
      difficulty: "MEDIUM",
      marks: 2,
      questionType: "APPLICATION",
    },
    {
      id: `ret-${stage.toLowerCase()}-gen-3`,
      prompt: `Which diagnostic indicator signals concept decay or incomplete retention when evaluating ${cleanTitle}?`,
      options: [
        `Difficulty identifying boundary conditions and edge-case exceptions`,
        `Immediate, high-accuracy problem solving across variants`,
        `Consistent retrieval of underlying definitions without hesitation`,
        `Demonstrated ability to explain trade-offs to a peer`,
      ],
      correctAnswer: `Difficulty identifying boundary conditions and edge-case exceptions`,
      explanation: `Decayed retention typically manifests first as difficulty recalling edge cases and boundary rules.`,
      difficulty: "HARD",
      marks: 2,
      questionType: "PROBLEM_SOLVING",
    },
  ];
}
