// src/compiler/compile.test.ts
import { describe, it, expect } from "vitest";
import { compileMiniTS } from "./compile";

// 공백/줄바꿈 차이를 줄이기 위한 helper
function normalize(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

describe("compileMiniTS – end-to-end pipeline", () => {
  it("compiles a simple function and call", () => {
    const src = `
      function add(a: number, b: number): number {
        let x: number = a + b;
        return x;
      }

      let result: number = add(1, 2);
    `;

    const out = compileMiniTS(src);

    const expected = `
      function add(a, b) {
        let x = (a + b);
        return x;
      }
      let result = add(1, 2);
    `;

    expect(normalize(out)).toBe(normalize(expected));
  });

  it("compiles if / else / while with blocks", () => {
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

    const out = compileMiniTS(src);

    const expected = `
      let flag = true;
      let x = 0;

      if (flag) {
        x = (x + 1);
      } else {
        x = (x + 2);
      }

      while (flag) {
        x = (x + 1);
      }
    `;

    expect(normalize(out)).toBe(normalize(expected));
  });

  it("compiles for-loop via parser desugaring to while", () => {
    const src = `
      function sumTo(n: number): number {
        let acc: number = 0;

        for (let i: number = 0; i < n; i = i + 1) {
          acc = acc + i;
        }

        return acc;
      }
    `;

    const out = compileMiniTS(src);

    // 정확한 while 블록 구조까지 딱 맞추기보다는,
    // 1) sumTo 함수가 있고
    // 2) while (...) 이 존재하는지만 확인해도 충분
    expect(out).toContain("function sumTo(n)");
    expect(out).toContain("while (");
    expect(out).toContain("acc = (acc + i);");
  });

  it("throws on type error (e.g. assigning string to number)", () => {
    const src = `
      let x: number = 1;
      x = "hello";
    `;

    expect(() => compileMiniTS(src)).toThrowError(/\[TypeError]/i);
  });

  it("throws on type error in function call (argument type mismatch)", () => {
    const src = `
      function inc(x: number): number {
        return x + 1;
      }

      let msg: string = "hi";
      let y: number = inc(msg);
    `;

    expect(() => compileMiniTS(src)).toThrowError(/\[TypeError]/i);
  });

  it("throws on parse error for invalid syntax", () => {
    const src = `
      let x: number = 1
    `;

    // Parser가 [ParseError] 를 던지도록 구현되어 있다면 이렇게 체크
    expect(() => compileMiniTS(src)).toThrowError(/\[ParseError]/i);
  });

  it("throws on lexer error (unexpected character)", () => {
    const src = `
      let x: number = 1;
      // 렉서가 알 수 없는 문자 사용
      @@@
    `;

    // Lexer에서 바로 에러가 발생해야 함
    expect(() => compileMiniTS(src)).toThrowError(/Unexpected character/i);
  });
});
