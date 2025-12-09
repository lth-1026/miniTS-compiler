import {
  Program,
  Statement,
  Expression,
  VarDecl,
  FunctionDecl,
  IfStmt,
  WhileStmt,
  ReturnStmt,
  ExprStmt,
  BlockStmt,
  BinaryExpr,
  UnaryExpr,
  CallExpr,
  AssignExpr,
  IdentifierExpr,
  NumberLiteralExpr,
  StringLiteralExpr,
  BooleanLiteralExpr,
} from "../ast";

export class CodeGenerator {
  private indentLevel = 0;
  private readonly indentStr = "  "; // 2 spaces

  private indent(): string {
    return this.indentStr.repeat(this.indentLevel);
  }

  generate(program: Program): string {
    const lines: string[] = [];
    for (const stmt of program.body) {
      lines.push(this.emitStatement(stmt));
    }
    // 빈 줄 제거 + 개행 정리
    return lines.filter((l) => l.length > 0).join("\n");
  }

  private emitStatement(stmt: Statement): string {
    switch (stmt.kind) {
      case "VarDecl":
        return this.emitVarDecl(stmt);
      case "FunctionDecl":
        return this.emitFunctionDecl(stmt);
      case "IfStmt":
        return this.emitIfStmt(stmt);
      case "WhileStmt":
        return this.emitWhileStmt(stmt);
      case "ReturnStmt":
        return this.emitReturnStmt(stmt);
      case "ExprStmt":
        return this.indent() + this.emitExpression(stmt.expression) + ";";
      case "BlockStmt":
        return this.emitBlockStmt(stmt);
      default: {
        const _never: never = stmt;
        throw new Error(
          `[CodegenError] Unhandled statement kind '${(stmt as any).kind}'`
        );
      }
    }
  }

  private emitVarDecl(node: VarDecl): string {
    // 타입 어노테이션은 코드 생성에서 제거
    const initPart = node.init ? " = " + this.emitExpression(node.init) : "";
    return this.indent() + `let ${node.name}${initPart};`;
  }

  private emitFunctionDecl(fn: FunctionDecl): string {
    const params = fn.params.map((p) => p.name).join(", ");
    const header = `${this.indent()}function ${fn.name}(${params}) {`;

    this.indentLevel++;
    const bodyLines: string[] = [];
    for (const s of fn.body.body) {
      bodyLines.push(this.emitStatement(s));
    }
    this.indentLevel--;

    const footer = `${this.indent()}}`;
    return [header, ...bodyLines, footer].join("\n");
  }

  private emitIfStmt(node: IfStmt): string {
    const test = this.emitExpression(node.test);
    const thenPart = this.emitStatementAsBlock(node.consequent);
    let code = `${this.indent()}if (${test}) ${thenPart}`;

    if (node.alternate) {
      const elsePart = this.emitStatementAsBlock(node.alternate);
      code += ` else ${elsePart}`;
    }

    return code;
  }

  private emitWhileStmt(node: WhileStmt): string {
    const test = this.emitExpression(node.test);
    const body = this.emitStatementAsBlock(node.body);
    return `${this.indent()}while (${test}) ${body}`;
  }

  private emitReturnStmt(node: ReturnStmt): string {
    if (!node.argument) {
      return this.indent() + "return;";
    }
    const expr = this.emitExpression(node.argument);
    return this.indent() + `return ${expr};`;
  }

  private emitBlockStmt(block: BlockStmt): string {
    const lines: string[] = [];
    lines.push(this.indent() + "{");
    this.indentLevel++;
    for (const s of block.body) {
      lines.push(this.emitStatement(s));
    }
    this.indentLevel--;
    lines.push(this.indent() + "}");
    return lines.join("\n");
  }

  // stmt가 Block이 아니면 block으로 감싸주는 헬퍼
  private emitStatementAsBlock(stmt: Statement): string {
    if (stmt.kind === "BlockStmt") {
      return this.emitBlockStmt(stmt);
    }
    // 한 줄짜리 블록으로 감싸기
    const lines: string[] = [];
    lines.push("{");
    this.indentLevel++;
    lines.push(this.emitStatement(stmt));
    this.indentLevel--;
    lines.push(this.indent() + "}");
    return lines.join("\n");
  }

  // ─────────────────────────
  // Expressions
  // ─────────────────────────

  private emitExpression(expr: Expression): string {
    switch (expr.kind) {
      case "NumberLiteralExpr":
        return this.emitNumberLiteral(expr);
      case "StringLiteralExpr":
        return this.emitStringLiteral(expr);
      case "BooleanLiteralExpr":
        return this.emitBooleanLiteral(expr);
      case "IdentifierExpr":
        return this.emitIdentifierExpr(expr);
      case "BinaryExpr":
        return this.emitBinaryExpr(expr);
      case "UnaryExpr":
        return this.emitUnaryExpr(expr);
      case "CallExpr":
        return this.emitCallExpr(expr);
      case "AssignExpr":
        return this.emitAssignExpr(expr);
      default: {
        const _never: never = expr;
        throw new Error(
          `[CodegenError] Unhandled expression kind '${(expr as any).kind}'`
        );
      }
    }
  }

  private emitNumberLiteral(node: NumberLiteralExpr): string {
    return String(node.value);
  }

  private emitStringLiteral(node: StringLiteralExpr): string {
    // 간단하게 "..." 형태로만 출력 (이스케이프 처리는 생략해도 됨)
    return JSON.stringify(node.value);
  }

  private emitBooleanLiteral(node: BooleanLiteralExpr): string {
    return node.value ? "true" : "false";
  }

  private emitIdentifierExpr(node: IdentifierExpr): string {
    return node.name;
  }

  private emitBinaryExpr(node: BinaryExpr): string {
    const left = this.emitExpression(node.left);
    const right = this.emitExpression(node.right);
    // 우선순위 문제를 단순화해서, 양옆에 괄호를 걸어도 됨:
    return `(${left} ${node.operator} ${right})`;
  }

  private emitUnaryExpr(node: UnaryExpr): string {
    const arg = this.emitExpression(node.argument);
    return `${node.operator}${arg}`;
  }

  private emitCallExpr(node: CallExpr): string {
    const callee = this.emitExpression(node.callee);
    const args = node.args.map((a) => this.emitExpression(a)).join(", ");
    return `${callee}(${args})`;
  }

  private emitAssignExpr(node: AssignExpr): string {
    const target = node.target.name;
    const value = this.emitExpression(node.value);
    return `${target} = ${value}`;
  }
}
