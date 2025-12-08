export type TypeAnnotation = "number" | "boolean" | "string" | "void";

export interface Program {
  kind: "Program";
  body: Statement[];
}

// ────────────────
// Statements
// ────────────────

export type Statement =
  | VarDecl
  | FunctionDecl
  | IfStmt
  | WhileStmt
  | ReturnStmt
  | ExprStmt
  | BlockStmt;

export interface VarDecl {
  kind: "VarDecl";
  name: string;
  varType: TypeAnnotation | null;
  init: Expression | null;
}

export interface Param {
  name: string;
  paramType: TypeAnnotation;
}

export interface FunctionDecl {
  kind: "FunctionDecl";
  name: string;
  params: Param[];
  returnType: TypeAnnotation;
  body: BlockStmt;
}

export interface IfStmt {
  kind: "IfStmt";
  test: Expression;
  consequent: Statement; // 보통 BlockStmt
  alternate: Statement | null; // else 블록 or 단일 문장
}

export interface WhileStmt {
  kind: "WhileStmt";
  test: Expression;
  body: Statement; // 보통 BlockStmt
}

export interface ReturnStmt {
  kind: "ReturnStmt";
  argument: Expression | null;
}

export interface ExprStmt {
  kind: "ExprStmt";
  expression: Expression;
}

export interface BlockStmt {
  kind: "BlockStmt";
  body: Statement[];
}

// ────────────────
// Expressions
// ────────────────

export type Expression =
  | IdentifierExpr
  | NumberLiteralExpr
  | StringLiteralExpr
  | BooleanLiteralExpr
  | BinaryExpr
  | UnaryExpr
  | CallExpr
  | AssignExpr;

export interface IdentifierExpr {
  kind: "IdentifierExpr";
  name: string;
}

export interface NumberLiteralExpr {
  kind: "NumberLiteralExpr";
  value: number;
}

export interface StringLiteralExpr {
  kind: "StringLiteralExpr";
  value: string;
}

export interface BooleanLiteralExpr {
  kind: "BooleanLiteralExpr";
  value: boolean;
}

export type BinaryOperator =
  | "+"
  | "-"
  | "*"
  | "/"
  | "=="
  | "==="
  | "!="
  | "!=="
  | "<"
  | "<="
  | ">"
  | ">="
  | "&&"
  | "||";

export interface BinaryExpr {
  kind: "BinaryExpr";
  operator: BinaryOperator;
  left: Expression;
  right: Expression;
}

export type UnaryOperator = "!" | "-";

export interface UnaryExpr {
  kind: "UnaryExpr";
  operator: UnaryOperator;
  argument: Expression;
}

export interface CallExpr {
  kind: "CallExpr";
  callee: Expression; // IdentifierExpr 등
  args: Expression[];
}

export interface AssignExpr {
  kind: "AssignExpr";
  target: IdentifierExpr;
  value: Expression;
}
