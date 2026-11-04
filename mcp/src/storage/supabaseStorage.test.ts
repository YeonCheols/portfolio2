/** @jest-environment node */
import { createSupabaseStorage } from "@mcp/storage/supabaseStorage";

describe("Supabase Storage", () => {
  it("저장 JSON을 읽고 같은 비공개 객체를 가리키는 만료 URL을 발급한다", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ response: "invalid {" })),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            signedURL: "/object/sign/mcp/debug/resume/run.json?token=fake",
          }),
        ),
      );
    const storage = createSupabaseStorage({
      url: "https://storage.example.test",
      secretKey: "sb_secret_fake",
      bucket: "mcp",
      fetchImpl,
    });
    await expect(storage.getJson("debug/resume/run.json")).resolves.toEqual({
      response: "invalid {",
    });
    await expect(
      storage.createSignedUrl("debug/resume/run.json"),
    ).resolves.toBe(
      "https://storage.example.test/storage/v1/object/sign/mcp/debug/resume/run.json?token=fake",
    );
    expect(fetchImpl.mock.calls[1][1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ expiresIn: 300 }),
    });
  });
  it("경로 탈출과 인증정보가 섞인 URL을 요청 전에 거부하고 네트워크 오류를 값 없이 반환한다", async () => {
    const fetchImpl = jest.fn(async () => {
      throw new Error("provider leaked sb_secret_fake");
    });
    expect(() =>
      createSupabaseStorage({
        url: "https://user:password@storage.example.test",
        secretKey: "sb_secret_fake",
        bucket: "mcp",
        fetchImpl,
      }),
    ).toThrow("STORAGE_CONFIG_INVALID");
    const storage = createSupabaseStorage({
      url: "https://storage.example.test",
      secretKey: "sb_secret_fake",
      bucket: "mcp",
      fetchImpl,
    });
    for (const path of [
      "../other",
      "debug/../other",
      "/other",
      "debug/%2e%2e/other",
      "debug/key?token=secret",
    ]) {
      await expect(storage.putJson(path, {})).rejects.toThrow(
        "STORAGE_PATH_INVALID",
      );
    }
    expect(fetchImpl).not.toHaveBeenCalled();
    await expect(storage.putJson("debug/resume/test.json", {})).rejects.toThrow(
      "STORAGE_WRITE_FAILED",
    );
  });
  it("공통 버킷에 JSON을 업로드하고 서버 키는 요청 헤더에서만 사용한다", async () => {
    const fetchImpl = jest.fn(async () => new Response("{}"));
    const storage = createSupabaseStorage({
      url: "https://storage.example.test",
      secretKey: "sb_secret_fake",
      bucket: "mcp",
      fetchImpl,
    });
    await storage.putJson("debug/resume/run/response.json", {
      response: "broken JSON {",
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://storage.example.test/storage/v1/object/mcp/debug/resume/run/response.json",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: "sb_secret_fake",
          "content-type": "application/json",
        }),
        body: JSON.stringify({ response: "broken JSON {" }),
        redirect: "error",
      }),
    );
  });
  it("prefix 바로 아래 항목을 폴더와 파일로 나눠 반환하고 페이지 범위를 요청에 담는다", async () => {
    const fetchImpl = jest.fn(
      async () =>
        new Response(
          JSON.stringify([
            { name: "gen-1", id: null },
            { name: "001-started.json", id: "obj-1" },
          ]),
        ),
    );
    const storage = createSupabaseStorage({
      url: "https://storage.example.test",
      secretKey: "sb_secret_fake",
      bucket: "mcp",
      fetchImpl,
    });
    await expect(
      storage.listObjects("debug/resume/development", {
        limit: 20,
        offset: 40,
      }),
    ).resolves.toEqual([
      { name: "gen-1", kind: "folder" },
      { name: "001-started.json", kind: "file" },
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://storage.example.test/storage/v1/object/list/mcp",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          prefix: "debug/resume/development",
          limit: 20,
          offset: 40,
          sortBy: { column: "name", order: "asc" },
        }),
      }),
    );
  });
  it("파일 항목에는 저장소가 준 생성 시각을 담고 폴더와 시각이 없는 항목은 생략한다", async () => {
    const fetchImpl = jest.fn(
      async () =>
        new Response(
          JSON.stringify([
            { name: "gen-1", id: null },
            {
              name: "001-started.json",
              id: "obj-1",
              created_at: "2026-11-04T01:00:00.000Z",
            },
            { name: "002-failed.json", id: "obj-2" },
          ]),
        ),
    );
    const storage = createSupabaseStorage({
      url: "https://storage.example.test",
      secretKey: "sb_secret_fake",
      bucket: "mcp",
      fetchImpl,
    });
    await expect(
      storage.listObjects("debug/resume/development", { limit: 20, offset: 0 }),
    ).resolves.toEqual([
      { name: "gen-1", kind: "folder" },
      {
        name: "001-started.json",
        kind: "file",
        createdAt: "2026-11-04T01:00:00.000Z",
      },
      { name: "002-failed.json", kind: "file" },
    ]);
  });
  it("목록 prefix의 경로 탈출을 요청 전에 거부하고 저장소 오류는 값 없이 반환한다", async () => {
    const fetchImpl = jest.fn(async () => new Response("{}", { status: 500 }));
    const storage = createSupabaseStorage({
      url: "https://storage.example.test",
      secretKey: "sb_secret_fake",
      bucket: "mcp",
      fetchImpl,
    });
    await expect(
      storage.listObjects("debug/../other", { limit: 20, offset: 0 }),
    ).rejects.toThrow("STORAGE_PATH_INVALID");
    expect(fetchImpl).not.toHaveBeenCalled();
    await expect(
      storage.listObjects("debug/resume", { limit: 20, offset: 0 }),
    ).rejects.toThrow("STORAGE_LIST_FAILED");
  });
  it("여러 객체를 한 번의 삭제 요청으로 지우고 저장소가 지웠다고 알린 경로만 반환한다", async () => {
    const fetchImpl = jest.fn(
      async () =>
        new Response(JSON.stringify([{ name: "debug/resume/a/1.json" }])),
    );
    const storage = createSupabaseStorage({
      url: "https://storage.example.test",
      secretKey: "sb_secret_fake",
      bucket: "mcp",
      fetchImpl,
    });

    await expect(
      storage.removeObjects(["debug/resume/a/1.json", "debug/resume/a/2.json"]),
    ).resolves.toEqual(["debug/resume/a/1.json"]);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://storage.example.test/storage/v1/object/mcp",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({
          prefixes: ["debug/resume/a/1.json", "debug/resume/a/2.json"],
        }),
      }),
    );
    fetchImpl.mockClear();
    await expect(storage.removeObjects([])).resolves.toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("삭제 경로의 탈출은 요청 전에 거부하고 저장소 오류는 값 없이 반환한다", async () => {
    const fetchImpl = jest.fn(async () => new Response("{}", { status: 500 }));
    const storage = createSupabaseStorage({
      url: "https://storage.example.test",
      secretKey: "sb_secret_fake",
      bucket: "mcp",
      fetchImpl,
    });
    await expect(
      storage.removeObjects(["debug/resume/a/1.json", "../other.json"]),
    ).rejects.toThrow("STORAGE_PATH_INVALID");
    expect(fetchImpl).not.toHaveBeenCalled();
    await expect(
      storage.removeObjects(["debug/resume/a/1.json"]),
    ).rejects.toThrow("STORAGE_DELETE_FAILED");
  });
  it("버킷이 비공개로 설정돼 있을 때만 점검을 통과하고 공개이거나 값을 알 수 없으면 거부한다", async () => {
    const respond = (body: unknown, status = 200) =>
      jest.fn(async () => new Response(JSON.stringify(body), { status }));
    const storageWith = (fetchImpl: ReturnType<typeof respond>) =>
      createSupabaseStorage({
        url: "https://storage.example.test",
        secretKey: "sb_secret_fake",
        bucket: "mcp",
        fetchImpl,
      });

    const privateFetch = respond({ id: "mcp", public: false });
    await expect(
      storageWith(privateFetch).assertBucketPrivate(),
    ).resolves.toBeUndefined();
    expect(privateFetch).toHaveBeenCalledWith(
      "https://storage.example.test/storage/v1/bucket/mcp",
      expect.objectContaining({ method: "GET", redirect: "error" }),
    );

    for (const body of [{ public: true }, {}, { public: "false" }]) {
      await expect(
        storageWith(respond(body)).assertBucketPrivate(),
      ).rejects.toThrow("STORAGE_BUCKET_PUBLIC");
    }
    await expect(
      storageWith(respond({}, 500)).assertBucketPrivate(),
    ).rejects.toThrow("STORAGE_BUCKET_CHECK_FAILED");
    await expect(
      storageWith(
        jest.fn(async () => new Response("not json")),
      ).assertBucketPrivate(),
    ).rejects.toThrow("STORAGE_BUCKET_CHECK_FAILED");
  });
  it("저장소가 공개 경로나 다른 객체를 가리키는 서명 주소를 돌려주면 발급을 거부한다", async () => {
    for (const signedURL of [
      "/object/public/mcp/debug/resume/run.json?token=fake",
      "/object/sign/mcp/debug/resume/other.json?token=fake",
      "/object/sign/mcp/debug/resume/run.json",
    ]) {
      const storage = createSupabaseStorage({
        url: "https://storage.example.test",
        secretKey: "sb_secret_fake",
        bucket: "mcp",
        fetchImpl: jest.fn(
          async () => new Response(JSON.stringify({ signedURL })),
        ),
      });
      await expect(
        storage.createSignedUrl("debug/resume/run.json"),
      ).rejects.toThrow("STORAGE_SIGN_FAILED");
    }
  });
  it("같은 경로에 이미 객체가 있어 거부된 쓰기는 다른 쓰기 오류와 구분해 알린다", async () => {
    const respond = (body: unknown, status: number) =>
      jest.fn(async () => new Response(JSON.stringify(body), { status }));
    const storageWith = (fetchImpl: ReturnType<typeof respond>) =>
      createSupabaseStorage({
        url: "https://storage.example.test",
        secretKey: "sb_secret_fake",
        bucket: "mcp",
        fetchImpl,
      });
    const duplicate = {
      statusCode: "409",
      error: "Duplicate",
      message: "The resource already exists",
    };

    // Supabase는 중복을 상태 400에 본문 error: Duplicate로 알린다
    for (const [body, status] of [
      [duplicate, 400],
      [{ error: "x" }, 409],
    ] as const) {
      await expect(
        storageWith(respond(body, status)).putJson("debug/resume/a.json", {}),
      ).rejects.toThrow("STORAGE_OBJECT_EXISTS");
    }
    for (const [body, status] of [
      [{ error: "Internal", message: "sb_secret_fake leak" }, 500],
      [{ error: "Bad", message: "other" }, 400],
    ] as const) {
      const error = await storageWith(respond(body, status))
        .putJson("debug/resume/a.json", {})
        .catch((cause: Error) => cause);
      expect((error as Error).message).toBe("STORAGE_WRITE_FAILED");
    }
  });
});
