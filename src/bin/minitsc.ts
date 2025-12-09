#!/usr/bin/env node

import { compileMiniTS } from "../compiler/compile";
import * as fs from "fs/promises";
import { basename } from "path";

export interface CliIO {
  readFile(path: string): Promise<string>;
  writeFile(path: string, data: string): Promise<void>;
  log(msg: string): void;
  error(msg: string): void;
  exit(code: number): never;
}

const defaultIO: CliIO = {
  readFile: (p) => fs.readFile(p, "utf8"),
  writeFile: (p, d) => fs.writeFile(p, d, "utf8"),
  log: (msg) => console.log(msg),
  error: (msg) => console.error(msg),
  exit: (code) => process.exit(code),
};

function printUsage(io: CliIO) {
  io.log(
    [
      "Usage: minitsc <input.minits> [-o <output.js>]",
      "",
      "Options:",
      "  -o, --out   Output JavaScript file path (default: <input>.js)",
      "  -h, --help  Show this help",
      "",
      "Examples:",
      "  minitsc src/example.minits",
      "  minitsc src/example.minits -o dist/example.js",
    ].join("\n")
  );
}

export async function runCli(
  argv: string[],
  io: CliIO = defaultIO
): Promise<void> {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    printUsage(io);
    return;
  }

  let inputPath: string | undefined;
  let outputPath: string | undefined;

  const args = [...argv];

  while (args.length > 0) {
    const arg = args.shift()!;
    if (arg === "-o" || arg === "--out") {
      const next = args.shift();
      if (!next) {
        io.error("Missing output file after -o/--out.");
        io.exit(1);
      }
      outputPath = next;
    } else {
      if (inputPath) {
        io.error("Only one input file is supported.");
        io.exit(1);
      }
      inputPath = arg;
    }
  }

  if (!inputPath) {
    io.error("No input file provided.");
    printUsage(io);
    io.exit(1);
  }

  try {
    const source = await io.readFile(inputPath);
    const js = compileMiniTS(source);

    if (!outputPath) {
      const base = basename(inputPath).replace(/\.minits$/i, "") || "out";
      outputPath = base + ".js";
    }

    await io.writeFile(outputPath, js);
    io.log(`Compiled ${inputPath} -> ${outputPath}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    io.error(msg);
    io.exit(1);
  }
}

// CJS 스타일: 이 파일이 직접 실행된 경우에만 runCli 호출
// (테스트에서 import해서 쓸 때는 자동 실행 안 됨)
declare const require: NodeRequire;
declare const module: NodeModule;

if (typeof require !== "undefined" && typeof module !== "undefined") {
  if (require.main === module) {
    // eslint-disable-next-line no-void
    void runCli(process.argv.slice(2));
  }
}
