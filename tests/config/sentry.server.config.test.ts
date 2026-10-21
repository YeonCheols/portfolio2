export {};

const mockInit = jest.fn();

jest.mock("@sentry/nextjs", () => ({
  init: (options: unknown) => mockInit(options),
}));

type ServerOptions = {
  dsn?: string;
  tracesSampleRate: number;
  debug: boolean;
  beforeSend: (event: { message?: string }) => { message?: string };
};

const load = async () => {
  process.env.SENTRY_DSN = "https://example.ingest.sentry.io/1";
  jest.resetModules();
  await import("../../sentry.server.config");

  return mockInit.mock.calls.at(-1)?.[0] as ServerOptions;
};

describe("sentry.server.config", () => {
  beforeEach(() => {
    jest.replaceProperty(process, "env", { ...process.env });
    mockInit.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("테스트 환경이면 디버그 없이 DSN으로 초기화한다", async () => {
    const options = await load();

    expect(options.dsn).toBe("https://example.ingest.sentry.io/1");
    expect(options.tracesSampleRate).toBe(1);
    expect(options.debug).toBe(false);
  });

  it("개발 환경이면 디버그를 켠다", async () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "development";

    const options = await load();

    expect(options.debug).toBe(true);
  });

  it("개발 환경에서 이벤트를 보내기 전에 로그를 남기고 그대로 반환한다", async () => {
    const options = await load();
    (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
    const info = jest
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const event = { message: "서버 이벤트" };

    expect(options.beforeSend(event)).toBe(event);
    expect(info).toHaveBeenCalledWith("Sentry Server Event:", event);
  });

  it("개발 환경이 아니면 로그 없이 이벤트를 반환한다", async () => {
    const options = await load();
    const info = jest
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const event = { message: "서버 이벤트" };

    expect(options.beforeSend(event)).toBe(event);
    expect(info).not.toHaveBeenCalled();
  });
});
