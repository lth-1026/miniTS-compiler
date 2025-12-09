import { describe, it, expect } from "vitest";
import { Lexer } from "../lexer/lexer";
import { Parser } from "../parser/parser";
import { TypeChecker } from "./typechecker";
import type { Program } from "../ast";

function parse(source: string): Program {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parseProgram();
}

function typecheck(source: string): void {
  const program = parse(source);
  const checker = new TypeChecker();
  checker.checkProgram(program);
}

function expectOk(src: string) {
  expect(() => typecheck(src)).not.toThrow();
}

function expectErr(src: string, msg?: RegExp) {
  if (msg) {
    expect(() => typecheck(src)).toThrowError(msg);
  } else {
    expect(() => typecheck(src)).toThrow();
  }
}

describe("TypeChecker – basic happy paths", () => {
  it("allows simple variable declaration with annotation + initializer", () => {
    const src = `
      let x: number = 42;
      let y: string = "hello";
      let flag: boolean = true;
    `;
    expectOk(src);
  });

  it("allows variable declaration with annotation only (no initializer)", () => {
    const src = `
      let x: number;
      let y: string;
      let flag: boolean;
    `;
    expectOk(src);
  });

  it("infers variable type from initializer when no annotation", () => {
    const src = `
      let x = 10;
      let y = "hi";
      let flag = false;

      x = x + 2;
      y = y + " there";
      flag = !flag;
    `;
    expectOk(src);
  });

  it("allows a simple function with correct params and return type", () => {
    const src = `
      function add(a: number, b: number): number {
        return a + b;
      }

      let result: number = add(1, 2);
    `;
    expectOk(src);
  });

  it("allows if / while with boolean conditions", () => {
    const src = `
      let flag: boolean = true;
      let x: number = 0;

      if (flag) {
        x = x + 1;
      } else {
        x = x + 2;
      }

      while (flag) {
        x = x + 1;
      }
    `;
    expectOk(src);
  });

  it("allows for-loop (desugared to while) with correct types", () => {
    const src = `
      function sumTo(n: number): number {
        let acc: number = 0;

        for (let i: number = 0; i < n; i = i + 1) {
          acc = acc + i;
        }

        return acc;
      }
    `;
    expectOk(src);
  });

  it("allows void function with plain return;", () => {
    const src = `
      function log(x: number): void {
        if (x > 0) {
          return;
        }
        return;
      }
    `;
    expectOk(src);
  });
});

describe("TypeChecker – variables and scopes", () => {
  it("rejects variable redeclaration in same scope", () => {
    const src = `
      let x: number = 1;
      let x: number = 2;
    `;
    expectErr(src, /Variable 'x' already declared/i);
  });

  it("rejects variable with no annotation and no initializer", () => {
    const src = `
      let x;
    `;
    expectErr(src, /has no type annotation and no initializer/i);
  });

  it("rejects mismatched annotation vs initializer type", () => {
    const src = `
      let x: number = "hello";
    `;
    expectErr(src, /expected type 'number' but got 'string'/i);
  });

  it("rejects use of undeclared variable", () => {
    const src = `
      let x: number = 1;
      y = x + 1;
    `;
    expectErr(src, /Undeclared variable 'y'/i);
  });

  it("rejects redeclaration of variable in inner block (no shadowing)", () => {
    const src = `
      let x: number = 1;
      {
        let x: number = 2;
      }
    `;
    expectErr(src, /Variable 'x' already declared/i);
  });
});

describe("TypeChecker – functions and calls", () => {
  it("rejects duplicate function declarations", () => {
    const src = `
      function foo(): void {
        return;
      }
      function foo(): number {
        return 1;
      }
    `;
    expectErr(src, /Duplicate function 'foo'/i);
  });

  it("rejects calling unknown function", () => {
    const src = `
      let x = unknownFn(1, 2);
    `;
    expectErr(src, /Call to unknown function 'unknownFn'/i);
  });

  it("rejects wrong number of arguments", () => {
    const src = `
      function add(a: number, b: number): number {
        return a + b;
      }

      let x = add(1);          // too few
      let y = add(1, 2, 3);    // too many
    `;
    expectErr(src, /expects 2 arguments, got/i);
  });

  it("rejects wrong argument type", () => {
    const src = `
      function add(a: number, b: number): number {
        return a + b;
      }

      let x = add(1, "hi");
    `;
    expectErr(src, /Argument 2 of 'add' expects 'number', got 'string'/i);
  });

  it("rejects 'return' outside of a function", () => {
    const src = `
      return 1;
    `;
    expectErr(src, /'return' used outside of a function/i);
  });

  it("rejects return type mismatch (non-void expected)", () => {
    const src = `
      function foo(): number {
        return "hello";
      }
    `;
    expectErr(src, /must return 'number', got 'string'/i);
  });

  it("rejects 'return;' in non-void function", () => {
    const src = `
      function foo(): number {
        return;
      }
    `;
    expectErr(src, /must return 'number', got 'void'/i);
  });

  it("rejects parameter name conflicting with existing variable in same env", () => {
    const src = `
      let x: number = 1;
      function foo(x: number): number {
        return x;
      }
    `;
    expectErr(src, /Parameter name 'x' conflicts with existing variable/i);
  });
});

