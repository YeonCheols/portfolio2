/** @jest-environment node */
import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const script = path.join(__dirname, "scripts/start-with-config.sh");
describe("컨테이너 설정 진입점", () => {
  it.each([undefined, "development"])(
    "환경 %p을 선택하고 포트와 명령 인자를 보존한다",
    (environment) => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-entrypoint-"));
      try {
        const cli = path.join(root, "portfolio-config");
        const output = path.join(root, "arguments.json");
        fs.writeFileSync(
          cli,
          `#!${process.execPath}\nrequire("node:fs").writeFileSync(process.env.PORTFOLIO_TEST_OUTPUT,JSON.stringify(process.argv.slice(2))); process.exit(Number(process.env.PORTFOLIO_TEST_STATUS || 0));\n`,
          { mode: 0o755 },
        );
        const env: NodeJS.ProcessEnv = {
          PATH: root + path.delimiter + (process.env.PATH ?? ""),
          PORTFOLIO_TEST_OUTPUT: output,
          PORT: "9090",
          GOOGLE_CLOUD_PROJECT: "demo-project",
          GOOGLE_APPLICATION_CREDENTIALS: "/tmp/adc file.json",
          GH_TOKEN: "fake-github-token",
        };
        if (environment) {
          env.PORTFOLIO_CONFIG_ENVIRONMENT = environment;
          env.PORTFOLIO_CONFIG_REF = "feature/runtime";
        }
        const result = spawnSync(
          "sh",
          [
            script,
            "node",
            "-e",
            "process.stdout.write('argument with spaces')",
          ],
          { env, encoding: "utf8" },
        );
        expect(result.status).toBe(0);
        const args = JSON.parse(fs.readFileSync(output, "utf8"));
        expect(args.slice(0, 7)).toEqual([
          "run",
          "--app",
          "portfolio-mcp",
          "--env",
          environment ?? "production",
          "--ref",
          environment ? "feature/runtime" : "master",
        ]);
        expect(args).toContain("PORT=9090");
        expect(args.join(" ")).not.toContain("GOOGLE_CLOUD_PROJECT=");
        expect(args.join(" ")).not.toContain("GOOGLE_APPLICATION_CREDENTIALS=");
        expect(args.slice(-3)).toEqual([
          "node",
          "-e",
          "process.stdout.write('argument with spaces')",
        ]);
        expect(args.join(" ")).not.toContain("fake-github-token");
        expect(result.stdout).toBe("");
        expect(result.stderr).toBe("");
        const failed = spawnSync("sh", [script, "node", "ignored.js"], {
          env: { ...env, PORTFOLIO_TEST_STATUS: "23" },
          encoding: "utf8",
        });
        expect(failed.status).toBe(23);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    },
  );
});
