import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PresetPanel } from "./preset-panel";

const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

const first = {
  id: "00000000-0000-4000-8000-000000000001",
  label: "기본 시험",
  arguments: { source: "embedded", elementIds: ["profile-sample"] },
  createdAt: "2026-11-05T00:00:00.000Z",
};
const second = {
  id: "00000000-0000-4000-8000-000000000002",
  label: "저장소 시험",
  arguments: { source: "repository" },
  createdAt: "2026-11-05T00:01:00.000Z",
};

const setup = (
  fetchMock: ReturnType<typeof vi.fn>,
  readArguments: () => Record<string, unknown> | null = () => ({ a: 1 }),
) => {
  vi.stubGlobal("fetch", fetchMock);
  const onLoad = vi.fn();
  render(
    <PresetPanel
      toolName="generate_resume"
      readArguments={readArguments}
      onLoad={onLoad}
    />,
  );
  return { onLoad, user: userEvent.setup() };
};

describe("PresetPanel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("도구별 프리셋 목록을 조회해 보여주고 비어 있으면 안내한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ ok: true, presets: [first, second] }));
    setup(fetchMock);

    expect(screen.getByRole("status").textContent).toContain("불러오는 중");
    const list = await screen.findByRole("list", { name: "프리셋 목록" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/admin/tools/resume/api/presets?tool=generate_resume",
      expect.anything(),
    );
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getByText("저장소 시험")).toBeTruthy();
  });

  it("빈 목록은 안내를, 조회 실패는 안전한 안내를, 저장소 미연결은 저장을 막는 안내를 보여준다", async () => {
    setup(vi.fn().mockResolvedValue(jsonResponse({ ok: true, presets: [] })));
    expect(await screen.findByText("저장된 프리셋이 없습니다.")).toBeTruthy();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";

    setup(
      vi
        .fn()
        .mockResolvedValue(jsonResponse({ ok: false, code: "BOOM_X" }, 502)),
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "프리셋을 불러오지 못했습니다.",
    );
    expect(screen.queryByText(/BOOM_X/)).toBeNull();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";

    setup(
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ ok: false, code: "TOOL_PRESETS_UNAVAILABLE" }, 503),
        ),
    );
    expect(
      await screen.findByText(/프리셋 저장소를 쓸 수 없습니다/),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "프리셋 저장" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("불러오기는 저장된 인자를 바꾸지 않고 그대로 넘긴다", async () => {
    const { onLoad, user } = setup(
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ ok: true, presets: [first, second] }),
        ),
    );
    const list = await screen.findByRole("list", { name: "프리셋 목록" });
    const rows = within(list).getAllByRole("listitem");

    await user.click(within(rows[0]).getByRole("button", { name: "불러오기" }));
    expect(onLoad).toHaveBeenLastCalledWith(first.arguments);

    await user.click(within(rows[1]).getByRole("button", { name: "불러오기" }));
    expect(onLoad).toHaveBeenLastCalledWith(second.arguments);
  });

  it("라벨과 현재 입력을 한 번만 저장하고 목록을 갱신한다", async () => {
    let finish: (value: Response) => void = () => {};
    const pending = new Promise<Response>((resolve) => {
      finish = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, presets: [] }))
      .mockReturnValueOnce(pending)
      .mockResolvedValueOnce(jsonResponse({ ok: true, presets: [first] }));
    const { user } = setup(fetchMock, () => ({
      source: "embedded",
      xml: "<resumeAsset/>",
    }));
    await screen.findByText("저장된 프리셋이 없습니다.");

    fireEvent.change(screen.getByLabelText("프리셋 이름"), {
      target: { value: "기본 시험" },
    });
    const save = screen.getByRole("button", { name: "프리셋 저장" });
    await user.click(save);
    await user.click(save);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [path, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(path).toBe("/admin/tools/resume/api/presets");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      toolName: "generate_resume",
      label: "기본 시험",
      arguments: { source: "embedded", xml: "<resumeAsset/>" },
    });
    finish(jsonResponse({ ok: true, preset: first }));
    expect(await screen.findByText("기본 시험")).toBeTruthy();
    expect(
      (screen.getByLabelText("프리셋 이름") as HTMLInputElement).value,
    ).toBe("");
  });

  it("이름이 없거나 입력이 JSON 객체가 아니면 요청 없이 안내하고 서버 거절은 이유를 알린다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, presets: [] }))
      .mockResolvedValueOnce(
        jsonResponse({ ok: false, code: "PRESET_LIMIT" }, 409),
      );
    let current: Record<string, unknown> | null = null;
    const { user } = setup(fetchMock, () => current);
    await screen.findByText("저장된 프리셋이 없습니다.");
    const save = () => screen.getByRole("button", { name: "프리셋 저장" });

    await user.click(save());
    expect((await screen.findByRole("alert")).textContent).toContain(
      "프리셋 이름을 입력",
    );

    fireEvent.change(screen.getByLabelText("프리셋 이름"), {
      target: { value: "이름" },
    });
    await user.click(save());
    expect(screen.getByRole("alert").textContent).toContain("JSON 객체");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    current = { a: 1 };
    await user.click(save());
    expect((await screen.findByRole("alert")).textContent).toContain(
      "30개까지",
    );
  });

  it("삭제는 확인 단계를 거쳐 한 번만 요청하고 취소하면 요청하지 않는다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ ok: true, presets: [first, second] }),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, presets: [second] }));
    const { user } = setup(fetchMock);
    const list = await screen.findByRole("list", { name: "프리셋 목록" });
    const row = () => within(list).getAllByRole("listitem")[0];

    await user.click(within(row()).getByRole("button", { name: "삭제" }));
    await user.click(within(row()).getByRole("button", { name: "취소" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await user.click(within(row()).getByRole("button", { name: "삭제" }));
    await user.click(within(row()).getByRole("button", { name: "삭제 확인" }));

    const [path, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(path).toBe("/admin/tools/resume/api/presets/delete");
    expect(JSON.parse(init.body as string)).toEqual({
      toolName: "generate_resume",
      id: first.id,
    });
    await vi.waitFor(() =>
      expect(within(list).queryByText("기본 시험")).toBeNull(),
    );
  });

  it("샘플과 다른 XML이라 서버가 거절하면 이유를 알리고 입력은 그대로 둔다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, presets: [] }))
      .mockResolvedValueOnce(
        jsonResponse({ ok: false, code: "PRESET_XML_NOT_ALLOWED" }, 400),
      );
    const { user } = setup(fetchMock, () => ({
      xml: "<resumeAsset>다른</resumeAsset>",
    }));
    await screen.findByText("저장된 프리셋이 없습니다.");
    fireEvent.change(screen.getByLabelText("프리셋 이름"), {
      target: { value: "이름" },
    });

    await user.click(screen.getByRole("button", { name: "프리셋 저장" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "샘플과 다른 XML은 프리셋에 저장할 수 없습니다.",
    );
    expect(
      (screen.getByLabelText("프리셋 이름") as HTMLInputElement).value,
    ).toBe("이름");
  });
});
