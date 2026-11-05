import { createFakeArchiveStorage } from "@mcp/modules/resume/testing/fake-archive-storage";
import { createResumeToolPresets } from "@mcp/modules/resume/tool-presets/resume-tool-presets";

const known = ["validate_resume_xml", "generate_resume"];
const base = "tools/resume/development/presets";

const setup = (
  environment: "development" | "production" = "development",
  initial: Record<string, unknown> = {},
) => {
  const storage = createFakeArchiveStorage(initial);
  let seq = 0;
  let clock = Date.UTC(2026, 10, 5, 0, 0, 0);
  const presets = createResumeToolPresets({
    storage,
    environment,
    knownTools: known,
    // 도구 샘플의 XML만 프리셋에 저장할 수 있다
    sampleXml: (toolName: string) =>
      toolName === "generate_resume" ? sampleXml : undefined,
    now: () => (clock += 1000),
    newId: () => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`,
  });
  return { storage, presets };
};

const sampleXml = "<resumeAsset>가상의 샘플 이력서</resumeAsset>";
const args = {
  source: "embedded",
  xml: sampleXml,
  elementIds: ["profile-sample"],
};

describe("이력서 도구 프리셋", () => {
  it("저장 시점의 입력 인자를 그대로 별도 객체로 저장하고 불러오면 같은 값을 돌려준다", async () => {
    const { presets, storage } = setup();

    const saved = await presets.save(
      { toolName: "generate_resume", label: "기본 시험", arguments: args },
      "hash-of-admin",
    );

    expect(saved).toEqual({
      id: "00000000-0000-4000-8000-000000000001",
      label: "기본 시험",
      arguments: args,
      createdAt: expect.any(String),
    });
    const path = `${base}/generate_resume/${saved.id}.json`;
    expect(storage.objects.get(path)?.body).toMatchObject({
      toolName: "generate_resume",
      label: "기본 시험",
      arguments: args,
      createdBy: "hash-of-admin",
    });
    expect((await presets.list("generate_resume"))[0].arguments).toEqual(args);
    // 프리셋은 불변 객체라 덮어쓰지 않는다
    expect(storage.calls.putJson).toBe(1);
  });

  it("도구별로 최신순으로 목록을 돌려주고 작성자 해시는 싣지 않는다", async () => {
    const { presets } = setup();
    const first = await presets.save(
      { toolName: "generate_resume", label: "첫째", arguments: { a: 1 } },
      "me",
    );
    const second = await presets.save(
      { toolName: "generate_resume", label: "둘째", arguments: { a: 2 } },
      "me",
    );
    await presets.save(
      { toolName: "validate_resume_xml", label: "다른 도구", arguments: {} },
      "me",
    );

    const listed = await presets.list("generate_resume");
    expect(listed.map((p) => p.label)).toEqual(["둘째", "첫째"]);
    expect(listed[0]).toEqual({
      id: second.id,
      label: "둘째",
      arguments: { a: 2 },
      createdAt: expect.any(String),
    });
    expect(JSON.stringify(listed)).not.toContain("createdBy");
  });

  it("알 수 없는 도구, 잘못된 이름·인자, 너무 큰 인자, 개수 초과는 저장하지 않는다", async () => {
    const { presets, storage } = setup();
    const bad = async (input: Parameters<typeof presets.save>[0]) =>
      presets.save(input, "me").catch((error: { code?: string }) => error.code);

    expect(await bad({ toolName: "../x", label: "a", arguments: {} })).toBe(
      "UNKNOWN_TOOL",
    );
    expect(
      await bad({ toolName: "generate_resume", label: "  ", arguments: {} }),
    ).toBe("INVALID_PRESET");
    expect(
      await bad({
        toolName: "generate_resume",
        label: "가".repeat(61),
        arguments: {},
      }),
    ).toBe("INVALID_PRESET");
    expect(
      await bad({
        toolName: "generate_resume",
        label: "a",
        arguments: [] as never,
      }),
    ).toBe("INVALID_PRESET");
    expect(
      await bad({
        toolName: "generate_resume",
        label: "a",
        arguments: { big: "x".repeat(70_000) },
      }),
    ).toBe("PRESET_TOO_LARGE");
    expect(storage.calls.putJson).toBe(0);

    for (let i = 0; i < 30; i += 1)
      await presets.save(
        { toolName: "generate_resume", label: `p${i}`, arguments: {} },
        "me",
      );
    expect(
      await bad({ toolName: "generate_resume", label: "넘침", arguments: {} }),
    ).toBe("PRESET_LIMIT");
    expect(storage.calls.putJson).toBe(30);
  });

  it("삭제는 지정한 프리셋 객체 하나만 지우고 없거나 지워지지 않으면 성공으로 알리지 않는다", async () => {
    const { presets, storage } = setup();
    const a = await presets.save(
      { toolName: "generate_resume", label: "a", arguments: {} },
      "me",
    );
    const b = await presets.save(
      { toolName: "generate_resume", label: "b", arguments: {} },
      "me",
    );
    const other = await presets.save(
      { toolName: "validate_resume_xml", label: "o", arguments: {} },
      "me",
    );

    await presets.remove("generate_resume", a.id);

    expect((await presets.list("generate_resume")).map((p) => p.id)).toEqual([
      b.id,
    ]);
    expect(
      storage.objects.has(`${base}/validate_resume_xml/${other.id}.json`),
    ).toBe(true);

    const code = (promise: Promise<unknown>) =>
      promise.catch((error: { code?: string }) => error.code);
    expect(await code(presets.remove("generate_resume", a.id))).toBe(
      "PRESET_NOT_FOUND",
    );
    expect(await code(presets.remove("generate_resume", "../../etc"))).toBe(
      "INVALID_PRESET",
    );
    expect(await code(presets.remove("nope", b.id))).toBe("UNKNOWN_TOOL");

    storage.failures.removeBatch = true;
    expect(await code(presets.remove("generate_resume", b.id))).toBe(
      "PRESET_DELETE_FAILED",
    );
  });

  it("손상된 프리셋 객체는 목록에서 건너뛰고 저장소 장애는 값 없이 알리며 환경별 경로를 쓴다", async () => {
    const { presets } = setup("development", {
      [`${base}/generate_resume/00000000-0000-4000-8000-0000000000aa.json`]: {
        broken: true,
      },
      [`${base}/generate_resume/00000000-0000-4000-8000-0000000000bb.json`]: {
        toolName: "generate_resume",
        label: "정상",
        arguments: { x: 1 },
        createdAt: "2026-11-05T00:00:00.000Z",
        createdBy: "h",
      },
    });
    expect((await presets.list("generate_resume")).map((p) => p.label)).toEqual(
      ["정상"],
    );

    const failing = createResumeToolPresets({
      storage: {
        ...createFakeArchiveStorage(),
        listObjects: async () => {
          throw new Error("secret upstream body");
        },
      },
      environment: "production",
      knownTools: known,
    });
    const error = await failing
      .list("generate_resume")
      .catch((e: { code?: string; message: string }) => e);
    expect(error).toMatchObject({ code: "PRESET_STORAGE_FAILED" });
    expect(String(error.message)).not.toContain("secret");

    const prod = setup("production");
    const saved = await prod.presets.save(
      { toolName: "generate_resume", label: "운영", arguments: {} },
      "me",
    );
    expect(
      prod.storage.objects.has(
        `tools/resume/production/presets/generate_resume/${saved.id}.json`,
      ),
    ).toBe(true);
  });

  it("샘플과 다른 XML은 조용히 바꾸지 않고 거절하며 XML이 없거나 샘플과 같으면 저장한다", async () => {
    const { presets, storage } = setup();
    const code = (promise: Promise<unknown>) =>
      promise.catch((error: { code?: string }) => error.code);

    expect(
      await code(
        presets.save(
          {
            toolName: "generate_resume",
            label: "실제 XML",
            arguments: {
              source: "embedded",
              xml: "<resumeAsset>실제 이력서 원문 hidden@example.com</resumeAsset>",
            },
          },
          "me",
        ),
      ),
    ).toBe("PRESET_XML_NOT_ALLOWED");
    // 샘플이 없는 도구에서는 어떤 XML도 저장하지 않는다
    expect(
      await code(
        presets.save(
          {
            toolName: "validate_resume_xml",
            label: "샘플 없음",
            arguments: { xml: sampleXml },
          },
          "me",
        ),
      ),
    ).toBe("PRESET_XML_NOT_ALLOWED");
    expect(storage.calls.putJson).toBe(0);

    const noXml = await presets.save(
      {
        toolName: "generate_resume",
        label: "저장소",
        arguments: { source: "repository" },
      },
      "me",
    );
    expect(noXml.arguments).toEqual({ source: "repository" });
    expect(storage.calls.putJson).toBe(1);
  });
});
