import fs from "fs";
import http from "http";
import path from "path";

import {
  resumeModelFromEnv,
  resumeModelFromSetting,
  resumeModelSourceFromEnv,
  startResumeMcpServer,
} from "@mcp/resume/http/server";

describe("startResumeMcpServer", () => {
  const previousUrl = process.env.RESUME_CONNECTION_URL;
  const previousToken = process.env.RESUME_CONNECTION_TOKEN;

  afterEach(() => {
    if (previousUrl === undefined) delete process.env.RESUME_CONNECTION_URL;
    else process.env.RESUME_CONNECTION_URL = previousUrl;
    if (previousToken === undefined) delete process.env.RESUME_CONNECTION_TOKEN;
    else process.env.RESUME_CONNECTION_TOKEN = previousToken;
  });

  it("프로세스 진입점은 외부 AI 주소와 토큰으로 문장을 요청한다", async () => {
    const fetchImpl = jest.fn<
      Promise<{ json: () => Promise<unknown> }>,
      [string, RequestInit]
    >(async () => ({ json: async () => ({ ok: true, text: "생성 문장" }) }));

    const model = resumeModelFromEnv(
      {
        RESUME_MODEL_URL: "https://model.example/generate",
        RESUME_MODEL_TOKEN: "model-token",
      },
      fetchImpl,
    );

    await expect(
      model.generate({
        persona: "이력서 전문 작성자",
        prompt: "원소를 해석한다",
      }),
    ).resolves.toBe("생성 문장");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://model.example/generate",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer model-token",
        }),
        body: JSON.stringify({
          persona: "이력서 전문 작성자",
          prompt: "원소를 해석한다",
        }),
      }),
    );
  });

  it("연결 공급자가 없으면 OpenRouter 주소여도 공통 본문으로 보낸다", async () => {
    const fetchImpl = jest.fn<
      Promise<{ ok: boolean; json: () => Promise<unknown> }>,
      [string, RequestInit]
    >(async () => ({
      ok: true,
      json: async () => ({
        ok: true,
        text: "생성 문장",
        choices: [{ message: { content: "생성 문장" } }],
      }),
    }));

    const model = resumeModelFromEnv(
      {
        RESUME_MODEL_URL: "https://openrouter.ai/api/v1/chat/completions",
        RESUME_MODEL_TOKEN: "model-token",
      },
      fetchImpl,
    );

    await expect(
      model.generate({
        persona: "이력서 전문 작성자",
        prompt: "원소를 해석한다",
      }),
    ).resolves.toBe("생성 문장");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer model-token",
          "content-type": "application/json",
        }),
        body: JSON.stringify({
          persona: "이력서 전문 작성자",
          prompt: "원소를 해석한다",
        }),
      }),
    );
  });

  it("연결 공급자가 OpenRouter이면 설정한 모델 이름으로 메시지를 보낸다", async () => {
    const fetchImpl = jest.fn<
      Promise<{ ok: boolean; json: () => Promise<unknown> }>,
      [string, RequestInit]
    >(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "생성 문장" } }],
      }),
    }));

    const model = resumeModelFromEnv(
      {
        RESUME_MODEL_URL: "https://model.example/generate",
        RESUME_MODEL_TOKEN: "model-token",
        RESUME_MODEL_PROVIDER: "openrouter",
        RESUME_MODEL_NAME: "vendor/model",
      },
      fetchImpl,
    );

    await expect(
      model.generate({
        persona: "이력서 전문 작성자",
        prompt: "원소를 해석한다",
      }),
    ).resolves.toBe("생성 문장");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://model.example/generate",
      expect.objectContaining({
        body: JSON.stringify({
          model: "vendor/model",
          messages: [
            { role: "system", content: "이력서 전문 작성자" },
            { role: "user", content: "원소를 해석한다" },
          ],
        }),
      }),
    );
  });

  it("OpenRouter 모델 이름이 없으면 외부 AI를 호출하지 않는다", async () => {
    const fetchImpl = jest.fn<
      Promise<{ ok: boolean; json: () => Promise<unknown> }>,
      [string, RequestInit]
    >(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "생성 문장" } }],
      }),
    }));

    const model = resumeModelFromEnv(
      {
        RESUME_MODEL_URL: "https://model.example/generate",
        RESUME_MODEL_TOKEN: "model-token",
        RESUME_MODEL_PROVIDER: "openrouter",
        RESUME_MODEL_NAME: "  ",
      },
      fetchImpl,
    );

    await expect(
      model.generate({
        persona: "이력서 전문 작성자",
        prompt: "원소를 해석한다",
      }),
    ).rejects.toMatchObject({ code: "MISSING_MODEL_CONNECTION" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("알 수 없는 연결 공급자는 외부 AI를 호출하지 않는다", async () => {
    const fetchImpl = jest.fn<
      Promise<{ ok: boolean; json: () => Promise<unknown> }>,
      [string, RequestInit]
    >(async () => ({
      ok: true,
      json: async () => ({ ok: true, text: "생성 문장" }),
    }));

    const model = resumeModelFromEnv(
      {
        RESUME_MODEL_URL: "https://model.example/generate",
        RESUME_MODEL_TOKEN: "model-token",
        RESUME_MODEL_PROVIDER: "other-llm",
        RESUME_MODEL_NAME: "vendor/model",
      },
      fetchImpl,
    );

    await expect(
      model.generate({
        persona: "이력서 전문 작성자",
        prompt: "원소를 해석한다",
      }),
    ).rejects.toMatchObject({ code: "MISSING_MODEL_CONNECTION" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("배포 워크플로는 공통 모델 주소와 토큰 이름만 주입한다", () => {
    const workflow = fs.readFileSync(
      path.join(process.cwd(), ".github/workflows/deploy-mcp.yml"),
      "utf8",
    );
    const deploy = workflow.slice(
      workflow.indexOf("gcloud run deploy portfolio-mcp"),
      workflow.indexOf("게이트웨이 런타임 계정"),
    );

    expect(deploy).toContain('RESUME_MODEL_URL="${{ vars.RESUME_MODEL_URL }}"');
    expect(deploy).toContain(
      'RESUME_MODEL_TOKEN="${{ secrets.RESUME_MODEL_TOKEN }}"',
    );
    expect(deploy).toContain(
      'RESUME_MODEL_PROVIDER="${{ vars.RESUME_MODEL_PROVIDER }}"',
    );
    expect(deploy).toContain(
      'RESUME_MODEL_NAME="${{ vars.RESUME_MODEL_NAME }}"',
    );
    expect(deploy).not.toContain(
      "RESUME_MODEL_TOKEN=RESUME_MODEL_TOKEN:latest",
    );
    expect(deploy.toLowerCase()).not.toContain("openrouter");
    expect(deploy).not.toMatch(/sk-[A-Za-z0-9]/);
  });

  describe("resumeModelFromSetting", () => {
    const settingUrl = "https://api.example/resume-model-setting/active";
    const modelUrl = "https://openrouter.ai/api/v1/chat/completions";
    const metadata = "http://metadata.google.internal/computeMetadata/v1";
    const secretUrl =
      "https://secretmanager.googleapis.com/v1/projects/demo-project/secrets/RESUME_MODEL_TOKEN_OPENROUTER/versions/latest:access";
    const setting = {
      provider: "openrouter",
      modelName: "vendor/model",
      url: modelUrl,
      secretRef: "RESUME_MODEL_TOKEN_OPENROUTER",
    };
    const input = { persona: "이력서 전문 작성자", prompt: "원소를 해석한다" };

    // 설정 API, 메타데이터 서버, Secret Manager, 모델 API를 주소로 구분하는 가짜 네트워크
    const fakeNetwork = (overrides: Record<string, unknown> = {}) => {
      const replies: Record<string, unknown> = {
        [`${settingUrl}?environment=production`]: setting,
        [`${metadata}/instance/service-accounts/default/token`]: {
          access_token: "metadata-access-token",
        },
        [`${metadata}/project/project-id`]: "demo-project",
        [secretUrl]: {
          payload: { data: Buffer.from("model-secret").toString("base64") },
        },
        [modelUrl]: { choices: [{ message: { content: "생성 문장" } }] },
        ...overrides,
      };
      // 메타데이터 서버의 project-id처럼 문자열 본문은 JSON이 아니라 일반 텍스트다
      const fetchImpl = jest.fn<
        Promise<{
          ok: boolean;
          status: number;
          json: () => Promise<unknown>;
          text: () => Promise<string>;
        }>,
        [string, RequestInit]
      >(async (url) => ({
        ok: url in replies,
        status: url in replies ? 200 : 404,
        json: async () => {
          if (typeof replies[url] === "string") {
            throw new SyntaxError("Unexpected token in JSON");
          }
          return replies[url];
        },
        text: async () =>
          typeof replies[url] === "string"
            ? (replies[url] as string)
            : JSON.stringify(replies[url]),
      }));

      return Object.assign(fetchImpl, { replies });
    };
    const settingKey = `${settingUrl}?environment=production`;
    const callsTo = (fetchImpl: ReturnType<typeof fakeNetwork>, url: string) =>
      fetchImpl.mock.calls.filter(([called]) => called === url);
    const modelOf = (fetchImpl: ReturnType<typeof fakeNetwork>) =>
      JSON.parse(String(callsTo(fetchImpl, modelUrl).at(-1)?.[1].body)).model;

    it("활성 설정을 조회해 설정의 모델 이름과 시크릿 토큰으로 호출한다", async () => {
      const fetchImpl = fakeNetwork();
      const model = resumeModelFromSetting({
        settingUrl,
        settingToken: "read-token",
        environment: "production",
        fetchImpl,
      });

      await expect(model.generate(input)).resolves.toBe("생성 문장");
      expect(fetchImpl).toHaveBeenCalledWith(
        `${settingUrl}?environment=production`,
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: "Bearer read-token",
          }),
        }),
      );
      expect(fetchImpl).toHaveBeenLastCalledWith(
        modelUrl,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            authorization: "Bearer model-secret",
          }),
          body: JSON.stringify({
            model: "vendor/model",
            messages: [
              { role: "system", content: "이력서 전문 작성자" },
              { role: "user", content: "원소를 해석한다" },
            ],
          }),
        }),
      );
    });

    it("한 요청 안의 두 번째 호출은 설정이 바뀌어도 같은 스냅샷을 쓰고 조회는 한 번이다", async () => {
      const fetchImpl = fakeNetwork();
      const model = resumeModelFromSetting({
        settingUrl,
        settingToken: "read-token",
        environment: "production",
        fetchImpl,
      });

      await model.generate(input);
      fetchImpl.replies[settingKey] = {
        ...setting,
        modelName: "changed/model",
      };
      await model.generate(input);

      expect(callsTo(fetchImpl, settingKey)).toHaveLength(1);
      expect(callsTo(fetchImpl, secretUrl)).toHaveLength(1);
      expect(callsTo(fetchImpl, modelUrl)).toHaveLength(2);
      expect(modelOf(fetchImpl)).toBe("vendor/model");
    });

    it("재시작 없이 설정을 바꾸면 다음 요청의 새 클라이언트가 바뀐 모델을 쓴다", async () => {
      const fetchImpl = fakeNetwork();
      const options = {
        settingUrl,
        settingToken: "read-token",
        environment: "production",
        fetchImpl,
      };

      await resumeModelFromSetting(options).generate(input);
      expect(modelOf(fetchImpl)).toBe("vendor/model");

      fetchImpl.replies[settingKey] = {
        ...setting,
        modelName: "changed/model",
      };
      await resumeModelFromSetting(options).generate(input);

      expect(modelOf(fetchImpl)).toBe("changed/model");
      expect(callsTo(fetchImpl, settingKey)).toHaveLength(2);
    });

    it.each<
      [string, string, (replies: Record<string, unknown>) => void, boolean]
    >([
      [
        "활성 설정이 없음",
        "MODEL_SETTING_NOT_FOUND",
        (replies) => {
          delete replies[settingKey];
        },
        false,
      ],
      [
        "알 수 없는 provider",
        "MISSING_MODEL_CONNECTION",
        (replies) => {
          replies[settingKey] = { ...setting, provider: "other-llm" };
        },
        false,
      ],
      [
        "시크릿을 읽을 수 없음",
        "MODEL_SECRET_UNAVAILABLE",
        (replies) => {
          delete replies[secretUrl];
        },
        true,
      ],
    ])(
      "%s이면 모델 API를 호출하지 않고 %s로 실패한다",
      async (_label, code, breakIt, readsSecret) => {
        const fetchImpl = fakeNetwork();
        breakIt(fetchImpl.replies);
        const model = resumeModelFromSetting({
          settingUrl,
          settingToken: "read-token",
          environment: "production",
          fetchImpl,
        });

        await expect(model.generate(input)).rejects.toMatchObject({ code });
        expect(callsTo(fetchImpl, modelUrl)).toHaveLength(0);
        // provider를 모르면 쓰지 않을 비밀값에 접근하지 않는다
        expect(callsTo(fetchImpl, secretUrl).length > 0).toBe(readsSecret);
      },
    );

    describe("resumeModelSourceFromEnv", () => {
      const dynamicEnv = {
        RESUME_MODEL_SETTING_URL: settingUrl,
        RESUME_MODEL_SETTING_TOKEN: "read-token",
        RESUME_MODEL_ENVIRONMENT: "production",
        // 동적 모드에서는 아래 값이 있어도 쓰지 않는다
        RESUME_MODEL_URL: "https://legacy.example/generate",
        RESUME_MODEL_TOKEN: "legacy-token",
      };

      it("설정 조회 주소가 있으면 요청마다 새 클라이언트를 만드는 팩토리를 돌려주고 환경변수 모델은 쓰지 않는다", async () => {
        const fetchImpl = fakeNetwork();
        const source = resumeModelSourceFromEnv(dynamicEnv, fetchImpl);

        expect(typeof source).toBe("function");
        const create = source as () => ReturnType<
          typeof resumeModelFromSetting
        >;
        expect(create()).not.toBe(create());

        await create().generate(input);

        expect(callsTo(fetchImpl, settingKey)).toHaveLength(1);
        expect(callsTo(fetchImpl, modelUrl)).toHaveLength(1);
        expect(
          fetchImpl.mock.calls.some(([url]) => url.includes("legacy.example")),
        ).toBe(false);
      });

      it.each<[string, Record<string, string | undefined>, RegExp]>([
        [
          "조회 토큰이 없음",
          { RESUME_MODEL_SETTING_TOKEN: undefined },
          /RESUME_MODEL_SETTING_TOKEN/,
        ],
        [
          "조회 토큰이 공백",
          { RESUME_MODEL_SETTING_TOKEN: "  " },
          /RESUME_MODEL_SETTING_TOKEN/,
        ],
        [
          "환경 이름이 없음",
          { RESUME_MODEL_ENVIRONMENT: undefined },
          /RESUME_MODEL_ENVIRONMENT/,
        ],
        [
          "환경 이름이 허용 값이 아님",
          { RESUME_MODEL_ENVIRONMENT: "staging" },
          /RESUME_MODEL_ENVIRONMENT/,
        ],
        [
          "조회 주소가 https가 아님",
          { RESUME_MODEL_SETTING_URL: "http://api.example/active" },
          /RESUME_MODEL_SETTING_URL/,
        ],
      ])(
        "동적 모드에서 %s이면 시작 단계에서 환경변수 모델로 대체하지 않고 실패한다",
        (_label, override, message) => {
          expect(() =>
            resumeModelSourceFromEnv({ ...dynamicEnv, ...override }),
          ).toThrow(message);
        },
      );
    });
  });

  it("배포 워크플로는 조회 주소 변수가 있을 때만 동적 설정 모드를 켜고 기존 환경변수는 롤백용으로 남긴다", () => {
    const workflow = fs.readFileSync(
      path.join(process.cwd(), ".github/workflows/deploy-mcp.yml"),
      "utf8",
    );
    const deploy = workflow.slice(
      workflow.indexOf("gcloud run deploy portfolio-mcp"),
      workflow.indexOf("게이트웨이 런타임 계정"),
    );
    const beforeDeploy = workflow.slice(
      workflow.indexOf("비공개 MCP 서버 배포"),
      workflow.indexOf("gcloud run deploy portfolio-mcp"),
    );

    expect(deploy).toContain(
      'RESUME_MODEL_SETTING_URL="${{ vars.RESUME_MODEL_SETTING_URL }}"',
    );
    expect(deploy).toContain(
      'RESUME_MODEL_ENVIRONMENT="${{ vars.RESUME_MODEL_ENVIRONMENT }}"',
    );
    // 시크릿 읽기 권한은 사전 설정이라, 변수가 없으면 조회 토큰을 주입하지 않아 기존 배포가 깨지지 않는다
    expect(beforeDeploy).toContain(
      'if [ -n "${{ vars.RESUME_MODEL_SETTING_URL }}" ]',
    );
    expect(beforeDeploy).toContain(
      "RESUME_MODEL_SETTING_TOKEN=RESUME_MODEL_SETTING_TOKEN:latest",
    );
    expect(deploy).toContain('--set-secrets="${SECRETS}"');
    expect(deploy).toContain('RESUME_MODEL_URL="${{ vars.RESUME_MODEL_URL }}"');
    expect(workflow).not.toContain("gcloud secrets add-iam-policy-binding");
  });

  it("동적 설정 모드에서 조회 토큰이 없으면 서버를 열지 않는다", () => {
    const keys = [
      "RESUME_CONNECTION_URL",
      "RESUME_CONNECTION_TOKEN",
      "RESUME_MODEL_SETTING_URL",
      "RESUME_MODEL_SETTING_TOKEN",
      "RESUME_MODEL_ENVIRONMENT",
    ] as const;
    const previous = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
    const listen = jest
      .spyOn(http.Server.prototype, "listen")
      .mockImplementation(function (this: http.Server) {
        return this;
      });
    process.env.RESUME_CONNECTION_URL = "https://resume.example/connect";
    process.env.RESUME_CONNECTION_TOKEN = "connection-token";
    process.env.RESUME_MODEL_SETTING_URL = "https://api.example/active";
    delete process.env.RESUME_MODEL_SETTING_TOKEN;
    process.env.RESUME_MODEL_ENVIRONMENT = "production";

    try {
      expect(() => startResumeMcpServer()).toThrow(
        /RESUME_MODEL_SETTING_TOKEN/,
      );
      expect(listen).not.toHaveBeenCalled();
    } finally {
      listen.mockRestore();
      for (const k of keys) {
        if (previous[k] === undefined) delete process.env[k];
        else process.env[k] = previous[k];
      }
    }
  });

  it("연결 주소나 토큰이 없으면 서버를 열지 않는다", () => {
    delete process.env.RESUME_CONNECTION_URL;
    delete process.env.RESUME_CONNECTION_TOKEN;

    expect(() => startResumeMcpServer()).toThrow(
      "RESUME_CONNECTION_URL and RESUME_CONNECTION_TOKEN are required",
    );
  });
});
