import { Type } from "./types";

export interface VarInfo {
  type: Type;
}

/**
 * VarSymbolTable
 * - 스코프 스택 기반 변수 심볼 테이블
 * - 가장 바깥(0번)이 전역 스코프, pushScope/popScope로 블록/함수 스코프 관리
 */
export class VarSymbolTable {
  private scopes: Map<string, VarInfo>[];

  constructor() {
    // 전역 스코프 하나로 시작
    this.scopes = [new Map()];
  }

  /** 새 스코프 진입 (블록 / 함수 등) */
  pushScope(): void {
    this.scopes.push(new Map());
  }

  /** 스코프 종료 */
  popScope(): void {
    if (this.scopes.length === 1) {
      throw new Error("[InternalError] Cannot pop global scope");
    }
    this.scopes.pop();
  }

  /** 현재까지의 모든 스코프에서 name이 이미 선언되었는지 확인 (shadowing 방지) */
  hasInAnyScope(name: string): boolean {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(name)) return true;
    }
    return false;
  }

  /** 현재 스코프에 변수 선언 (이미 어떤 스코프에라도 있으면 에러) */
  declareVar(name: string, type: Type): void {
    // MiniTS에서는 shadowing 금지 → 모든 스코프에서 검사
    if (this.hasInAnyScope(name)) {
      throw new Error(`[TypeError] Variable '${name}' already declared`);
    }
    const current = this.scopes[this.scopes.length - 1];
    current.set(name, { type });
  }

  /** 심볼 테이블에서 name을 찾되, 못 찾으면 null 반환 (커스텀 에러 메시지 용) */
  getOrNull(name: string): VarInfo | null {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const scope = this.scopes[i];
      const info = scope.get(name);
      if (info) return info;
    }
    return null;
  }

  /** 반드시 존재해야 하는 경우에 사용 (없으면 Undeclared variable 에러) */
  resolve(name: string): VarInfo {
    const info = this.getOrNull(name);
    if (!info) {
      throw new Error(`[TypeError] Undeclared variable '${name}'`);
    }
    return info;
  }
}
