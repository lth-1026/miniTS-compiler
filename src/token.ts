export enum TokenType {
  // 키워드
  Let,
  Function,
  If,
  Else,
  While,
  For,
  Return,
  True,
  False,

  // 타입 키워드
  NumberType,
  BooleanType,
  StringType,
  VoidType,

  // 식별자/리터럴
  Identifier,
  NumberLiteral,
  StringLiteral,

  // 연산자
  Plus, // +
  Minus, // -
  Star, // *
  Slash, // /
  Bang, // !
  AndAnd, // &&
  OrOr, // ||
  EqualEqual, // ==
  BangEqual, // !=
  StrictEqual, // ===
  StrictNotEqual, // !==
  Less, // <
  LessEqual, // <=
  Greater, // >
  GreaterEqual, // >=
  Equal, // =

  // 구분자
  LParen, // (
  RParen, // )
  LBrace, // {
  RBrace, // }
  Colon, // :
  Comma, // ,
  Semicolon, // ;

  // EOF
  EOF,
}

export interface Token {
  type: TokenType;
  lexeme: string; // 실제 소스 상 문자열
  line: number; // 1-based
  column: number; // 1-based (해당 토큰 시작 위치)
}

export function tokenTypeToString(type: TokenType): string {
  return TokenType[type]; // enum의 reverse mapping 활용
}
