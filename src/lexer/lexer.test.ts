import { describe, it, expect } from "vitest";
import { TokenType } from "../token";
import { Lexer } from "./lexer";

function typesOf(src: string) {
  const lexer = new Lexer(src);
  const tokens = lexer.tokenize();
  return tokens.map((t) => t.type);
}

describe("Lexer", () => {
  it("토큰: let 변수 선언 기본 패턴", () => {
    const src = `let x: number = 10;`;
    const types = typesOf(src);

    expect(types).toEqual([
      TokenType.Let,
      TokenType.Identifier,
      TokenType.Colon,
      TokenType.NumberType,
      TokenType.Equal,
      TokenType.NumberLiteral,
      TokenType.Semicolon,
      TokenType.EOF,
    ]);
  });

  it("if / else + 비교/논리 연산자", () => {
    const src = `
      if (x > 10 && y <= 5) {
        return true;
      } else {
        return false;
      }
    `;
    const types = typesOf(src);

    expect(types).toEqual([
      TokenType.If,
      TokenType.LParen,
      TokenType.Identifier,
      TokenType.Greater,
      TokenType.NumberLiteral,
      TokenType.AndAnd,
      TokenType.Identifier,
      TokenType.LessEqual,
      TokenType.NumberLiteral,
      TokenType.RParen,
      TokenType.LBrace,
      TokenType.Return,
      TokenType.True,
      TokenType.Semicolon,
      TokenType.RBrace,
      TokenType.Else,
      TokenType.LBrace,
      TokenType.Return,
      TokenType.False,
      TokenType.Semicolon,
      TokenType.RBrace,
      TokenType.EOF,
    ]);
  });

  it("문자열 리터럴과 이스케이프 처리", () => {
    const src = `let msg: string = "hello\\n\\"world\\"";`;
    const lexer = new Lexer(src);
    const tokens = lexer.tokenize();

    const strToken = tokens.find((t) => t.type === TokenType.StringLiteral);
    expect(strToken).toBeDefined();
    // 원본 소스에서의 lexeme 그대로인지 정도만 검증
    expect(strToken!.lexeme).toBe(`"hello\\n\\"world\\""`);
  });

  it("블록 주석 스킵", () => {
    const src = `
      /* 주석 안에 let a = 1; */
      let x: number = 2;
    `;
    const types = typesOf(src);

    expect(types).toEqual([
      TokenType.Let,
      TokenType.Identifier,
      TokenType.Colon,
      TokenType.NumberType,
      TokenType.Equal,
      TokenType.NumberLiteral,
      TokenType.Semicolon,
      TokenType.EOF,
    ]);
  });

  it("잘못된 문자에 대해 에러 발생", () => {
    const src = `let x: number = 10 @ 20;`;

    expect(() => new Lexer(src).tokenize()).toThrowError(
      /Unexpected character '@'/
    );
  });

  it("for 루프 헤더 토큰화", () => {
    const src = `
      for (let i: number = 0; i < 10; i = i + 1) {
        return i;
      }
    `;
    const types = typesOf(src);

    expect(types).toEqual([
      TokenType.For,
      TokenType.LParen,

      TokenType.Let,
      TokenType.Identifier, // i
      TokenType.Colon,
      TokenType.NumberType,
      TokenType.Equal,
      TokenType.NumberLiteral, // 0
      TokenType.Semicolon,

      TokenType.Identifier, // i
      TokenType.Less,
      TokenType.NumberLiteral, // 10
      TokenType.Semicolon,

      TokenType.Identifier, // i
      TokenType.Equal,
      TokenType.Identifier, // i
      TokenType.Plus,
      TokenType.NumberLiteral, // 1

      TokenType.RParen,
      TokenType.LBrace,

      TokenType.Return,
      TokenType.Identifier,
      TokenType.Semicolon,

      TokenType.RBrace,
      TokenType.EOF,
    ]);
  });

  it("for 키워드와 for로 시작하는 식별자 구분", () => {
    const src = `
      for (let forCount: number = 0; forCount < 3; forCount = forCount + 1) {}
      let forVar = 1;
    `;
    const lexer = new Lexer(src);
    const tokens = lexer.tokenize();

    const forKeyword = tokens.find((t) => t.lexeme === "for");
    const forCountIdent = tokens.find((t) => t.lexeme === "forCount");
    const forVarIdent = tokens.find((t) => t.lexeme === "forVar");

    expect(forKeyword?.type).toBe(TokenType.For);
    expect(forCountIdent?.type).toBe(TokenType.Identifier);
    expect(forVarIdent?.type).toBe(TokenType.Identifier);
  });

  it("숫자 리터럴: 정수와 실수 처리", () => {
    const src = `
      let a: number = 42;
      let b: number = 3.14;
    `;
    const lexer = new Lexer(src);
    const tokens = lexer.tokenize();

    const numberLits = tokens.filter((t) => t.type === TokenType.NumberLiteral);
    expect(numberLits.length).toBe(2);
    expect(numberLits[0].lexeme).toBe("42");
    expect(numberLits[1].lexeme).toBe("3.14");
  });

  it("키워드와 식별자 구분", () => {
    const src = `
      let ifVar = true;
      let numberType = number;
      let foo_1 = false;
    `;
    const lexer = new Lexer(src);
    const tokens = lexer.tokenize();

    // ifVar, numberType, foo_1 는 Identifier
    const ifVar = tokens.find((t) => t.lexeme === "ifVar");
    const numberTypeVar = tokens.find((t) => t.lexeme === "numberType");
    const foo1 = tokens.find((t) => t.lexeme === "foo_1");

    expect(ifVar?.type).toBe(TokenType.Identifier);
    expect(numberTypeVar?.type).toBe(TokenType.Identifier);
    expect(foo1?.type).toBe(TokenType.Identifier);

    // true, false, number 는 각각 True, False, NumberType 키워드
    const trueTok = tokens.find((t) => t.lexeme === "true");
    const falseTok = tokens.find((t) => t.lexeme === "false");
    const numberKeyword = tokens.find(
      (t) => t.lexeme === "number" && t.type === TokenType.NumberType
    );

    expect(trueTok?.type).toBe(TokenType.True);
    expect(falseTok?.type).toBe(TokenType.False);
    expect(numberKeyword?.type).toBe(TokenType.NumberType);
  });

  it("복합 연산자 토큰화 (==, ===, !=, !==, <=, >=, &&, ||)", () => {
    const src = `
    x == 1;
    x === 5;
    x != 2;
    x !== 6;
    x <= 3;
    x >= 4;
    a && b;
    a || b;
  `;
    const types = typesOf(src);

    expect(types).toEqual([
      // x == 1;
      TokenType.Identifier,
      TokenType.EqualEqual,
      TokenType.NumberLiteral,
      TokenType.Semicolon,

      // x === 5;
      TokenType.Identifier,
      TokenType.StrictEqual,
      TokenType.NumberLiteral,
      TokenType.Semicolon,

      // x != 2;
      TokenType.Identifier,
      TokenType.BangEqual,
      TokenType.NumberLiteral,
      TokenType.Semicolon,

      // x !== 6;
      TokenType.Identifier,
      TokenType.StrictNotEqual,
      TokenType.NumberLiteral,
      TokenType.Semicolon,

      // x <= 3;
      TokenType.Identifier,
      TokenType.LessEqual,
      TokenType.NumberLiteral,
      TokenType.Semicolon,

      // x >= 4;
      TokenType.Identifier,
      TokenType.GreaterEqual,
      TokenType.NumberLiteral,
      TokenType.Semicolon,

      // a && b;
      TokenType.Identifier,
      TokenType.AndAnd,
      TokenType.Identifier,
      TokenType.Semicolon,

      // a || b;
      TokenType.Identifier,
      TokenType.OrOr,
      TokenType.Identifier,
      TokenType.Semicolon,

      TokenType.EOF,
    ]);
  });

  it("미완성 문자열 리터럴 에러", () => {
    const src = `let s: string = "hello`;
    expect(() => new Lexer(src).tokenize()).toThrowError(
      /Unterminated string literal/
    );
  });

  it("미완성 블록 주석 에러", () => {
    const src = `
      /* 주석 시작
      let x = 1;
    `;
    expect(() => new Lexer(src).tokenize()).toThrowError(
      /Unterminated block comment/
    );
  });
});
