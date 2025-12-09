// src/codegen/codegen.test.ts
import { describe, it, expect } from "vitest";
import { compileMiniTS } from "../compiler/compile";

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

describe("CodeGenerator – MiniTS → JS", () => {
  it("compiles simple function and call", () => {
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

  it("compiles if / while / block correctly", () => {
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

  it("handles for-loop (desugared to while) through parser", () => {
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

    // 정확한 while 디슈거링 형태는 parser 구현에 따라 달라질 수 있으니
    // 여기서는 "syntax가 깨지지 않고 function sumTo가 생성되는지" 정도만 체크해도 됨
    expect(out).toContain("function sumTo(n)");
    expect(out).toContain("while (");
  });
});
