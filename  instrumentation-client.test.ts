export {};

const mockInit = jest.fn();

jest.mock("@sentry/nextjs", () => ({
  init: (options: unknown) => mockInit(options),
}));

const load = async () => {
  process.env.SENTRY_DSN = "https://example.ingest.sentry.io/1";
  jest.resetModules();
  await import("./ instrumentation-client");

  return mockInit.mock.calls.at(-1)?.[0] as {
    dsn?: string;
    sendDefaultPii: boolean;
    integrations: unknown[];
  };
};

describe("instrumentation-client", () => {
  const originalDsn = process.env.SENTRY_DSN;

  beforeEach(() => {
    mockInit.mockClear();
  });

  afterEach(() => {
    process.env.SENTRY_DSN = originalDsn;
  });

  it("환경 변수 DSN으로 개인정보를 보내고 통합은 비운다", async () => {
    const options = await load();

    expect(options.dsn).toBe("https://example.ingest.sentry.io/1");
    expect(options.sendDefaultPii).toBe(true);
    expect(options.integrations).toEqual([]);
  });
});
