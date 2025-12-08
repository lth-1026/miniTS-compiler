import { Token, TokenType } from "../token";
import {
  Program,
  Statement,
  Expression,
  TypeAnnotation,
  VarDecl,
  BlockStmt,
  Param,
  BinaryOperator,
  UnaryOperator,
  IdentifierExpr,
  NumberLiteralExpr,
  StringLiteralExpr,
  BooleanLiteralExpr,
  CallExpr,
  WhileStmt,
} from "../ast";

export class Parser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  // ─────────────────────────
  // entry point
  // ─────────────────────────

  parseProgram(): Program {
    const body: Statement[] = [];

    while (!this.isAtEnd()) {
      body.push(this.declaration());
    }

    return {
      kind: "Program",
      body,
    };
  }

  // ─────────────────────────
  // 기본 헬퍼
  // ─────────────────────────

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private match(...types: TokenType[]): boolean {
    for (const t of types) {
      if (this.check(t)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    const token = this.peek();
    throw new Error(
      `[ParseError] ${message} at line ${token.line}, column ${
        token.column
      }. Got: ${TokenType[token.type]} (${token.lexeme})`
    );
  }

  // ─────────────────────────
  // Declaration 레벨
  //
  // program → (functionDecl | varDecl | statement)*
  // ─────────────────────────

  private declaration(): Statement {
    if (this.match(TokenType.Function)) {
      return this.functionDeclaration();
    }
    if (this.match(TokenType.Let)) {
      return this.varDeclaration();
    }
    return this.statement();
  }

  private varDeclaration(): VarDecl {
    const nameTok = this.consume(
      TokenType.Identifier,
      "Expected variable name after 'let'"
    );

    let varType: TypeAnnotation | null = null;
    if (this.match(TokenType.Colon)) {
      varType = this.parseTypeAnnotation();
    }

    let init: Expression | null = null;
    if (this.match(TokenType.Equal)) {
      init = this.expression();
    }

    this.consume(
      TokenType.Semicolon,
      "Expected ';' after variable declaration"
    );

    return {
      kind: "VarDecl",
      name: nameTok.lexeme,
      varType,
      init,
    };
  }

  private functionDeclaration(): Statement {
    const nameTok = this.consume(
      TokenType.Identifier,
      "Expected function name after 'function'"
    );

    this.consume(TokenType.LParen, "Expected '(' after function name");
    const params: Param[] = [];
    if (!this.check(TokenType.RParen)) {
      do {
        const paramName = this.consume(
          TokenType.Identifier,
          "Expected parameter name"
        );
        this.consume(
          TokenType.Colon,
          "Expected ':' after parameter name in function parameter"
        );
        const paramType = this.parseTypeAnnotation();
        params.push({
          name: paramName.lexeme,
          paramType,
        });
      } while (this.match(TokenType.Comma));
    }
    this.consume(TokenType.RParen, "Expected ')' after parameters");

    this.consume(TokenType.Colon, "Expected ':' before function return type");
    const returnType = this.parseTypeAnnotation();

    this.consume(TokenType.LBrace, "Expected '{' before function body");

    const body = this.blockStatement(); // function body는 항상 block

    return {
      kind: "FunctionDecl",
      name: nameTok.lexeme,
      params,
      returnType,
      body,
    };
  }

  private parseTypeAnnotation(): TypeAnnotation {
    const tok = this.peek();
    switch (tok.type) {
      case TokenType.NumberType:
        this.advance();
        return "number";
      case TokenType.BooleanType:
        this.advance();
        return "boolean";
      case TokenType.StringType:
        this.advance();
        return "string";
      case TokenType.VoidType:
        this.advance();
        return "void";
      default:
        throw new Error(
          `[ParseError] Expected type annotation (number | boolean | string | void) at line ${
            tok.line
          }, column ${tok.column}, got ${TokenType[tok.type]} (${tok.lexeme})`
        );
    }
  }

  // ─────────────────────────
  // Statements
  // ─────────────────────────

  private statement(): Statement {
    if (this.match(TokenType.If)) return this.ifStatement();
    if (this.match(TokenType.While)) return this.whileStatement();
    if (this.match(TokenType.For)) return this.forStatement(); // 🔥 for 추가
    if (this.match(TokenType.Return)) return this.returnStatement();
    if (this.match(TokenType.LBrace)) return this.blockStatement();
    return this.expressionStatement();
  }

  private blockStatement(): BlockStmt {
    const body: Statement[] = [];

    while (!this.check(TokenType.RBrace) && !this.isAtEnd()) {
      body.push(this.declaration());
    }

    this.consume(TokenType.RBrace, "Expected '}' after block");
    return {
      kind: "BlockStmt",
      body,
    };
  }

  private ifStatement(): Statement {
    this.consume(TokenType.LParen, "Expected '(' after 'if'");
    const test = this.expression();
    this.consume(TokenType.RParen, "Expected ')' after if condition");

    const consequent = this.statement();
    let alternate: Statement | null = null;

    if (this.match(TokenType.Else)) {
      alternate = this.statement();
    }

    return {
      kind: "IfStmt",
      test,
      consequent,
      alternate,
    };
  }

  private whileStatement(): WhileStmt {
    this.consume(TokenType.LParen, "Expected '(' after 'while'");
    const test = this.expression();
    this.consume(TokenType.RParen, "Expected ')' after while condition");

    const body = this.statement();

    return {
      kind: "WhileStmt",
      test,
      body,
    };
  }

  /**
   * for (init; cond; step) stmt
   *
   * 파서 단계에서 바로 아래와 같이 desugar:
   *
   *   init;
   *   while (cond) {
   *     stmt;
   *     step;
   *   }
   *
   * cond가 없으면 true, init/step이 없으면 생략.
   */
  private forStatement(): Statement {
    this.consume(TokenType.LParen, "Expected '(' after 'for'");

    // --- init 부분: let 선언 또는 표현식 또는 비어있음 ---
    let init: Statement | null = null;
    if (!this.check(TokenType.Semicolon)) {
      if (this.match(TokenType.Let)) {
        // for 헤더 안에서만 쓰는 간단한 varDecl (세미콜론은 바로 아래에서 소비)
        const nameTok = this.consume(
          TokenType.Identifier,
          "Expected variable name in for-init"
        );

        let varType: TypeAnnotation | null = null;
        if (this.match(TokenType.Colon)) {
          varType = this.parseTypeAnnotation();
        }

        let initExpr: Expression | null = null;
        if (this.match(TokenType.Equal)) {
          initExpr = this.expression();
        }

        init = {
          kind: "VarDecl",
          name: nameTok.lexeme,
          varType,
          init: initExpr,
        };
      } else {
        const expr = this.expression();
        init = {
          kind: "ExprStmt",
          expression: expr,
        };
      }
    }
    this.consume(
      TokenType.Semicolon,
      "Expected ';' after for-loop initializer"
    );

    // --- condition 부분: 없으면 true ---
    let testExpr: Expression | null = null;
    if (!this.check(TokenType.Semicolon)) {
      testExpr = this.expression();
    }
    this.consume(TokenType.Semicolon, "Expected ';' after for-loop condition");

    // --- step/update 부분: 없을 수도 있음 ---
    let updateExpr: Expression | null = null;
    if (!this.check(TokenType.RParen)) {
      updateExpr = this.expression();
    }
    this.consume(TokenType.RParen, "Expected ')' after for-loop header");

    const bodyStmt = this.statement(); // 원래 for의 body

    // --- while로 desugar ---

    // cond 없으면 true
    const test: Expression =
      testExpr ??
      ({
        kind: "BooleanLiteralExpr",
        value: true,
      } as BooleanLiteralExpr);

    // body를 BlockStmt로 감싸기
    const bodyBlock: BlockStmt =
      bodyStmt.kind === "BlockStmt"
        ? { kind: "BlockStmt", body: [...bodyStmt.body] }
        : { kind: "BlockStmt", body: [bodyStmt] };

    // step이 있으면 마지막에 expr stmt로 추가
    if (updateExpr) {
      bodyBlock.body.push({
        kind: "ExprStmt",
        expression: updateExpr,
      });
    }

    const whileStmt: WhileStmt = {
      kind: "WhileStmt",
      test,
      body: bodyBlock,
    };

    // init이 있으면 { init; while (...) } 형태의 BlockStmt로 감쌈
    if (init) {
      return {
        kind: "BlockStmt",
        body: [init, whileStmt],
      };
    }

    return whileStmt;
  }

  private returnStatement(): Statement {
    if (this.check(TokenType.Semicolon)) {
      this.advance(); // ';'
      return {
        kind: "ReturnStmt",
        argument: null,
      };
    }
    const argument = this.expression();
    this.consume(TokenType.Semicolon, "Expected ';' after return value");
    return {
      kind: "ReturnStmt",
      argument,
    };
  }

  private expressionStatement(): Statement {
    const expr = this.expression();
    this.consume(TokenType.Semicolon, "Expected ';' after expression");
    return {
      kind: "ExprStmt",
      expression: expr,
    };
  }

  // ─────────────────────────
  // Expressions (우선순위 계층)
  //
  // expression    → assignment
  // assignment    → Identifier '=' assignment | logicalOr
  // logicalOr     → logicalAnd ( "||" logicalAnd )*
  // logicalAnd    → equality   ( "&&" equality )*
  // equality      → comparison ( (== | === | != | !==) comparison )*
  // comparison    → term       ( (< | <= | > | >=) term )*
  // term          → factor     ( ("+" | "-") factor )*
  // factor        → unary      ( ("*" | "/") unary )*
  // unary         → ("!" | "-") unary | call
  // call          → primary ( "(" args? ")" )*
  // primary       → literal | identifier | "(" expression ")"
  // ─────────────────────────

  private expression(): Expression {
    return this.assignment();
  }

  private assignment(): Expression {
    const expr = this.logicalOr();

    // assignment: IdentifierExpr '=' assignment
    if (this.match(TokenType.Equal)) {
      const equals = this.previous();

      if (expr.kind !== "IdentifierExpr") {
        throw new Error(
          `[ParseError] Invalid assignment target at line ${equals.line}, column ${equals.column}`
        );
      }

      const value = this.assignment(); // 우결합으로 a = b = 3 같은 것도 처리 가능
      return {
        kind: "AssignExpr",
        target: expr,
        value,
      };
    }

    return expr;
  }

  private logicalOr(): Expression {
    let expr = this.logicalAnd();
    while (this.match(TokenType.OrOr)) {
      const operator: BinaryOperator = "||";
      const right = this.logicalAnd();
      expr = {
        kind: "BinaryExpr",
        operator,
        left: expr,
        right,
      };
    }
    return expr;
  }

  private logicalAnd(): Expression {
    let expr = this.equality();
    while (this.match(TokenType.AndAnd)) {
      const operator: BinaryOperator = "&&";
      const right = this.equality();
      expr = {
        kind: "BinaryExpr",
        operator,
        left: expr,
        right,
      };
    }
    return expr;
  }

  private equality(): Expression {
    let expr = this.comparison();

    while (true) {
      if (this.match(TokenType.EqualEqual)) {
        const right = this.comparison();
        expr = {
          kind: "BinaryExpr",
          operator: "==",
          left: expr,
          right,
        };
      } else if (this.match(TokenType.StrictEqual)) {
        const right = this.comparison();
        expr = {
          kind: "BinaryExpr",
          operator: "===",
          left: expr,
          right,
        };
      } else if (this.match(TokenType.BangEqual)) {
        const right = this.comparison();
        expr = {
          kind: "BinaryExpr",
          operator: "!=",
          left: expr,
          right,
        };
      } else if (this.match(TokenType.StrictNotEqual)) {
        const right = this.comparison();
        expr = {
          kind: "BinaryExpr",
          operator: "!==",
          left: expr,
          right,
        };
      } else {
        break;
      }
    }

    return expr;
  }

  private comparison(): Expression {
    let expr = this.term();

    while (true) {
      if (this.match(TokenType.Less)) {
        const right = this.term();
        expr = {
          kind: "BinaryExpr",
          operator: "<",
          left: expr,
          right,
        };
      } else if (this.match(TokenType.LessEqual)) {
        const right = this.term();
        expr = {
          kind: "BinaryExpr",
          operator: "<=",
          left: expr,
          right,
        };
      } else if (this.match(TokenType.Greater)) {
        const right = this.term();
        expr = {
          kind: "BinaryExpr",
          operator: ">",
          left: expr,
          right,
        };
      } else if (this.match(TokenType.GreaterEqual)) {
        const right = this.term();
        expr = {
          kind: "BinaryExpr",
          operator: ">=",
          left: expr,
          right,
        };
      } else {
        break;
      }
    }

    return expr;
  }

  private term(): Expression {
    let expr = this.factor();

    while (true) {
      if (this.match(TokenType.Plus)) {
        const right = this.factor();
        expr = {
          kind: "BinaryExpr",
          operator: "+",
          left: expr,
          right,
        };
      } else if (this.match(TokenType.Minus)) {
        const right = this.factor();
        expr = {
          kind: "BinaryExpr",
          operator: "-",
          left: expr,
          right,
        };
      } else {
        break;
      }
    }

    return expr;
  }

  private factor(): Expression {
    let expr = this.unary();

    while (true) {
      if (this.match(TokenType.Star)) {
        const right = this.unary();
        expr = {
          kind: "BinaryExpr",
          operator: "*",
          left: expr,
          right,
        };
      } else if (this.match(TokenType.Slash)) {
        const right = this.unary();
        expr = {
          kind: "BinaryExpr",
          operator: "/",
          left: expr,
          right,
        };
      } else {
        break;
      }
    }

    return expr;
  }

  private unary(): Expression {
    if (this.match(TokenType.Bang)) {
      const operator: UnaryOperator = "!";
      const argument = this.unary();
      return {
        kind: "UnaryExpr",
        operator,
        argument,
      };
    }
    if (this.match(TokenType.Minus)) {
      const operator: UnaryOperator = "-";
      const argument = this.unary();
      return {
        kind: "UnaryExpr",
        operator,
        argument,
      };
    }
    return this.call();
  }

  private call(): Expression {
    let expr = this.primary();

    while (true) {
      if (this.match(TokenType.LParen)) {
        const args: Expression[] = [];
        if (!this.check(TokenType.RParen)) {
          do {
            args.push(this.expression());
          } while (this.match(TokenType.Comma));
        }
        this.consume(TokenType.RParen, "Expected ')' after arguments");

        const callExpr: CallExpr = {
          kind: "CallExpr",
          callee: expr,
          args,
        };
        expr = callExpr;
      } else {
        break;
      }
    }

    return expr;
  }

  private primary(): Expression {
    const tok = this.peek();

    if (this.match(TokenType.NumberLiteral)) {
      const value = Number(tok.lexeme);
      const node: NumberLiteralExpr = {
        kind: "NumberLiteralExpr",
        value,
      };
      return node;
    }

    if (this.match(TokenType.StringLiteral)) {
      const raw = tok.lexeme;
      const inner =
        raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')
          ? raw.slice(1, -1)
          : raw;
      const node: StringLiteralExpr = {
        kind: "StringLiteralExpr",
        value: inner,
      };
      return node;
    }

    if (this.match(TokenType.True)) {
      const node: BooleanLiteralExpr = {
        kind: "BooleanLiteralExpr",
        value: true,
      };
      return node;
    }

    if (this.match(TokenType.False)) {
      const node: BooleanLiteralExpr = {
        kind: "BooleanLiteralExpr",
        value: false,
      };
      return node;
    }

    if (this.match(TokenType.Identifier)) {
      const node: IdentifierExpr = {
        kind: "IdentifierExpr",
        name: tok.lexeme,
      };
      return node;
    }

    if (this.match(TokenType.LParen)) {
      const expr = this.expression();
      this.consume(TokenType.RParen, "Expected ')' after expression");
      return expr;
    }

    throw new Error(
      `[ParseError] Expected expression at line ${tok.line}, column ${
        tok.column
      }, got ${TokenType[tok.type]} (${tok.lexeme})`
    );
  }
}
