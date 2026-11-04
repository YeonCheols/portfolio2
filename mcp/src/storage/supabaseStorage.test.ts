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
});
