# miniTS Compiler

MiniTS는 학습용으로 만든 타입이 있는 소형 TypeScript 서브셋 언어를 JavaScript로 변환하는 컴파일러입니다. 렉서 → 파서 → 타입체커 → 코드 생성기의 전 과정을 간단한 코드로 담았습니다.

## 요구 사항
- Node.js 18+ (ESM `nodenext` 설정 사용)
- npm

## 설치 및 빌드
1. 의존성 설치: `npm install`
2. 타입스크립트 빌드: `npm run build` → `dist/`에 CLI(`dist/bin/minitsc.js`)와 라이브러리가 생성됩니다.

## 사용법
- 입력은 MiniTS 소스 파일(`.minits`)이어야 합니다.
- 단일 파일 컴파일 (권장: 로컬 bin via `npx`)
  - `npm run build` 후 `npx minitsc <input.minits> [-o output.js]`
  - `-o`를 생략하면 입력 파일 이름을 `.js`로 바꾼 경로에 출력합니다.
- dist 직접 실행(대안): `node dist/bin/minitsc.js <input.minits> [-o output.js]`
- 출력된 JS는 일반 Node.js로 실행 가능합니다: `node output.js`
- 도움말: `npx minitsc -h`

## 테스트 및 예제
- 단위 테스트(Vitest): `npm test`
- 예제 전체 컴파일:
  1) `npm run build`
  2) `npm run examples`
  - 정상 동작 예제는 `examples/out/*.js`로 생성됩니다.
  - 의도된 오류 예제(T11~T15)는 실패 로그가 정상이며 JS 파일이 생성되지 않습니다.
  - 특정 예제만 보고 싶다면: `node dist/bin/minitsc.js examples/02-parsing.minits -o examples/out/02-parsing.js` 처럼 단일 실행 후 `node examples/out/02-parsing.js`로 결과를 확인할 수 있습니다.

## 디렉터리 구조
- `src/lexer` — 어휘 분석기
- `src/parser` — 파서와 AST 생성
- `src/semantic` — 심볼 테이블과 타입체커
- `src/codegen` — JS 코드 생성기
- `src/bin/minitsc.ts` — CLI 엔트리 포인트
- `examples/` — 언어 기능별 샘플 및 기대 출력
- `docs/` — 테스트 요약과 프로젝트 설명서

## 추가 자료
- 언어/아키텍처 상세: `docs/project-overview.md`
- 테스트 케이스 설명: `docs/test-summary.md`
