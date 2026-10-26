import fs from "fs";
import path from "path";

import {
  resumeModelFromEnv,
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

  it("OpenRouter 채팅 주소는 메시지 본문으로 보내고 응답 문장만 받는다", async () => {
    const fetchImpl = jest.fn<
      Promise<{ json: () => Promise<unknown> }>,
      [string, RequestInit]
    >(async () => ({
      json: async () => ({
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
          model: "openrouter/free",
          messages: [
            { role: "system", content: "이력서 전문 작성자" },
            { role: "user", content: "원소를 해석한다" },
          ],
        }),
      }),
    );
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
    expect(deploy).not.toContain(
      "RESUME_MODEL_TOKEN=RESUME_MODEL_TOKEN:latest",
    );
    expect(deploy.toLowerCase()).not.toContain("openrouter");
    expect(deploy).not.toMatch(/sk-[A-Za-z0-9]/);
  });

  it("연결 주소나 토큰이 없으면 서버를 열지 않는다", () => {
    delete process.env.RESUME_CONNECTION_URL;
    delete process.env.RESUME_CONNECTION_TOKEN;

    expect(() => startResumeMcpServer()).toThrow(
      "RESUME_CONNECTION_URL and RESUME_CONNECTION_TOKEN are required",
    );
  });
});
