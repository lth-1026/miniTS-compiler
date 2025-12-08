import { describe, it, expect } from "vitest";
import { Lexer } from "../lexer/lexer";
import { Parser } from "./parser";
import type { Program } from "../ast";

function parseProgram(source: string): Program {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parseProgram();
}

describe("Parser → AST shape coverage", () => {
  it("Program & BlockStmt: empty program", () => {
    const ast = parseProgram("");

    expect(ast.kind).toBe("Program");
    expect(ast.body).toEqual([]);
  });

  it("VarDecl: let x: number = 1;", () => {
    const ast = parseProgram(`let x: number = 1;`);

    expect(ast.body.length).toBe(1);
    const stmt: any = ast.body[0];

    expect(stmt.kind).toBe("VarDecl");
    expect(stmt.name).toBe("x");
    expect(stmt.varType).toBe("number");
    expect(stmt.init.kind).toBe("NumberLiteralExpr");
    expect(stmt.init.value).toBe(1);
  });

  it("FunctionDecl: function add(a: number, b: number): number { return a + b; }", () => {
    const ast = parseProgram(`
      function add(a: number, b: number): number {
        return a + b;
      }
    `);

    const fn: any = ast.body[0];
    expect(fn.kind).toBe("FunctionDecl");
    expect(fn.name).toBe("add");
    expect(fn.params).toEqual([
      { name: "a", paramType: "number" },
      { name: "b", paramType: "number" },
    ]);
    expect(fn.returnType).toBe("number");
    expect(fn.body.kind).toBe("BlockStmt");
  });

  it("IfStmt: if / else", () => {
    const ast = parseProgram(`
      if (x > 0) return x;
      else return -x;
    `);

    const ifStmt: any = ast.body[0];
    expect(ifStmt.kind).toBe("IfStmt");
    expect(ifStmt.test.kind).toBe("BinaryExpr");
    expect(ifStmt.test.operator).toBe(">");
    expect(ifStmt.consequent.kind).toBe("ReturnStmt");
    expect(ifStmt.alternate.kind).toBe("ReturnStmt");
  });

  it("WhileStmt: while (x < 10) { return x; }", () => {
    const ast = parseProgram(`
      while (x < 10) {
        return x;
      }
    `);

    const whileStmt: any = ast.body[0];
    expect(whileStmt.kind).toBe("WhileStmt");
    expect(whileStmt.test.kind).toBe("BinaryExpr");
    expect(whileStmt.test.operator).toBe("<");
    expect(whileStmt.body.kind).toBe("BlockStmt");
  });

  it("ReturnStmt: with and without argument", () => {
    const ast = parseProgram(`
      return;
      return 42;
    `);

    const r1: any = ast.body[0];
    const r2: any = ast.body[1];

    expect(r1.kind).toBe("ReturnStmt");
    expect(r1.argument).toBeNull();

    expect(r2.kind).toBe("ReturnStmt");
    expect(r2.argument.kind).toBe("NumberLiteralExpr");
    expect(r2.argument.value).toBe(42);
  });

  it("ExprStmt + IdentifierExpr: x;", () => {
    const ast = parseProgram(`x;`);

    const stmt: any = ast.body[0];
    expect(stmt.kind).toBe("ExprStmt");
    expect(stmt.expression.kind).toBe("IdentifierExpr");
    expect(stmt.expression.name).toBe("x");
  });

  it("BlockStmt: nested block", () => {
    const ast = parseProgram(`
      {
        let x = 1;
        {
          let y = 2;
        }
      }
    `);

    const block: any = ast.body[0];
    expect(block.kind).toBe("BlockStmt");
    expect(block.body.length).toBe(2);
    expect(block.body[0].kind).toBe("VarDecl");

    const inner = block.body[1];
    expect(inner.kind).toBe("BlockStmt");
    expect(inner.body[0].kind).toBe("VarDecl");
  });

  it("NumberLiteralExpr / StringLiteralExpr / BooleanLiteralExpr", () => {
    const ast = parseProgram(`
      123;
      "hello";
      true;
      false;
    `);

    const [n, s, t, f] = ast.body as any[];

    expect(n.kind).toBe("ExprStmt");
    expect(n.expression.kind).toBe("NumberLiteralExpr");
    expect(n.expression.value).toBe(123);

    expect(s.expression.kind).toBe("StringLiteralExpr");
    expect(s.expression.value).toBe("hello");

    expect(t.expression.kind).toBe("BooleanLiteralExpr");
    expect(t.expression.value).toBe(true);

    expect(f.expression.kind).toBe("BooleanLiteralExpr");
    expect(f.expression.value).toBe(false);
  });

  it("BinaryExpr: arithmetic, comparison, equality, logical", () => {
    const ast = parseProgram(`
      1 + 2;
      a * b;
      x - y / 2;
      i < 10;
      a >= b;
      x == y;
      x === y;
      x != y;
      x !== y;
      a && b;
      a || b;
    `);

    const stmts = ast.body as any[];
    const ops = [
      "+",
      "*",
      "-",
      "<",
      ">=",
      "==",
      "===",
      "!=",
      "!==",
      "&&",
      "||",
    ];

    for (let i = 0; i < ops.length; i++) {
      const exprStmt = stmts[i];
      expect(exprStmt.kind).toBe("ExprStmt");
      expect(exprStmt.expression.kind).toBe("BinaryExpr");
      expect(exprStmt.expression.operator).toBe(ops[i]);
    }
  });

  it("UnaryExpr: !flag, -x", () => {
    const ast = parseProgram(`
      !flag;
      -x;
    `);

    const [notStmt, negStmt] = ast.body as any[];

    expect(notStmt.kind).toBe("ExprStmt");
    expect(notStmt.expression.kind).toBe("UnaryExpr");
    expect(notStmt.expression.operator).toBe("!");
    expect(notStmt.expression.argument.kind).toBe("IdentifierExpr");

    expect(negStmt.kind).toBe("ExprStmt");
    expect(negStmt.expression.kind).toBe("UnaryExpr");
    expect(negStmt.expression.operator).toBe("-");
    expect(negStmt.expression.argument.kind).toBe("IdentifierExpr");
  });

  it("CallExpr: print(1, 2) and nested fn(a + b, g(x))", () => {
    const ast = parseProgram(`
      print(1, 2);
      fn(a + b, g(x));
    `);

    const [pStmt, fnStmt] = ast.body as any[];

    // print(1, 2)
    expect(pStmt.kind).toBe("ExprStmt");
    expect(pStmt.expression.kind).toBe("CallExpr");
    expect(pStmt.expression.callee.kind).toBe("IdentifierExpr");
    expect(pStmt.expression.callee.name).toBe("print");
    expect(pStmt.expression.args.length).toBe(2);
    expect(pStmt.expression.args[0].kind).toBe("NumberLiteralExpr");
    expect(pStmt.expression.args[1].kind).toBe("NumberLiteralExpr");

    // fn(a + b, g(x))
    expect(fnStmt.kind).toBe("ExprStmt");
    const call = fnStmt.expression;
    expect(call.kind).toBe("CallExpr");
    expect(call.callee.kind).toBe("IdentifierExpr");
    expect(call.callee.name).toBe("fn");
    expect(call.args.length).toBe(2);

    // 첫 번째 인자: a + b
    expect(call.args[0].kind).toBe("BinaryExpr");
    expect(call.args[0].operator).toBe("+");

    // 두 번째 인자: g(x)
    expect(call.args[1].kind).toBe("CallExpr");
    expect(call.args[1].callee.kind).toBe("IdentifierExpr");
    expect(call.args[1].callee.name).toBe("g");
  });

  it("for → WhileStmt + BlockStmt desugaring", () => {
    const ast = parseProgram(`
      for (let i: number = 0; i < 3; i = i + 1) {
        print(i);
      }
    `);

    const outer: any = ast.body[0];
    // { let i = 0; while (i < 3) { print(i); i = i + 1; } }

    expect(outer.kind).toBe("BlockStmt");
    expect(outer.body.length).toBe(2);

    const init = outer.body[0];
    const whileStmt = outer.body[1];

    expect(init.kind).toBe("VarDecl");
    expect(init.name).toBe("i");

    expect(whileStmt.kind).toBe("WhileStmt");
    expect(whileStmt.test.kind).toBe("BinaryExpr");
    expect(whileStmt.body.kind).toBe("BlockStmt");

    const whileBody = whileStmt.body;
    expect(whileBody.body.length).toBe(2);
    expect(whileBody.body[0].kind).toBe("ExprStmt"); // print(i)
    expect(whileBody.body[1].kind).toBe("ExprStmt"); // i = i + 1
  });
});
