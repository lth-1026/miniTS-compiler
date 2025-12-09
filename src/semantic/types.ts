export type Type = "number" | "boolean" | "string" | "void";

export interface VarInfo {
  type: Type;
}

export interface FuncInfo {
  paramTypes: Type[];
  returnType: Type;
}

export interface TypeEnv {
  vars: Map<string, VarInfo>;
  funcs: Map<string, FuncInfo>;
}
