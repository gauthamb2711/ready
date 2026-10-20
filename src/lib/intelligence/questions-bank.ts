import type { DiagnosticQuestion, QuestionType, QuestionDifficulty } from "@/types/database.types";

export interface SeedQuestionDefinition {
  topicTitle: string;
  subtopicTitle?: string;
  learningObjective?: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  marks: number;
}

export const DETERMINISTIC_QUESTION_BANK: SeedQuestionDefinition[] = [
  // --- COMPILER DESIGN / SYNTAX ANALYSIS ---
  {
    topicTitle: "LR Parsing",
    subtopicTitle: "LR(1) Parsing Tables",
    learningObjective: "Construct and analyze an LR(1) parsing table.",
    type: "MCQ",
    difficulty: "EASY",
    prompt: "Which of the following is true about LR(1) parsers compared to LALR(1) parsers?",
    options: [
      "LR(1) parsers have fewer states than LALR(1) parsers",
      "LR(1) parsers have equal or more states than LALR(1) parsers",
      "LALR(1) parsers can parse more grammars than LR(1)",
      "LR(1) parsers cannot parse left-recursive grammars",
    ],
    correctAnswer: "LR(1) parsers have equal or more states than LALR(1) parsers",
    explanation: "LALR(1) parsers merge LR(1) states that have identical core sets of items, resulting in equal or fewer states than canonical LR(1).",
    marks: 1,
  },
  {
    topicTitle: "LR Parsing",
    subtopicTitle: "Conflict Resolution in LR",
    learningObjective: "Identify Shift-Reduce and Reduce-Reduce conflicts in LR parsers.",
    type: "MCQ",
    difficulty: "MEDIUM",
    prompt: "A Shift-Reduce conflict in an LR parser state indicates that:",
    options: [
      "The parser cannot decide whether to shift the next token or reduce by a grammar production",
      "Two different productions can be reduced simultaneously",
      "The input string is syntactically invalid",
      "The grammar is definitely unambiguous",
    ],
    correctAnswer: "The parser cannot decide whether to shift the next token or reduce by a grammar production",
    explanation: "A shift-reduce conflict arises when the current state contains an item that can perform a shift on a lookahead token and another completed item that can perform a reduction on the same token.",
    marks: 2,
  },
  {
    topicTitle: "LR Parsing",
    subtopicTitle: "LR(0) and SLR(1) Parsing",
    learningObjective: "Determine when an LR(0) item set is valid for SLR(1).",
    type: "SHORT_ANSWER",
    difficulty: "HARD",
    prompt: "In SLR(1) parsing, reductions are placed only in the columns corresponding to which set of the LHS non-terminal?",
    options: [],
    correctAnswer: "FOLLOW",
    explanation: "SLR(1) resolves conflicts by placing reduction actions only under the lookahead symbols that belong to FOLLOW(A), where A is the LHS non-terminal.",
    marks: 3,
  },

  // --- DATA STRUCTURES & ALGORITHMS ---
  {
    topicTitle: "Binary Search Trees",
    subtopicTitle: "Self-Balancing Trees",
    learningObjective: "Analyze height balance in AVL and Red-Black trees.",
    type: "MCQ",
    difficulty: "EASY",
    prompt: "What is the worst-case time complexity of search in a balanced Binary Search Tree with n nodes?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
    correctAnswer: "O(log n)",
    explanation: "A balanced BST maintains height bounded by O(log n), ensuring all search operations traverse at most proportional to the height.",
    marks: 1,
  },
  {
    topicTitle: "Binary Search Trees",
    subtopicTitle: "Tree Rotations",
    learningObjective: "Perform single and double rotations in an AVL tree.",
    type: "MCQ",
    difficulty: "MEDIUM",
    prompt: "When an insertion into the left subtree of a right child causes an imbalance in an AVL tree, which rotation is required?",
    options: ["Right-Left (RL) Rotation", "Left-Right (LR) Rotation", "Single Left Rotation", "Single Right Rotation"],
    correctAnswer: "Right-Left (RL) Rotation",
    explanation: "An insertion in the left subtree of a right child forms a zig-zag (RL) pattern, requiring a Right-Left double rotation to restore balance.",
    marks: 2,
  },
  {
    topicTitle: "Graph Algorithms",
    subtopicTitle: "Shortest Path",
    learningObjective: "Evaluate conditions under which Dijkstra's algorithm fails.",
    type: "SHORT_ANSWER",
    difficulty: "HARD",
    prompt: "Name the graph condition that prevents Dijkstra's algorithm from finding the correct shortest path.",
    options: [],
    correctAnswer: "negative edge weights",
    explanation: "Dijkstra's greedy choice assumes that once a vertex distance is finalized, no shorter path can be discovered, which fails when edges with negative weights exist.",
    marks: 3,
  },

  // --- OPERATING SYSTEMS ---
  {
    topicTitle: "Process Synchronization",
    subtopicTitle: "Deadlock Conditions",
    learningObjective: "Formulate Coffman's four conditions for deadlock.",
    type: "MCQ",
    difficulty: "EASY",
    prompt: "Which of the following is NOT one of Coffman's four necessary conditions for deadlock?",
    options: ["Mutual Exclusion", "Hold and Wait", "Preemption", "Circular Wait"],
    correctAnswer: "Preemption",
    explanation: "The condition is No Preemption (resources cannot be forcibly taken away). Preemption prevents deadlock.",
    marks: 1,
  },
  {
    topicTitle: "Process Synchronization",
    subtopicTitle: "Semaphores and Mutexes",
    learningObjective: "Apply binary and counting semaphores to critical section problems.",
    type: "SHORT_ANSWER",
    difficulty: "MEDIUM",
    prompt: "What synchronization primitive allows a fixed number of threads (greater than 1) to access a resource pool concurrently?",
    options: [],
    correctAnswer: "counting semaphore",
    explanation: "A counting semaphore maintains an integer counter tracking available resource units, allowing concurrent access up to the limit.",
    marks: 2,
  },
];
