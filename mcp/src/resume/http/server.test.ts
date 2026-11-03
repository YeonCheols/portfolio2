import http from "http";

import {
  modelTestConnections,
  resumeModelFromSetting,
  resumeModelSourceFromEnv,
  startResumeMcpServer,
} from "@mcp/resume/http/server";

describe("modelTestConnections", () => {
  it("OpenRouter 연결 테스트는 응답 문장과 공급자 응답 원문을 함께 돌려준다", async () => {
    const body = { id: "gen-1", choices: [{ message: { content: "ok" } }] };
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => body,
    }));

    const result = await modelTestConnections.openrouter(
      { persona: "연결 테스트", prompt: "ok" },
      {
        url: "https://openrouter.ai/api/v1/chat/completions",
        token: "model-token",
        model: "vendor/model",
        fetchImpl,
      },
    );

    expect(result).toEqual({ text: "ok", raw: body });
  });
});

describe("startResumeMcpServer", () => {
  const previousUrl = process.env.RESUME_CONNECTION_URL;
  const previousToken = process.env.RESUME_CONNECTION_TOKEN;

  afterEach(() => {
    if (previousUrl === undefined) delete process.env.RESUME_CONNECTION_URL;
    else process.env.RESUME_CONNECTION_URL = previousUrl;
    if (previousToken === undefined) delete process.env.RESUME_CONNECTION_TOKEN;
    else process.env.RESUME_CONNECTION_TOKEN = previousToken;
  });

  it("issuer 설정이 비어 있으면 portfolio-api 기본 issuer를 사용한다", () => {
    const keys = [
      "RESUME_CONNECTION_URL",
      "RESUME_CONNECTION_TOKEN",
      "PORTFOLIO_API_URL",
      "PORTFOLIO_API_AUTH_ISSUER",
      "MCP_PUBLIC_URL",
      "MCP_AUTH_SERVICE_TOKEN",
      "RESUME_MODEL_SETTING_URL",
      "RESUME_MODEL_SETTING_TOKEN",
      "RESUME_MODEL_ENVIRONMENT",
    ] as const;
    const previous = Object.fromEntries(
      keys.map((key) => [key, process.env[key]]),
    );
    const listen = jest
      .spyOn(http.Server.prototype, "listen")
      .mockImplementation(function (this: http.Server) {
        return this;
      });
    process.env.RESUME_CONNECTION_URL = "https://resume.example/connect";
    process.env.RESUME_CONNECTION_TOKEN = "connection-token";
    process.env.PORTFOLIO_API_URL = "https://api.example.test";
    process.env.PORTFOLIO_API_AUTH_ISSUER = "";
    process.env.MCP_PUBLIC_URL = "https://mcp.example.test/mcp";
    process.env.MCP_AUTH_SERVICE_TOKEN = "service-token";
    process.env.RESUME_MODEL_SETTING_URL = "https://api.example/active";
    process.env.RESUME_MODEL_SETTING_TOKEN = "read-token";
    process.env.RESUME_MODEL_ENVIRONMENT = "production";

    try {
      expect(() => startResumeMcpServer()).not.toThrow();
      expect(listen).toHaveBeenCalledTimes(1);
    } finally {
      listen.mockRestore();
      for (const key of keys) {
        if (previous[key] === undefined) delete process.env[key];
        else process.env[key] = previous[key];
      }
    }
  });

  it("설정별 연결 테스트 경로가 서버에 연결되어 인증 없이는 401로 거절한다", async () => {
    const keys = [
      "RESUME_CONNECTION_URL",
      "RESUME_CONNECTION_TOKEN",
      "PORTFOLIO_API_URL",
      "PORTFOLIO_API_AUTH_ISSUER",
      "MCP_PUBLIC_URL",
      "MCP_AUTH_SERVICE_TOKEN",
      "RESUME_MODEL_SETTING_URL",
      "RESUME_MODEL_SETTING_TOKEN",
      "RESUME_MODEL_ENVIRONMENT",
    ] as const;
    const previous = Object.fromEntries(
      keys.map((key) => [key, process.env[key]]),
    );
    const listen = jest
      .spyOn(http.Server.prototype, "listen")
      .mockImplementation(function (this: http.Server) {
        return this;
      });
    process.env.RESUME_CONNECTION_URL = "https://resume.example/connect";
    process.env.RESUME_CONNECTION_TOKEN = "connection-token";
    process.env.PORTFOLIO_API_URL = "https://api.example.test";
    process.env.PORTFOLIO_API_AUTH_ISSUER = "";
    process.env.MCP_PUBLIC_URL = "https://mcp.example.test/mcp";
    process.env.MCP_AUTH_SERVICE_TOKEN = "service-token";
    process.env.RESUME_MODEL_SETTING_URL = "https://api.example/active";
    process.env.RESUME_MODEL_SETTING_TOKEN = "read-token";
    process.env.RESUME_MODEL_ENVIRONMENT = "production";

    let server: http.Server | undefined;
    try {
      server = startResumeMcpServer();
      listen.mockRestore();
      await new Promise<void>((resolve) =>
        server!.listen(0, "127.0.0.1", resolve),
      );
      const port = (server.address() as { port: number }).port;

      const status = await new Promise<number>((resolve, reject) => {
        const req = http.request(
          {
            hostname: "127.0.0.1",
            port,
            path: "/admin/ai-models/api/settings/1/test",
            method: "POST",
            headers: { origin: "https://mcp.example.test" },
          },
          (res) => {
            res.resume();
            res.on("end", () => resolve(res.statusCode ?? 0));
          },
        );
        req.on("error", reject);
        req.end();
      });

      expect(status).toBe(401);
    } finally {
      listen.mockRestore();
      if (server?.listening) {
        await new Promise<void>((resolve) => server!.close(() => resolve()));
      }
      for (const key of keys) {
        if (previous[key] === undefined) delete process.env[key];
        else process.env[key] = previous[key];
      }
    }
  });

  it("활성 설정 조회 주소가 없으면 정적 모델 환경변수로 대체하지 않고 시작을 거부한다", () => {
    expect(() =>
      resumeModelSourceFromEnv({
        RESUME_MODEL_URL: "https://legacy.example/generate",
        RESUME_MODEL_TOKEN: "fake-legacy-token",
      }),
    ).toThrow(/RESUME_MODEL_SETTING_URL/);
  });

  describe("resumeModelFromSetting", () => {
    const settingUrl = "https://api.example/resume-model-setting/active";
    const modelUrl = "https://openrouter.ai/api/v1/chat/completions";
    const setting = {
      provider: "openrouter",
      modelName: "vendor/model",
      url: modelUrl,
      apiKey: "model-secret",
    };
    const input = { persona: "이력서 전문 작성자", prompt: "원소를 해석한다" };

    // 모델 설정 API와 모델 API만 사용하는 가짜 네트워크
    const fakeNetwork = (overrides: Record<string, unknown> = {}) => {
      const replies: Record<string, unknown> = {
        [`${settingUrl}?environment=production`]: setting,
        [modelUrl]: { choices: [{ message: { content: "생성 문장" } }] },
        ...overrides,
      };
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

    it("활성 설정 API가 반환한 모델 이름과 실제 API 키로 호출한다", async () => {
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
      expect(
        fetchImpl.mock.calls.every(
          ([url]) => !url.includes("secretmanager.googleapis.com"),
        ),
      ).toBe(true);
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

    it.each<[string, string, (replies: Record<string, unknown>) => void]>([
      [
        "활성 설정이 없음",
        "MODEL_SETTING_NOT_FOUND",
        (replies) => {
          delete replies[settingKey];
        },
      ],
      [
        "알 수 없는 provider",
        "MISSING_MODEL_CONNECTION",
        (replies) => {
          replies[settingKey] = { ...setting, provider: "other-llm" };
        },
      ],
      [
        "API 키가 없음",
        "MODEL_SETTING_INVALID",
        (replies) => {
          replies[settingKey] = { ...setting, apiKey: undefined };
        },
      ],
    ])(
      "%s이면 모델 API를 호출하지 않고 %s로 실패한다",
      async (_label, code, breakIt) => {
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
        expect(
          fetchImpl.mock.calls.every(
            ([url]) => !url.includes("secretmanager.googleapis.com"),
          ),
        ).toBe(true);
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

      it("개발 환경은 localhost HTTP 설정 API로 연결할 수 있다", () => {
        expect(() =>
          resumeModelSourceFromEnv({
            ...dynamicEnv,
            RESUME_MODEL_ENVIRONMENT: "development",
            RESUME_MODEL_SETTING_URL:
              "http://localhost:3001/resume-model-setting/active",
          }),
        ).not.toThrow();
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

  it("동적 설정 모드에서 조회 토큰이 없으면 서버를 열지 않는다", () => {
    const keys = [
      "RESUME_CONNECTION_URL",
      "RESUME_CONNECTION_TOKEN",
      "RESUME_MODEL_SETTING_URL",
      "RESUME_MODEL_SETTING_TOKEN",
      "RESUME_MODEL_ENVIRONMENT",
      "PORTFOLIO_API_URL",
      "PORTFOLIO_API_AUTH_ISSUER",
      "MCP_PUBLIC_URL",
      "MCP_AUTH_SERVICE_TOKEN",
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
    process.env.PORTFOLIO_API_URL = "https://api.example.test";
    process.env.PORTFOLIO_API_AUTH_ISSUER = "";
    process.env.MCP_PUBLIC_URL = "https://mcp.example.test/mcp";
    process.env.MCP_AUTH_SERVICE_TOKEN = "service-token";

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
