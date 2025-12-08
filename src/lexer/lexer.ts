import { Token, TokenType } from "../token";

export class Lexer {
  private source: string;
  private pos = 0; // 현재 인덱스
  private line = 1;
  private column = 1;

  private tokens: Token[] = [];

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      const ch = this.peek();

      // 공백
      if (this.isWhitespace(ch)) {
        this.skipWhitespace();
        continue;
      }

      // 주석
      if (ch === "/" && this.peekNext() === "/") {
        this.skipLineComment();
        continue;
      }
      if (ch === "/" && this.peekNext() === "*") {
        this.skipBlockComment();
        continue;
      }

      // 숫자
      if (this.isDigit(ch)) {
        this.tokens.push(this.number());
        continue;
      }

      // 식별자 or 키워드 or 타입 키워드
      if (this.isLetter(ch) || ch === "_") {
        this.tokens.push(this.identifierOrKeyword());
        continue;
      }

      // 문자열
      if (ch === '"') {
        this.tokens.push(this.stringLiteral());
        continue;
      }

      // 연산자/구분자
      this.tokens.push(this.operatorOrPunct());
    }

    // EOF
    this.tokens.push({
      type: TokenType.EOF,
      lexeme: "",
      line: this.line,
      column: this.column,
    });

    return this.tokens;
  }

  // ─────────────────────────────
  // 기본 유틸
  // ─────────────────────────────

  private isAtEnd(): boolean {
    return this.pos >= this.source.length;
  }

  private peek(): string {
    return this.source[this.pos] ?? "\0";
  }

  private peekNext(): string {
    return this.source[this.pos + 1] ?? "\0";
  }

  private advance(): string {
    const ch = this.source[this.pos++];
    if (ch === "\n") {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return ch;
  }

  private isWhitespace(ch: string): boolean {
    return ch === " " || ch === "\t" || ch === "\r" || ch === "\n";
  }

  private isDigit(ch: string): boolean {
    return ch >= "0" && ch <= "9";
  }

  private isLetter(ch: string): boolean {
    return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z");
  }

  // ─────────────────────────────
  // 공백/주석 스킵
  // ─────────────────────────────

  private skipWhitespace(): void {
    while (!this.isAtEnd() && this.isWhitespace(this.peek())) {
      this.advance();
    }
  }

  private skipLineComment(): void {
    // // ~ \n
    while (!this.isAtEnd() && this.peek() !== "\n") {
      this.advance();
    }
  }

  private skipBlockComment(): void {
    // /* ... */ 패턴
    this.advance(); // '/'
    this.advance(); // '*'

    while (!this.isAtEnd()) {
      if (this.peek() === "*" && this.peekNext() === "/") {
        this.advance(); // '*'
        this.advance(); // '/'
        return;
      }
      this.advance();
    }

    throw new Error(
      `Unterminated block comment at line ${this.line}, column ${this.column}`
    );
  }

  // ─────────────────────────────
  // 숫자 리터럴
  // ─────────────────────────────

  private number(): Token {
    const startPos = this.pos;
    const startCol = this.column;

    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      this.advance();
    }

    // 소수 지원
    if (
      !this.isAtEnd() &&
      this.peek() === "." &&
      this.isDigit(this.peekNext())
    ) {
      this.advance(); // '.'
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        this.advance();
      }
    }

    const lexeme = this.source.slice(startPos, this.pos);
    return {
      type: TokenType.NumberLiteral,
      lexeme,
      line: this.line,
      column: startCol,
    };
  }

  // ─────────────────────────────
  // 식별자 / 키워드 / 타입 키워드
  // ─────────────────────────────

  private identifierOrKeyword(): Token {
    const startPos = this.pos;
    const startCol = this.column;

    while (
      !this.isAtEnd() &&
      (this.isLetter(this.peek()) ||
        this.isDigit(this.peek()) ||
        this.peek() === "_")
    ) {
      this.advance();
    }

    const lexeme = this.source.slice(startPos, this.pos);
    const type = this.keywordTokenType(lexeme);

    return {
      type,
      lexeme,
      line: this.line,
      column: startCol,
    };
  }

  private keywordTokenType(lexeme: string): TokenType {
    switch (lexeme) {
      case "let":
        return TokenType.Let;
      case "function":
        return TokenType.Function;
      case "if":
        return TokenType.If;
      case "else":
        return TokenType.Else;
      case "while":
        return TokenType.While;
      case "for":
        return TokenType.For;
      case "return":
        return TokenType.Return;
      case "true":
        return TokenType.True;
      case "false":
        return TokenType.False;
      case "number":
        return TokenType.NumberType;
      case "boolean":
        return TokenType.BooleanType;
      case "string":
        return TokenType.StringType;
      case "void":
        return TokenType.VoidType;
      default:
        return TokenType.Identifier;
    }
  }

  // ─────────────────────────────
  // 문자열 리터럴
  // ─────────────────────────────

  private stringLiteral(): Token {
    const startCol = this.column;
    const startPos = this.pos;

    this.advance(); // opening "

    let value = "";
    while (!this.isAtEnd() && this.peek() !== '"') {
      const ch = this.advance();
      if (ch === "\\") {
        const next = this.advance();
        switch (next) {
          case "n":
            value += "\n";
            break;
          case "t":
            value += "\t";
            break;
          case '"':
            value += '"';
            break;
          case "\\":
            value += "\\";
            break;
          default:
            value += next;
            break;
        }
      } else {
        value += ch;
      }
    }

    if (this.isAtEnd()) {
      throw new Error(
        `Unterminated string literal at line ${this.line}, column ${this.column}`
      );
    }

    this.advance(); // closing "

    const rawLexeme = this.source.slice(startPos, this.pos);
    return {
      type: TokenType.StringLiteral,
      lexeme: rawLexeme, // 또는 value만 저장해도 됨 (디자인 선택)
      line: this.line,
      column: startCol,
    };
  }

  // ─────────────────────────────
  // 연산자 / 구분자
  // ─────────────────────────────

  private operatorOrPunct(): Token {
    const ch = this.peek();
    const startCol = this.column;

    const make = (type: TokenType, text: string): Token => {
      for (let i = 0; i < text.length; i++) {
        this.advance();
      }
      return {
        type,
        lexeme: text,
        line: this.line,
        column: startCol,
      };
    };

    switch (ch) {
      case "+":
        return make(TokenType.Plus, "+");
      case "-":
        return make(TokenType.Minus, "-");
      case "*":
        return make(TokenType.Star, "*");
      case "/":
        // 주석은 이미 위에서 처리
        return make(TokenType.Slash, "/");
      case "=": {
        const next = this.peekNext();
        const next2 = this.source[this.pos + 2] ?? "\0";

        // ===
        if (next === "=" && next2 === "=") {
          return make(TokenType.StrictEqual, "===");
        }
        // ==
        if (next === "=") {
          return make(TokenType.EqualEqual, "==");
        }
        // =
        return make(TokenType.Equal, "=");
      }
      case "!": {
        const next = this.peekNext();
        const next2 = this.source[this.pos + 2] ?? "\0";

        // !==
        if (next === "=" && next2 === "=") {
          return make(TokenType.StrictNotEqual, "!==");
        }
        // !=
        if (next === "=") {
          return make(TokenType.BangEqual, "!=");
        }
        // !
        return make(TokenType.Bang, "!");
      }
      case "<":
        if (this.peekNext() === "=") {
          return make(TokenType.LessEqual, "<=");
        }
        return make(TokenType.Less, "<");
      case ">":
        if (this.peekNext() === "=") {
          return make(TokenType.GreaterEqual, ">=");
        }
        return make(TokenType.Greater, ">");
      case "&":
        if (this.peekNext() === "&") {
          return make(TokenType.AndAnd, "&&");
        }
        break;
      case "|":
        if (this.peekNext() === "||".charAt(1)) {
          // 그냥 == '|'로 해도 됨
          return make(TokenType.OrOr, "||");
        }
        break;
      case "(":
        return make(TokenType.LParen, "(");
      case ")":
        return make(TokenType.RParen, ")");
      case "{":
        return make(TokenType.LBrace, "{");
      case "}":
        return make(TokenType.RBrace, "}");
      case ":":
        return make(TokenType.Colon, ":");
      case ",":
        return make(TokenType.Comma, ",");
      case ";":
        return make(TokenType.Semicolon, ";");
    }

    throw new Error(
      `Unexpected character '${ch}' at line ${this.line}, column ${this.column}`
    );
  }
}
