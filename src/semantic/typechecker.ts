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
  UnaryExpr,
  CallExpr,
  IdentifierExpr,
  BinaryExpr,
  AssignExpr,
} from "../ast";
import { Type } from "./types";
import { VarSymbolTable } from "./symbolTable";

interface FuncInfo {
  paramTypes: Type[];
  returnType: Type;
}

export class TypeChecker {
  // 변수용 심볼 테이블 (스코프 스택)
  private vars: VarSymbolTable;
  // 함수는 전역 맵으로 관리 (함수는 전역에서만 선언된다고 가정)
  private funcs: Map<string, FuncInfo>;

  constructor() {
    this.vars = new VarSymbolTable();
    this.funcs = new Map();
  }

  checkProgram(program: Program): void {
    // 1. 함수 시그니처 먼저 수집 (선언 순서와 무관하게 호출 가능하게)
    for (const stmt of program.body) {
      if (stmt.kind === "FunctionDecl") {
        this.declareFunction(stmt);
      }
    }

    // 2. 본문 타입 체크 (전역 스코프에서 실행)
    for (const stmt of program.body) {
      this.checkStatement(stmt, /* currentReturnType: */ null);
    }
  }

  // ─────────────────────────
  // 함수 선언 정보 등록 (전역 함수 테이블)
  // ─────────────────────────

  private declareFunction(fn: FunctionDecl): void {
    if (this.funcs.has(fn.name)) {
      throw new Error(`[TypeError] Duplicate function '${fn.name}'`);
    }
    const paramTypes = fn.params.map((p) => p.paramType);
    this.funcs.set(fn.name, {
      paramTypes,
      returnType: fn.returnType,
    });
  }

  // ─────────────────────────
  // Statement 타입 체크
  // ─────────────────────────

  private checkStatement(
    stmt: Statement,
    currentReturnType: Type | null
  ): void {
    switch (stmt.kind) {
      case "VarDecl":
        this.checkVarDecl(stmt);
        break;
      case "FunctionDecl":
        this.checkFunctionDecl(stmt);
        break;
      case "IfStmt":
        this.checkIfStmt(stmt, currentReturnType);
        break;
      case "WhileStmt":
        this.checkWhileStmt(stmt, currentReturnType);
        break;
      case "ReturnStmt":
        this.checkReturnStmt(stmt, currentReturnType);
        break;
      case "ExprStmt":
        this.checkExpression(stmt.expression);
        break;
      case "BlockStmt":
        this.checkBlockStmt(stmt, currentReturnType);
        break;
      default: {
        const _exhaustive: never = stmt;
        return _exhaustive;
      }
    }
  }

  private checkVarDecl(node: VarDecl): void {
    let initType: Type | null = null;
    if (node.init) {
      initType = this.checkExpression(node.init);
    }

    // 명시 타입이 있으면 init과 호환되는지 확인
    if (node.varType) {
      if (initType && initType !== node.varType) {
        throw new Error(
          `[TypeError] Variable '${node.name}' expected type '${node.varType}' but got '${initType}'`
        );
      }
      this.vars.declareVar(node.name, node.varType);
    } else {
      // 타입 어노테이션 없으면 init 타입으로 추론
      if (!initType) {
        throw new Error(
          `[TypeError] Variable '${node.name}' has no type annotation and no initializer`
        );
      }
      this.vars.declareVar(node.name, initType);
    }
  }

  private checkFunctionDecl(fn: FunctionDecl): void {
    // 함수 본문은 "함수 스코프"를 새로 연 뒤 검사
    //   - 전역 변수는 바깥 스코프에 있으므로 여전히 보임
    this.vars.pushScope();

    // 파라미터 등록
    fn.params.forEach((p) => {
      // 기존 코드와 동일하게: 파라미터 이름이 이미 존재하는 변수와 충돌하면 에러
      if (this.vars.hasInAnyScope(p.name)) {
        throw new Error(
          `[TypeError] Parameter name '${p.name}' conflicts with existing variable`
        );
      }
      this.vars.declareVar(p.name, p.paramType);
    });

    // 함수 body는 BlockStmt 이지만, 여기서는 직접 body 내부 stmt들을 순회
    // (BlockStmt 자체는 "추가 블록 스코프"에서 쓰이도록 남겨둔다)
    for (const s of fn.body.body) {
      this.checkStatement(s, fn.returnType);
    }

    this.vars.popScope();
  }

  private checkIfStmt(node: IfStmt, currentReturnType: Type | null): void {
    const condType = this.checkExpression(node.test);
    if (condType !== "boolean") {
      throw new Error(
        `[TypeError] If condition must be boolean, got '${condType}'`
      );
    }
    this.checkStatement(node.consequent, currentReturnType);
    if (node.alternate) {
      this.checkStatement(node.alternate, currentReturnType);
    }
  }

  private checkWhileStmt(
    node: WhileStmt,
    currentReturnType: Type | null
  ): void {
    const condType = this.checkExpression(node.test);
    if (condType !== "boolean") {
      throw new Error(
        `[TypeError] While condition must be boolean, got '${condType}'`
      );
    }
    this.checkStatement(node.body, currentReturnType);
  }

  private checkReturnStmt(
    node: ReturnStmt,
    currentReturnType: Type | null
  ): void {
    if (!currentReturnType) {
      throw new Error("[TypeError] 'return' used outside of a function");
    }

    if (!node.argument) {
      if (currentReturnType !== "void") {
        throw new Error(
          `[TypeError] Function must return '${currentReturnType}', got 'void'`
        );
      }
      return;
    }

    const argType = this.checkExpression(node.argument);
    if (argType !== currentReturnType) {
      throw new Error(
        `[TypeError] Function must return '${currentReturnType}', got '${argType}'`
      );
    }
  }

