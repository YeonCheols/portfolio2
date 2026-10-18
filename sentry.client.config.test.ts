jest.mock("@sentry/nextjs", () => ({
  init: jest.fn(),
}));

import * as Sentry from "@sentry/nextjs";

import "./sentry.client.config";

const mockInit = Sentry.init as jest.Mock;

type ClientOptions = {
  dsn: string;
  tracesSampleRate: number;
  debug: boolean;
  replaysOnErrorSampleRate: number;
  replaysSessionSampleRate: number;
  attachStacktrace: boolean;
  includeLocalVariables: boolean;
  beforeSend: (event: { type?: string; message?: string; level?: string }) => {
    type?: string;
    message?: string;
    level?: string;
  };
  beforeBreadcrumb: (breadcrumb: { category?: string }) => {
    category?: string;
  };
};

const options = mockInit.mock.calls[0][0] as ClientOptions;

describe("sentry.client.config", () => {
  it("디버그와 트레이스를 켜고 리플레이는 끈다", () => {
    expect(options.dsn).toContain("ingest.us.sentry.io");
    expect(options.tracesSampleRate).toBe(1);
    expect(options.debug).toBe(true);
    expect(options.replaysOnErrorSampleRate).toBe(0);
    expect(options.replaysSessionSampleRate).toBe(0);
    expect(options.attachStacktrace).toBe(true);
    expect(options.includeLocalVariables).toBe(true);
  });

  it("로그 메시지면 내용을 출력하고 이벤트를 그대로 보낸다", () => {
    const info = jest
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const event = { type: "message", message: "로그", level: "info" };

    expect(options.beforeSend(event)).toBe(event);
    expect(info).toHaveBeenCalledWith("Log message detected:", "로그");
    expect(info).toHaveBeenCalledWith("Log level:", "info");

    info.mockRestore();
  });

  it("로그가 아니면 추가 출력 없이 이벤트를 보낸다", () => {
    const info = jest
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const event = { type: "error" };

    expect(options.beforeSend(event)).toBe(event);
    expect(info).not.toHaveBeenCalled();

    info.mockRestore();
  });

  it("브레드크럼을 그대로 반환한다", () => {
    const breadcrumb = { category: "ui" };

    expect(options.beforeBreadcrumb(breadcrumb)).toBe(breadcrumb);
  });
});
