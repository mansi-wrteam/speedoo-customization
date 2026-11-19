// Escape hatch for the migration. Use this — never a bare `any` — where a type
// is not known yet, so every remaining gap can be found with:
//   grep -rn "TODO_TYPE" src
// Phase 5 target: fewer than 50 uses, each with a comment.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TODO_TYPE = any;
