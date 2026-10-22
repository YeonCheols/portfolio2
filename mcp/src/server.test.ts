import { startResumeMcpServer } from "./server";

describe("startResumeMcpServer", () => {
  const previousUrl = process.env.RESUME_CONNECTION_URL;
  const previousToken = process.env.RESUME_CONNECTION_TOKEN;

  afterEach(() => {
    if (previousUrl === undefined) delete process.env.RESUME_CONNECTION_URL;
    else process.env.RESUME_CONNECTION_URL = previousUrl;
    if (previousToken === undefined) delete process.env.RESUME_CONNECTION_TOKEN;
    else process.env.RESUME_CONNECTION_TOKEN = previousToken;
  });

  it("연결 주소나 토큰이 없으면 서버를 열지 않는다", () => {
    delete process.env.RESUME_CONNECTION_URL;
    delete process.env.RESUME_CONNECTION_TOKEN;

    expect(() => startResumeMcpServer()).toThrow(
      "RESUME_CONNECTION_URL and RESUME_CONNECTION_TOKEN are required",
    );
  });
});
