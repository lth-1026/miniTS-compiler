import { readdir, rm, mkdir } from "node:fs/promises";
import { exec } from "node:child_process";
import { join } from "node:path";

function run(cmd) {
  return new Promise((resolve, reject) => {
    const p = exec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else {
        resolve(stdout);
      }
    });
    p.stdout.pipe(process.stdout);
    p.stderr.pipe(process.stderr);
  });
}

const examplesDir = "./examples";
const outDir = "./examples/out";

// 깨끗한 출력 디렉터리 준비
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const files = (await readdir(examplesDir)).filter((f) => f.endsWith(".minits"));

console.log("=== Running all MiniTS example programs ===\n");

const failures = [];

for (const file of files) {
  const input = join(examplesDir, file);
  const output = join("examples/out", file.replace(".minits", ".js"));
  console.log(`--- Compiling ${file} ---`);

  try {
    await run(`node dist/bin/minitsc.js ${input} -o ${output}`);
    console.log(`Compiled → ${output}\n`);
  } catch (err) {
    console.error(`ERROR while compiling ${file}`);
    console.error(err.message ?? err);
    failures.push(file);
    console.log(); // 줄바꿈
  }
}

console.log("\n=== Summary ===");

if (failures.length === 0) {
  console.log("All examples compiled successfully!");
} else {
  console.log("Some examples failed:");
  for (const f of failures) console.log(" - " + f);
}

console.log();
