export {};

const mockInit = jest.fn();

jest.mock("@sentry/nextjs", () => ({
  init: (options: unknown) => mockInit(options),
}));

const load = async () => {
  process.env.SENTRY_DSN = "https://example.ingest.sentry.io/1";
  jest.resetModules();
  await import("./ sentry.server.config");

  return mockInit.mock.calls.at(-1)?.[0] as {
    dsn?: string;
    sendDefaultPii: boolean;
  };
};

describe("sentry.server.config with leading space", () => {
  const originalDsn = process.env.SENTRY_DSN;

  beforeEach(() => {
    mockInit.mockClear();
  });

  afterEach(() => {
    process.env.SENTRY_DSN = originalDsn;
  });

  it("환경 변수 DSN으로 개인정보를 보내게 초기화한다", async () => {
    const options = await load();

    expect(options.dsn).toBe("https://example.ingest.sentry.io/1");
    expect(options.sendDefaultPii).toBe(true);
  });
});
