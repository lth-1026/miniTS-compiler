import { Lexer } from "../lexer/lexer";
import { Parser } from "../parser/parser";
import { TypeChecker } from "../semantic/typechecker";
import { CodeGenerator } from "../codegen/codegen";

export function compileMiniTS(source: string): string {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();

  const parser = new Parser(tokens);
  const program = parser.parseProgram();

  const checker = new TypeChecker();
  checker.checkProgram(program); // 타입 에러 있으면 여기서 throw

  const codegen = new CodeGenerator();
  return codegen.generate(program); // JS 코드 string 반환
}
