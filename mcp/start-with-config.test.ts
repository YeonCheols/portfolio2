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

describe("Compose 실행 도구", () => {
  it.each(["up", "verify", "down"])(
    "%s에 필요한 인증과 Docker 인자만 전달한다",
    (action) => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-compose-"));
      try {
        const output = path.join(root, "arguments.json");
        const executable = (name: string, body: string): void => {
          fs.writeFileSync(
            path.join(root, name),
            `#!${process.execPath}\n${body}\n`,
            { mode: 0o755 },
          );
        };
        executable(
          "git",
          `if (process.env.COMPOSE_TEST_ACTION !== "up") process.exit(99); if (process.argv.includes("config")) process.exit(0); if (process.argv.includes("token")) process.stdout.write("fixture-token"); else process.exit(99);`,
        );
        executable(
          "gh",
          `if (process.env.COMPOSE_TEST_ACTION === "up" && process.argv.includes("repos/YeonCheols/portfolio-config/releases/latest")) process.stdout.write("cli-v9.8.7"); else process.exit(99);`,
        );
        executable(
          "docker",
          `require("node:fs").writeFileSync(process.env.COMPOSE_TEST_OUTPUT, JSON.stringify({ args: process.argv.slice(2), authenticated: Boolean(process.env.GH_TOKEN), cliTag: process.env.PORTFOLIO_CONFIG_CLI_TAG }));`,
        );
        const result = spawnSync(
          "sh",
          [path.join(__dirname, "scripts/compose.sh"), action],
          {
            env: {
              PATH: root + path.delimiter + (process.env.PATH ?? ""),
              COMPOSE_TEST_ACTION: action,
              COMPOSE_TEST_OUTPUT: output,
            },
            encoding: "utf8",
          },
        );
        expect(result.status).toBe(0);
        const captured = JSON.parse(fs.readFileSync(output, "utf8"));
        expect(captured.authenticated).toBe(action === "up");
        expect(captured.cliTag).toBe(
          action === "up" ? "cli-v9.8.7" : undefined,
        );
        expect(captured.args).toEqual(
          expect.arrayContaining(
            action === "up"
              ? ["up", "--build", "--wait", "server"]
              : action === "verify"
                ? ["run", "--build", "--rm", "verify"]
                : ["down"],
          ),
        );
        expect(JSON.stringify(captured.args)).not.toContain("fixture-token");
        expect(result.stdout).toBe("");
        expect(result.stderr).toBe("");
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    },
  );
});

describe("최신 설정 CLI 설치", () => {
  it.each([
    ["latest", 0],
    ["resolved", 0],
    ["lookup-failed", 19],
    ["invalid-tag", 2],
    ["install-failed", 29],
  ])("%s 결과를 같은 릴리스 설치와 종료 코드에 반영한다", (mode, status) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-cli-install-"));
    try {
      const target = path.join(root, "installed");
      const installer =
        '#!/bin/sh\nset -eu\n[ "$1" = "cli-v9.8.7" ]\nif [ "$CLI_TEST_MODE" = "install-failed" ]; then exit 29; fi\nmkdir -p "$2"\nprintf "%s" "$1" > "$2/version"\n';
      fs.writeFileSync(
        path.join(root, "gh"),
        `#!${process.execPath}\nconst args=process.argv.slice(2); if(args.includes("repos/YeonCheols/portfolio-config/releases/latest")) { if(process.env.CLI_TEST_MODE === "lookup-failed") process.exit(19); if(process.env.CLI_TEST_MODE === "resolved") process.exit(99); process.stdout.write(process.env.CLI_TEST_MODE === "invalid-tag" ? "v9.8.7" : "cli-v9.8.7"); } else if(args.includes("repos/YeonCheols/portfolio-config/contents/scripts/install.sh?ref=cli-v9.8.7")) process.stdout.write(${JSON.stringify(installer)}); else process.exit(99);\n`,
        { mode: 0o755 },
      );
      const args = [
        path.join(__dirname, "scripts/install-config-cli.sh"),
        target,
      ];
      if (mode === "resolved") args.push("cli-v9.8.7");
      const result = spawnSync("sh", args, {
        env: {
          PATH: root + path.delimiter + (process.env.PATH ?? ""),
          CLI_TEST_MODE: String(mode),
        },
        encoding: "utf8",
      });
      expect(result.status).toBe(status);
      expect(fs.existsSync(path.join(target, "version"))).toBe(status === 0);
      if (status === 0)
        expect(fs.readFileSync(path.join(target, "version"), "utf8")).toBe(
          "cli-v9.8.7",
        );
      expect(result.stdout).toBe("");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
