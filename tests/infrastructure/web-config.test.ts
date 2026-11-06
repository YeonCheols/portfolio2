import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

const root = path.join(__dirname, "../..");

describe("웹 portfolio-config 실행", () => {
  let fixture: string;
  beforeEach(() => {
    fixture = fs.mkdtempSync(path.join(os.tmpdir(), "web-config-test-"));
  });
  afterEach(() => fs.rmSync(fixture, { recursive: true, force: true }));

  it("로컬과 운영 명령은 중앙 설정을 사용하고 Vercel과 CI 검증은 분리한다", () => {
    const { scripts } = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"), "utf8"),
    );
    expect(scripts.dev).toContain("run-with-config.sh development");
    expect(scripts["dev:https"]).toContain("run-with-config.sh development");
    expect(scripts.build).toContain("run-with-config.sh production");
    expect(scripts.start).toContain("run-with-config.sh production");
    expect(scripts["build:check"]).not.toContain("run-with-config");
    expect(scripts["start:check"]).not.toContain("run-with-config");
    const vercel = JSON.parse(
      fs.readFileSync(path.join(root, "vercel.json"), "utf8"),
    );
    expect(vercel.buildCommand).toBe("pnpm build:check");
  });

  it("Compose는 개발 전용 이미지에서 중앙 development 설정으로 서버를 실행한다", () => {
    const dockerfile = fs.readFileSync(path.join(root, "Dockerfile"), "utf8");
    expect(dockerfile).toContain("FROM deps AS local");
    const compose = fs.readFileSync(
      path.join(root, "docker-compose.yml"),
      "utf8",
    );
    expect(compose).toContain("target: local");
    expect(compose).toContain('"127.0.0.1:${WEB_LOCAL_PORT:-3001}:3000"');
    expect(compose).toContain('"[::1]:${WEB_LOCAL_PORT:-3001}:3000"');
    expect(compose).not.toContain("RESUME_CONNECTION_TOKEN");
    expect(dockerfile).toContain(
      'ENTRYPOINT ["sh", "scripts/start-with-config.sh", "development"]',
    );
    expect(dockerfile).toContain(
      'CMD ["node", "node_modules/next/dist/bin/next", "dev", "--webpack", "--hostname", "0.0.0.0"]',
    );
  });

  it.each(["development", "production"])(
    "%s 설정으로 실행하고 플랫폼 포트와 인자를 보존한다",
    (environment) => {
      fs.writeFileSync(
        path.join(fixture, "portfolio-config"),
        `#!/bin/sh
printf '%s\\n' "$@" > "$CAPTURE"
while [ "$1" != -- ]; do shift; done
shift
exec env -i PATH="$PATH" API_URL=https://fixture.invalid GITHUB_NPM_TOKEN=fixture-package "$@"
`,
        { mode: 0o755 },
      );
      const capture = path.join(fixture, "args");
      const result = spawnSync(
        "sh",
        [
          path.join(root, "scripts/start-with-config.sh"),
          environment,
          process.execPath,
          "-e",
          "console.log(JSON.stringify({env:process.env.NODE_ENV,port:process.env.PORT,host:process.env.HOSTNAME,processed:process.env.__NEXT_PROCESSED_ENV,api:process.env.API_URL,token:process.env.GH_TOKEN,npmToken:process.env.GITHUB_NPM_TOKEN,arg:process.argv[1]}))",
          "value with spaces",
        ],
        {
          encoding: "utf8",
          env: {
            ...process.env,
            PATH: `${fixture}:${process.env.PATH}`,
            CAPTURE: capture,
            GH_TOKEN: "fixture-only",
            PORT: "8080",
            HOSTNAME: "0.0.0.0",
          },
        },
      );
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({
        env: environment,
        port: "8080",
        host: "0.0.0.0",
        processed: "true",
        api: "https://fixture.invalid",
        arg: "value with spaces",
      });
      expect(fs.readFileSync(capture, "utf8")).toContain(
        `run\n--app\nportfolio-web\n--env\n${environment}\n--ref\nmaster\n--\n`,
      );
    },
  );

  it("설정 읽기가 실패하면 서버를 실행하지 않고 종료 코드를 보존한다", () => {
    fs.writeFileSync(
      path.join(fixture, "portfolio-config"),
      "#!/bin/sh\nexit 19\n",
      { mode: 0o755 },
    );
    const result = spawnSync(
      "sh",
      [
        path.join(root, "scripts/start-with-config.sh"),
        "production",
        "touch",
        path.join(fixture, "started"),
      ],
      { env: { ...process.env, PATH: `${fixture}:${process.env.PATH}` } },
    );
    expect(result.status).toBe(19);
    expect(fs.existsSync(path.join(fixture, "started"))).toBe(false);
  });

  it.each([
    ["exit 19", 19],
    ["echo invalid-tag", 2],
  ])("최신 조회가 실패하면 서버를 실행하지 않는다 (%s)", (response, status) => {
    fs.cpSync(path.join(root, "scripts"), path.join(fixture, "scripts"), {
      recursive: true,
    });
    const bin = path.join(fixture, "bin");
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, "git"), "#!/bin/sh\nexit 1\n", {
      mode: 0o755,
    });
    fs.writeFileSync(path.join(bin, "gh"), `#!/bin/sh\n${response}\n`, {
      mode: 0o755,
    });
    const result = spawnSync(
      "sh",
      [
        path.join(fixture, "scripts/run-with-config.sh"),
        "production",
        "touch",
        path.join(fixture, "started"),
      ],
      { env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } },
    );
    expect(result.status).toBe(status);
    expect(fs.existsSync(path.join(fixture, "started"))).toBe(false);
  });

  it("매번 최신 버전을 조회하고 버전이 바뀌면 해당 CLI를 설치한다", () => {
    fs.cpSync(path.join(root, "scripts"), path.join(fixture, "scripts"), {
      recursive: true,
    });
    const bin = path.join(fixture, "bin");
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, "git"), "#!/bin/sh\nexit 1\n", {
      mode: 0o755,
    });
    fs.writeFileSync(
      path.join(bin, "gh"),
      `#!/bin/sh
case "$2" in
  */releases/latest) printf '%s\\n' "$FIXTURE_TAG" ;;
  */contents/scripts/install.sh*)
    cat <<'INSTALL'
#!/bin/sh
mkdir -p "$2"
printf '#!/bin/sh\\necho %s\\n' "$1" > "$2/portfolio-config"
chmod +x "$2/portfolio-config"
INSTALL
    ;;
  *) exit 17 ;;
esac
`,
      { mode: 0o755 },
    );
    for (const tag of ["cli-v9.8.7", "cli-v9.8.8"]) {
      const result = spawnSync(
        "sh",
        [
          path.join(fixture, "scripts/run-with-config.sh"),
          "development",
          "node",
          "unused",
        ],
        {
          encoding: "utf8",
          env: {
            ...process.env,
            PATH: `${bin}:${process.env.PATH}`,
            FIXTURE_TAG: tag,
          },
        },
      );
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe(tag);
      expect(
        fs.existsSync(
          path.join(
            fixture,
            ".cache/portfolio-config",
            tag,
            "portfolio-config",
          ),
        ),
      ).toBe(true);
    }
  });

  it("Next.js가 중앙 설정에 없는 로컬 dotenv 값을 추가하지 않는다", () => {
    fs.writeFileSync(
      path.join(fixture, ".env.local"),
      "WEB_CONFIG_FIXTURE=local-only\n",
    );
    const script = `const {createRequire}=require('module');const r=createRequire(require.resolve('next/package.json'));r('@next/env').loadEnvConfig(process.argv[1]);console.log(JSON.stringify({leaked:process.env.WEB_CONFIG_FIXTURE,api:process.env.API_URL}));`;
    const result = spawnSync(process.execPath, ["-e", script, fixture], {
      cwd: root,
      encoding: "utf8",
      env: {
        PATH: process.env.PATH,
        NODE_ENV: "production",
        __NEXT_PROCESSED_ENV: "true",
        API_URL: "https://fixture.invalid",
      },
    });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      api: "https://fixture.invalid",
    });
  });
});
