import {
  testModelConnection,
  type ModelConnect,
} from "@mcp/infrastructure/ai/test-model-connection";
import { modelTestConnections } from "@mcp/bootstrap/server";
import {
  ResumeConnectionError,
  type ResumeConnectionFetch,
} from "@mcp/infrastructure/connection/connection";

const setting = {
  provider: "openrouter",
  modelName: "vendor/model",
  url: "https://openrouter.ai/api/v1/chat/completions",
  apiKey: "test-api-key",
};

const reply = (text: string, raw: unknown = { id: "gen-1" }) => ({
  text,
  raw,
});

describe("testModelConnection", () => {
  it("신규 공급자도 공통 연결 테스트에서 일반·구조화 호출과 키 가림을 재사용한다", async () => {
    for (const provider of ["openai", "gemini"]) {
      const fetchImpl = jest.fn(async (_url: string, _init: RequestInit) => ({
        ok: true,
        json: async () => ({
          echo: setting.apiKey,
          choices: [{ message: { content: '{"status":"ok"}' } }],
        }),
      }));
      const result = await testModelConnection(
        { ...setting, provider },
        { connections: modelTestConnections, fetchImpl },
      );
      expect(result).toMatchObject({
        ok: true,
        structured: { ok: true },
        response: { echo: "[REDACTED]" },
      });
      expect(fetchImpl).toHaveBeenCalledTimes(2);
      expect(
        JSON.parse(String(fetchImpl.mock.calls[0][1].body)).response_format,
      ).toBeUndefined();
      expect(
        JSON.parse(String(fetchImpl.mock.calls[1][1].body)).response_format,
      ).toMatchObject({ type: "json_schema" });
      expect(JSON.stringify(result)).not.toContain(setting.apiKey);
    }
  });
  it("선택한 설정의 모델로 고정 최소 프롬프트를 보내고 성공과 소요 시간과 공급자 응답 원문을 반환한다", async () => {
    const raw = { id: "gen-1", choices: [{ message: { content: "ok" } }] };
    const connect = jest.fn<ReturnType<ModelConnect>, Parameters<ModelConnect>>(
      async () => reply("ok", raw),
    );
    const times = [1_000, 1_250];

    const result = await testModelConnection(setting, {
      connections: { openrouter: connect },
      now: () => times.shift() ?? 0,
    });

    expect(result).toMatchObject({ ok: true, latencyMs: 250, response: raw });
    const [input, options] = connect.mock.calls[0]!;
    expect(options).toMatchObject({
      url: setting.url,
      token: setting.apiKey,
      model: setting.modelName,
    });
    expect(input.persona.length).toBeGreaterThan(0);
    expect(input.prompt.length).toBeGreaterThan(0);
    expect(input.prompt.length).toBeLessThan(200);
  });

  it("일반 호출이 성공하면 json_schema 호출을 한 번 더 보내 구조화 응답 지원과 응답 원문을 반환한다", async () => {
    const basicRaw = { id: "basic" };
    const structuredRaw = { id: "structured" };
    const connect = jest
      .fn<ReturnType<ModelConnect>, Parameters<ModelConnect>>()
      .mockResolvedValueOnce(reply("ok", basicRaw))
      .mockResolvedValueOnce(reply('{"status":"ok"}', structuredRaw));
    const times = [1_000, 1_250, 2_000, 2_600];

    const result = await testModelConnection(setting, {
      connections: { openrouter: connect },
      now: () => times.shift() ?? 0,
    });

    expect(result).toEqual({
      ok: true,
      latencyMs: 250,
      response: basicRaw,
      structured: { ok: true, latencyMs: 600, response: structuredRaw },
    });
    expect(connect).toHaveBeenCalledTimes(2);
    expect(connect.mock.calls[0]![0].responseFormat).toBeUndefined();
    expect(connect.mock.calls[1]![0].responseFormat).toMatchObject({
      type: "json_schema",
      json_schema: { strict: true },
    });
  });

  it("구조화 호출만 거부되면 연결은 성공으로 두고 구조화 결과에만 오류 코드를 담는다", async () => {
    const connect = jest
      .fn<ReturnType<ModelConnect>, Parameters<ModelConnect>>()
      .mockResolvedValueOnce(reply("ok"))
      .mockRejectedValueOnce(new ResumeConnectionError("MODEL_REJECTED"));

    const result = await testModelConnection(setting, {
      connections: { openrouter: connect },
    });

    expect(result).toMatchObject({
      ok: true,
      structured: { ok: false, code: "MODEL_REJECTED" },
    });
  });

  it("구조화 응답이 약속한 JSON이 아니면 STRUCTURED_INVALID로 표시하고 받은 응답은 함께 돌려준다", async () => {
    const wrong = ["not json", "[]", "null", '{"other":"x"}', '{"status":1}'];

    for (const text of wrong) {
      const rawStructured = { id: "s", text };
      const connect = jest
        .fn<ReturnType<ModelConnect>, Parameters<ModelConnect>>()
        .mockResolvedValueOnce(reply("ok"))
        .mockResolvedValueOnce(reply(text, rawStructured));

      const result = await testModelConnection(setting, {
        connections: { openrouter: connect },
      });

      expect(result).toMatchObject({
        ok: true,
        structured: {
          ok: false,
          code: "STRUCTURED_INVALID",
          response: rawStructured,
        },
      });
    }
  });

  it("일반 호출이 실패하면 구조화 호출은 보내지 않는다", async () => {
    const connect = jest
      .fn<ReturnType<ModelConnect>, Parameters<ModelConnect>>()
      .mockRejectedValue(new ResumeConnectionError("MODEL_REJECTED"));

    const result = await testModelConnection(setting, {
      connections: { openrouter: connect },
    });

    expect(result).toEqual({ ok: false, code: "MODEL_REJECTED" });
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("응답 원문에 API 키가 섞여 있으면 일반·구조화 응답 모두에서 가리고 나머지는 그대로 둔다", async () => {
    const echoed = {
      id: "gen-1",
      echo: { authorization: `Bearer ${setting.apiKey}` },
      choices: [{ message: { content: "ok" } }],
    };
    const connect = jest
      .fn<ReturnType<ModelConnect>, Parameters<ModelConnect>>()
      .mockResolvedValueOnce(reply("ok", echoed))
      .mockResolvedValueOnce(reply('{"status":"ok"}', echoed));

    const result = await testModelConnection(setting, {
      connections: { openrouter: connect },
    });

    const expected = {
      id: "gen-1",
      echo: { authorization: "Bearer [REDACTED]" },
      choices: [{ message: { content: "ok" } }],
    };
    expect(result).toMatchObject({
      response: expected,
      structured: { response: expected },
    });
    expect(JSON.stringify(result)).not.toContain(setting.apiKey);
  });

  it("키가 비어 있어도 응답 원문을 글자 단위로 망가뜨리지 않는다", async () => {
    const raw = { id: "gen-1", text: "ok" };
    const connect = jest
      .fn<ReturnType<ModelConnect>, Parameters<ModelConnect>>()
      .mockResolvedValue(reply('{"status":"ok"}', raw));

    const result = await testModelConnection(
      { ...setting, apiKey: "" },
      { connections: { openrouter: connect } },
    );

    expect(result).toMatchObject({ ok: true, response: raw });
  });

  it("응답 원문이 너무 크면 앞부분만 남기고 잘렸음을 표시한다", async () => {
    const huge = { id: "gen-1", blob: "x".repeat(50_000) };
    const connect = jest
      .fn<ReturnType<ModelConnect>, Parameters<ModelConnect>>()
      .mockResolvedValue(reply('{"status":"ok"}', huge));

    const result = await testModelConnection(setting, {
      connections: { openrouter: connect },
    });

    expect(result).toMatchObject({
      ok: true,
      response: { truncated: true, preview: expect.any(String) },
    });
    const serialized = JSON.stringify(result);
    expect(serialized.length).toBeLessThan(10_000);
    expect(serialized).not.toContain("x".repeat(3_000));
  });

  it("공급자가 거부하면 연결 오류 코드만 실패 결과로 반환한다", async () => {
    const connect: ModelConnect = async () => {
      throw new ResumeConnectionError("MODEL_REJECTED");
    };

    const result = await testModelConnection(setting, {
      connections: { openrouter: connect },
    });

    expect(result).toEqual({ ok: false, code: "MODEL_REJECTED" });
  });

  it("예기치 않은 오류는 MODEL_UNAVAILABLE로 바꾸고 오류 메시지의 키와 주소를 결과에 싣지 않는다", async () => {
    const connect: ModelConnect = async () => {
      throw new Error(`fetch failed ${setting.url} ${setting.apiKey}`);
    };

    const result = await testModelConnection(setting, {
      connections: { openrouter: connect },
    });

    expect(result).toEqual({ ok: false, code: "MODEL_UNAVAILABLE" });
    expect(JSON.stringify(result)).not.toContain(setting.apiKey);
    expect(JSON.stringify(result)).not.toContain(setting.url);
  });

  it("제한 시간 안에 응답이 없으면 요청을 중단하고 MODEL_TIMEOUT을 반환한다", async () => {
    const hangingFetch: ResumeConnectionFetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () =>
          reject(new Error("aborted")),
        );
      });
    const connect: ModelConnect = async (_input, options) => {
      await options.fetchImpl!(options.url, { method: "POST" });
      return reply("ok");
    };

    const result = await testModelConnection(setting, {
      connections: { openrouter: connect },
      fetchImpl: hangingFetch,
      timeoutMs: 20,
    });

    expect(result).toEqual({ ok: false, code: "MODEL_TIMEOUT" });
  });

  it("알 수 없는 공급자는 모델을 호출하지 않고 MISSING_MODEL_CONNECTION을 반환한다", async () => {
    const connect = jest.fn<ReturnType<ModelConnect>, Parameters<ModelConnect>>(
      async () => reply("ok"),
    );

    const result = await testModelConnection(
      { ...setting, provider: "unknown" },
      { connections: { openrouter: connect } },
    );

    expect(result).toEqual({ ok: false, code: "MISSING_MODEL_CONNECTION" });
    expect(connect).not.toHaveBeenCalled();
  });
});
