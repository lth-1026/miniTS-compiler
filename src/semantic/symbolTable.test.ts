import { describe, it, expect } from "vitest";
import { VarSymbolTable } from "./symbolTable";

describe("VarSymbolTable", () => {
  it("declares a variable in global scope", () => {
    const st = new VarSymbolTable();
    st.declareVar("x", "number");

    expect(st.resolve("x").type).toBe("number");
  });

  it("throws on duplicate declaration in any scope", () => {
    const st = new VarSymbolTable();
    st.declareVar("x", "number");

    expect(() => st.declareVar("x", "string")).toThrowError(
      /already declared/i
    );
  });

  it("does not allow shadowing in inner scopes", () => {
    const st = new VarSymbolTable();
    st.declareVar("x", "number");

    st.pushScope();
    expect(() => st.declareVar("x", "number")).toThrowError(
      /already declared/i
    );
    st.popScope();
  });

  it("allows lookup into outer scopes", () => {
    const st = new VarSymbolTable();
    st.declareVar("a", "boolean");

    st.pushScope();
    expect(st.resolve("a").type).toBe("boolean");
    st.popScope();
  });

  it("resolve throws error when variable does not exist", () => {
    const st = new VarSymbolTable();

    expect(() => st.resolve("unknownVar")).toThrowError(/undeclared/i);
  });

  it("getOrNull returns null instead of throwing", () => {
    const st = new VarSymbolTable();
    st.declareVar("x", "number");

    expect(st.getOrNull("x")?.type).toBe("number");
    expect(st.getOrNull("y")).toBeNull();
  });

  it("push and pop manage scopes independently", () => {
    const st = new VarSymbolTable();
    st.declareVar("x", "number");

    st.pushScope();
    st.declareVar("y", "string");
    expect(st.resolve("y").type).toBe("string");

    st.popScope();
    expect(() => st.resolve("y")).toThrowError();
  });

  it("cannot pop global scope", () => {
    const st = new VarSymbolTable();
    expect(() => st.popScope()).toThrowError(/Cannot pop global/);
  });
});
