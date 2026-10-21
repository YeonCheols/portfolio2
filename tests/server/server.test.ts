export {};

type Listen = (port: number, callback: (error?: Error) => void) => void;

const loadServer = async ({
  certificates,
  interfaces,
  listenError,
}: {
  certificates: boolean;
  interfaces: Record<
    string,
    Array<{ family: string | number; internal: boolean; address: string }>
  >;
  listenError?: Error;
}) => {
  jest.resetModules();

  const handle = jest.fn();
  const next = jest.fn(() => ({
    prepare: () => Promise.resolve(),
    getRequestHandler: () => handle,
  }));
  const caught: Error[] = [];
  const listen: Listen = (port, callback) => {
    try {
      callback(listenError);
    } catch (error) {
      caught.push(error as Error);
    }
    void port;
  };
  const httpCreateServer = jest.fn(
    (_listener: (req: { url?: string }, res: object) => void) => ({ listen }),
  );
  const httpsCreateServer = jest.fn(
    (
      _options: object,
      _listener: (req: { url?: string }, res: object) => void,
    ) => ({ listen }),
  );
  const existsSync = jest.fn(
    (file: string) => certificates && String(file).startsWith("./cert/"),
  );
  const readFileSync = jest.fn(() => Buffer.from("pem"));

  jest.doMock("next", () => next);
  jest.doMock("fs", () => ({ existsSync, readFileSync }));
  jest.doMock("http", () => ({ createServer: httpCreateServer }));
  jest.doMock("https", () => ({ createServer: httpsCreateServer }));
  jest.doMock("os", () => ({
    networkInterfaces: () => interfaces,
  }));

  jest.isolateModules(() => {
    require("../../server");
  });
  await Promise.resolve();

  return {
    handle,
    next,
    httpCreateServer,
    httpsCreateServer,
    readFileSync,
    caught,
  };
};

const ipv4 = {
  en0: [{ family: "IPv4" as const, internal: false, address: "192.168.0.10" }],
};

describe("server", () => {
  let info: jest.SpyInstance;

  beforeEach(() => {
    info = jest.spyOn(console, "info").mockImplementation(() => undefined);
  });

  afterEach(() => {
    info.mockRestore();
    jest.dontMock("next");
    jest.dontMock("fs");
    jest.dontMock("http");
    jest.dontMock("https");
    jest.dontMock("os");
    jest.resetModules();
  });

  it("인증서가 없으면 HTTP로 3001 포트와 로컬 주소를 연다", async () => {
    const loaded = await loadServer({
      certificates: false,
      interfaces: ipv4,
    });

    expect(loaded.next).toHaveBeenCalledWith({ dev: true });
    expect(loaded.httpCreateServer).toHaveBeenCalledTimes(1);
    expect(loaded.httpsCreateServer).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith(
      expect.stringContaining("http://local.ycseng.com:3001"),
    );
    expect(info).toHaveBeenCalledWith(
      expect.stringContaining("http://192.168.0.10:3001"),
    );
  });

  it("인증서가 있으면 HTTPS로 키를 읽어 같은 포트를 연다", async () => {
    const loaded = await loadServer({
      certificates: true,
      interfaces: ipv4,
    });

    expect(loaded.httpsCreateServer).toHaveBeenCalledWith(
      expect.objectContaining({
        requestCert: false,
        rejectUnauthorized: false,
      }),
      expect.any(Function),
    );
    expect(loaded.readFileSync).toHaveBeenCalledWith(
      "./cert/local.ycseng.com-key.pem",
    );
    expect(loaded.readFileSync).toHaveBeenCalledWith(
      "./cert/local.ycseng.com.pem",
    );
    expect(loaded.httpCreateServer).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith(
      expect.stringContaining("https://local.ycseng.com:3001"),
    );
  });

  it("외부 IPv4가 없으면 루프백 주소를 안내한다", async () => {
    await loadServer({
      certificates: false,
      interfaces: {
        lo0: [{ family: "IPv4", internal: true, address: "127.0.0.1" }],
        en0: [{ family: "IPv6", internal: false, address: "fe80::1" }],
      },
    });

    expect(info).toHaveBeenCalledWith(
      expect.stringContaining("http://127.0.0.1:3001"),
    );
  });

  it("family가 숫자 4인 주소를 로컬 주소로 쓴다", async () => {
    await loadServer({
      certificates: false,
      interfaces: {
        en0: [{ family: 4, internal: false, address: "10.0.0.8" }],
      },
    });

    expect(info).toHaveBeenCalledWith(
      expect.stringContaining("http://10.0.0.8:3001"),
    );
  });

  it("요청이 오면 파싱된 URL을 next 핸들러에 넘긴다", async () => {
    const loaded = await loadServer({
      certificates: false,
      interfaces: ipv4,
    });
    const listener = loaded.httpCreateServer.mock.calls[0][0];
    const req = { url: "/about?x=1" };
    const res = {};

    listener(req, res);

    expect(loaded.handle).toHaveBeenCalledWith(
      req,
      res,
      expect.objectContaining({
        pathname: "/about",
        query: { x: "1" },
      }),
    );
  });

  it("포트 대기에 실패하면 그 오류를 던진다", async () => {
    const error = new Error("bind");
    const loaded = await loadServer({
      certificates: false,
      interfaces: ipv4,
      listenError: error,
    });

    expect(loaded.caught).toEqual([error]);
  });
});