describe("TypeChecker – if / while conditions", () => {
  it("rejects non-boolean if condition", () => {
    const src = `
      let x: number = 1;
      if (x) {
        x = x + 1;
      }
    `;
    expectErr(src, /If condition must be boolean/i);
  });

  it("rejects non-boolean while condition", () => {
    const src = `
      let x: number = 1;
      while (x) {
        x = x + 1;
      }
    `;
    expectErr(src, /While condition must be boolean/i);
  });
});

describe("TypeChecker – binary operators", () => {
  it("allows arithmetic operators only on numbers", () => {
    const ok = `
      let a: number = 1;
      let b: number = 2;
      let c = a + b;
      let d = a - b;
      let e = a * b;
      let f = a / b;
    `;
    expectOk(ok);

    const bad = `
      let a: number = 1;
      let s: string = "hi";
      let x = a + s;
    `;
    expectErr(bad, /Operator '\+' requires/i);
  });

  it("allows logical operators only on booleans", () => {
    const ok = `
      let a: boolean = true;
      let b: boolean = false;
      let c = a && b;
      let d = a || b;
    `;
    expectOk(ok);

    const bad = `
      let a: number = 1;
      let b = a && true;
    `;
    expectErr(bad, /requires boolean operands/i);
  });

  it("allows '==' and '!=' between different non-void types", () => {
    const src = `
      let n: number = 1;
      let s: string = "1";
      let b1: boolean = (n == s);
      let b2 = n != s;
    `;
    expectOk(src);
  });

  it("rejects '==' or '!=' involving void (e.g. comparing void values)", () => {
    const src = `
      function log(x: number): void {
        return;
      }

      let b = (log(1) == log(2));
    `;
    expectErr(src, /cannot be applied to 'void'/i);
  });

  it("requires same type for '===' and '!=='", () => {
    const ok = `
      let a: number = 1;
      let b: number = 2;
      let c = (a === b);
      let d = (a !== b);
    `;
    expectOk(ok);

    const bad = `
      let n: number = 1;
      let s: string = "1";
      let c = (n === s);
    `;
    expectErr(bad, /requires operands of the same type/i);
  });

  it("requires number for relational operators <, <=, >, >=", () => {
    const ok = `
      let a: number = 1;
      let b: number = 2;
      let c = a < b;
      let d = a <= b;
      let e = a > b;
      let f = a >= b;
    `;
    expectOk(ok);

    const bad = `
      let s: string = "abc";
      let t: string = "zzz";
      let b = s < t;
    `;
    expectErr(bad, /requires number operands/i);
  });
});

describe("TypeChecker – unary operators", () => {
  it("checks '!' expects boolean", () => {
    const ok = `
      let flag: boolean = true;
      let x = !flag;
    `;
    expectOk(ok);

    const bad = `
      let n: number = 1;
      let x = !n;
    `;
    expectErr(bad, /requires boolean operand/i);
  });

  it("checks unary '-' expects number", () => {
    const ok = `
      let n: number = 1;
      let x = -n;
    `;
    expectOk(ok);

    const bad = `
      let s: string = "hi";
      let x = -s;
    `;
    expectErr(bad, /requires number operand/i);
  });
});

describe("TypeChecker – assignment expressions", () => {
  it("allows assignment when variable exists and types match", () => {
    const src = `
      let x: number = 1;
      x = x + 1;

      let s: string = "hi";
      s = s + " there";
    `;
    expectOk(src);
  });

  it("rejects assignment to undeclared variable", () => {
    const src = `
      x = 10;
    `;
    expectErr(src, /Cannot assign to undeclared variable 'x'/i);
  });

  it("rejects assignment with type mismatch", () => {
    const src = `
      let x: number = 1;
      x = "hi";
    `;
    expectErr(src, /Cannot assign 'string' to variable 'x' of type 'number'/i);
  });
});
