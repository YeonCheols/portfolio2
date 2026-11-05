import { createResumeToolPolicy } from "@mcp/modules/resume/tool-policy/resume-tool-policy";

const known = ["validate_resume_xml", "generate_resume", "render_resume_form"];

const notFound = () =>
  Object.assign(new Error("STORAGE_OBJECT_NOT_FOUND"), {
    code: "STORAGE_OBJECT_NOT_FOUND",
  });

const setup = (environment: "development" | "production" = "development") => {
  const files = new Map<string, unknown>();
  let failReads = false;
  const storage = {
    getJson: jest.fn(async (path: string) => {
      if (failReads)
        throw Object.assign(new Error("STORAGE_READ_FAILED"), {
          code: "STORAGE_READ_FAILED",
        });
      if (!files.has(path)) throw notFound();
      return structuredClone(files.get(path));
    }),
    putJsonOverwrite: jest.fn(async (path: string, value: unknown) => {
      files.set(path, structuredClone(value));
    }),
  };
  let now = 1_000_000;
  const policy = createResumeToolPolicy({
    storage,
    environment,
    knownTools: known,
    now: () => now,
  });
  return {
    files,
    storage,
    policy,
    advance: (ms: number) => {
      now += ms;
    },
    failReads: (value: boolean) => {
      failReads = value;
    },
  };
};

const path = "tools/resume/development/policy.json";

describe("이력서 도구 활성 정책", () => {
  it("정책 파일이 아직 없으면 모든 도구가 활성이고 10초 동안은 다시 읽지 않는다", async () => {
    const { policy, storage, advance } = setup();

    expect([...(await policy.disabledNames())]).toEqual([]);
    advance(9_999);
    await policy.disabledNames();
    expect(storage.getJson).toHaveBeenCalledTimes(1);
    expect(storage.getJson).toHaveBeenCalledWith(path);

    advance(1);
    await policy.disabledNames();
    expect(storage.getJson).toHaveBeenCalledTimes(2);
  });

  it("도구를 끄면 정책 파일을 덮어쓰고 같은 인스턴스는 바로 반영하며 다시 켜면 목록에서 뺀다", async () => {
    const { policy, storage, files } = setup();
    await policy.disabledNames();
    storage.getJson.mockClear();

    await policy.setEnabled("generate_resume", false, "hash-of-admin");

    expect(storage.putJsonOverwrite).toHaveBeenCalledTimes(1);
    expect(files.get(path)).toEqual({
      disabled: ["generate_resume"],
      updatedAt: new Date(1_000_000).toISOString(),
      updatedBy: "hash-of-admin",
    });
    expect([...(await policy.disabledNames())]).toEqual(["generate_resume"]);

    await policy.setEnabled("generate_resume", true, "hash-of-admin");
    expect([...(await policy.disabledNames())]).toEqual([]);
    expect((files.get(path) as { disabled: string[] }).disabled).toEqual([]);
  });

  it("저장 전에 최신 정책을 다시 읽어 다른 인스턴스가 바꾼 항목을 잃지 않는다", async () => {
    const { policy, files } = setup();
    await policy.disabledNames();
    files.set(path, {
      disabled: ["validate_resume_xml"],
      updatedAt: "2026-11-05T00:00:00.000Z",
      updatedBy: "other",
    });

    await policy.setEnabled("generate_resume", false, "me");

    expect((files.get(path) as { disabled: string[] }).disabled.sort()).toEqual(
      ["generate_resume", "validate_resume_xml"],
    );
  });

  it("알 수 없는 도구 이름은 저장 없이 거부한다", async () => {
    const { policy, storage } = setup();

    await expect(
      policy.setEnabled("../secret", false, "me"),
    ).rejects.toMatchObject({ code: "UNKNOWN_TOOL" });
    expect(storage.putJsonOverwrite).not.toHaveBeenCalled();
  });

  it("개발과 운영은 서로 다른 경로를 쓴다", async () => {
    const dev = setup("development");
    const prod = setup("production");

    await dev.policy.setEnabled("generate_resume", false, "me");

    expect(dev.files.has("tools/resume/development/policy.json")).toBe(true);
    expect(prod.files.size).toBe(0);
    await prod.policy.setEnabled("render_resume_form", false, "me");
    expect(prod.files.has("tools/resume/production/policy.json")).toBe(true);
  });

  it("읽기 실패 때 이전 정상 정책은 유지하고 처음부터 읽지 못하거나 손상된 정책이면 도구를 열지 않는다", async () => {
    const stale = setup();
    await stale.policy.setEnabled("generate_resume", false, "me");
    stale.advance(10_000);
    stale.failReads(true);
    expect([...(await stale.policy.disabledNames())]).toEqual([
      "generate_resume",
    ]);

    const first = setup();
    first.failReads(true);
    await expect(first.policy.disabledNames()).rejects.toMatchObject({
      code: "TOOL_POLICY_UNAVAILABLE",
    });

    const broken = setup();
    broken.files.set(path, { disabled: "not-an-array" });
    await expect(broken.policy.disabledNames()).rejects.toMatchObject({
      code: "TOOL_POLICY_UNAVAILABLE",
    });
  });

  it("동시에 여러 요청이 와도 정책은 한 번만 읽는다", async () => {
    const { policy, storage } = setup();

    await Promise.all([
      policy.disabledNames(),
      policy.disabledNames(),
      policy.disabledNames(),
    ]);

    expect(storage.getJson).toHaveBeenCalledTimes(1);
  });
});
