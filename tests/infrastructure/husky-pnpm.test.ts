import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const helperPath = path.join(__dirname, "../../.husky/pnpm.sh");
const temporaryDirectories: string[] = [];

const createBinDirectory = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "husky-pnpm-"));
  temporaryDirectories.push(directory);
  return directory;
};

const writeCommand = (directory: string, name: string, body: string) => {
  const commandPath = path.join(directory, name);
  fs.writeFileSync(commandPath, `#!/bin/sh\n${body}\n`, { mode: 0o755 });
  return commandPath;
};

const runPnpmHelper = (pathValue: string) =>
  spawnSync("/bin/sh", [helperPath, "lint"], {
    encoding: "utf8",
    env: { ...process.env, PATH: pathValue },
  });

describe("Husky pnpm 실행기", () => {
  afterEach(() => {
    temporaryDirectories.splice(0).forEach((directory) => {
      fs.rmSync(directory, { recursive: true, force: true });
    });
  });

  it("pre-commit과 pre-push가 공통 pnpm 실행기를 사용한다", () => {
    const preCommit = fs.readFileSync(
      path.join(__dirname, "../../.husky/pre-commit"),
      "utf8",
    );
    const prePush = fs.readFileSync(
      path.join(__dirname, "../../.husky/pre-push"),
      "utf8",
    );

    expect(preCommit).toContain("pnpm.sh");
    expect(prePush).toContain("pnpm.sh");
  });

  it("PATH에서 pnpm을 찾으면 해당 실행 파일을 사용한다", () => {
    const binDirectory = createBinDirectory();
    writeCommand(binDirectory, "pnpm", 'printf "pnpm:%s\\n" "$*"');

    const result = runPnpmHelper(binDirectory);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("pnpm:lint");
  });

  it("pnpm이 없고 Corepack이 있으면 Corepack으로 pnpm을 실행한다", () => {
    const binDirectory = createBinDirectory();
    writeCommand(binDirectory, "corepack", 'printf "corepack:%s\\n" "$*"');

    const result = runPnpmHelper(binDirectory);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("corepack:pnpm lint");
  });

  it("pnpm과 Corepack이 모두 없으면 설치 안내와 함께 종료한다", () => {
    const binDirectory = createBinDirectory();

    const result = runPnpmHelper(binDirectory);

    expect(result.status).toBe(127);
    expect(result.stderr).toContain("pnpm을 찾을 수 없습니다");
    expect(result.stderr).toContain("Corepack");
  });
});