  private checkBlockStmt(
    block: BlockStmt,
    currentReturnType: Type | null
  ): void {
    // 블록마다 새로운 스코프를 열고, 끝나면 닫기
    this.vars.pushScope();
    for (const s of block.body) {
      this.checkStatement(s, currentReturnType);
    }
    this.vars.popScope();
  }

  // ─────────────────────────
  // Expression 타입 체크
  // ─────────────────────────

  private checkExpression(expr: Expression): Type {
    switch (expr.kind) {
      case "NumberLiteralExpr":
        return "number";
      case "StringLiteralExpr":
        return "string";
      case "BooleanLiteralExpr":
        return "boolean";
      case "IdentifierExpr":
        return this.checkIdentifierExpr(expr);
      case "BinaryExpr":
        return this.checkBinaryExpr(expr);
      case "UnaryExpr":
        return this.checkUnaryExpr(expr);
      case "CallExpr":
        return this.checkCallExpr(expr);
      case "AssignExpr":
        return this.checkAssignExpr(expr);
      default: {
        const _exhaustive: never = expr;
        return _exhaustive;
      }
    }
  }

  private checkIdentifierExpr(node: IdentifierExpr): Type {
    const info = this.vars.resolve(node.name);
    return info.type;
  }

  private checkBinaryExpr(node: BinaryExpr): Type {
    const left = this.checkExpression(node.left);
    const right = this.checkExpression(node.right);

    switch (node.operator) {
      // ─────────────────────────
      // + : number+number → number, string+string → string
      // ─────────────────────────
      case "+":
        if (left === "number" && right === "number") {
          return "number";
        }
        if (left === "string" && right === "string") {
          return "string";
        }
        throw new Error(
          `[TypeError] Operator '+' requires (number, number) or (string, string), got '${left}' and '${right}'`
        );

      // 나머지 산술 연산 - * / 는 숫자 전용
      case "-":
      case "*":
      case "/":
        if (left !== "number" || right !== "number") {
          throw new Error(
            `[TypeError] Operator '${node.operator}' requires number operands, got '${left}' and '${right}'`
          );
        }
        return "number";

      // 논리 연산
      case "&&":
      case "||":
        if (left !== "boolean" || right !== "boolean") {
          throw new Error(
            `[TypeError] Operator '${node.operator}' requires boolean operands, got '${left}' and '${right}'`
          );
        }
        return "boolean";

      // 느슨한 동등: ==, !=  (void만 금지)
      case "==":
      case "!=":
        if (left === "void" || right === "void") {
          throw new Error(
            `[TypeError] Operator '${node.operator}' cannot be applied to 'void'`
          );
        }
        return "boolean";

      // strict 동등: ===, !==  (타입 동일해야 함)
      case "===":
      case "!==":
        if (left !== right) {
          throw new Error(
            `[TypeError] Operator '${node.operator}' requires operands of the same type, got '${left}' and '${right}'`
          );
        }
        return "boolean";

      // 비교 연산: <, <=, >, >= → number 전용
      case "<":
      case "<=":
      case ">":
      case ">=":
        if (left !== "number" || right !== "number") {
          throw new Error(
            `[TypeError] Operator '${node.operator}' requires number operands, got '${left}' and '${right}'`
          );
        }
        return "boolean";
    }

    const _never: never = node.operator;
    throw new Error(`[TypeError] Unhandled binary operator '${_never}'`);
  }

  private checkUnaryExpr(node: UnaryExpr): Type {
    const t = this.checkExpression(node.argument);
    if (node.operator === "!") {
      if (t !== "boolean") {
        throw new Error(
          `[TypeError] Operator '!' requires boolean operand, got '${t}'`
        );
      }
      return "boolean";
    } else if (node.operator === "-") {
      if (t !== "number") {
        throw new Error(
          `[TypeError] Unary '-' requires number operand, got '${t}'`
        );
      }
      return "number";
    }
    return t;
  }

  private checkCallExpr(node: CallExpr): Type {
    // MiniTS 설계 상: callee는 IdentifierExpr라고 가정
    if (node.callee.kind !== "IdentifierExpr") {
      throw new Error(
        `[TypeError] Only simple function identifiers can be called`
      );
    }

    const callee = node.callee;

    const fnInfo = this.funcs.get(callee.name);
    if (!fnInfo) {
      throw new Error(`[TypeError] Call to unknown function '${callee.name}'`);
    }

    if (fnInfo.paramTypes.length !== node.args.length) {
      throw new Error(
        `[TypeError] Function '${callee.name}' expects ${fnInfo.paramTypes.length} arguments, got ${node.args.length}`
      );
    }

    node.args.forEach((arg, i) => {
      const argType = this.checkExpression(arg);
      const expected = fnInfo.paramTypes[i];
      if (argType !== expected) {
        throw new Error(
          `[TypeError] Argument ${i + 1} of '${
            callee.name
          }' expects '${expected}', got '${argType}'`
        );
      }
    });

    return fnInfo.returnType;
  }

  private checkAssignExpr(node: AssignExpr): Type {
    const info = this.vars.getOrNull(node.target.name);
    if (!info) {
      // IdentifierExpr와 메시지 다르게 유지 (기존 로직 동일)
      throw new Error(
        `[TypeError] Cannot assign to undeclared variable '${node.target.name}'`
      );
    }

    const valueType = this.checkExpression(node.value);
    if (valueType !== info.type) {
      throw new Error(
        `[TypeError] Cannot assign '${valueType}' to variable '${node.target.name}' of type '${info.type}'`
      );
    }

    return valueType;
  }
}
