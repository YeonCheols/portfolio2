export {};

const mockInit = jest.fn();

jest.mock("@sentry/nextjs", () => ({
  init: (options: unknown) => mockInit(options),
}));

const load = async () => {
  process.env.SENTRY_DSN = "https://example.ingest.sentry.io/1";
  jest.resetModules();
  await import("../../sentry.edge.config");

  return mockInit.mock.calls.at(-1)?.[0] as {
    dsn?: string;
    tracesSampleRate: number;
    debug: boolean;
  };
};

describe("sentry.edge.config", () => {
  beforeEach(() => {
    jest.replaceProperty(process, "env", { ...process.env });
    mockInit.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("환경 변수 DSN으로 트레이스만 켜고 디버그는 끈다", async () => {
    const options = await load();

    expect(options.dsn).toBe("https://example.ingest.sentry.io/1");
    expect(options.tracesSampleRate).toBe(1);
    expect(options.debug).toBe(false);
  });
});
