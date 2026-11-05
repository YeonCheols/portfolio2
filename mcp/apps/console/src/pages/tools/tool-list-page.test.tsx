import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ToolListPage } from "./tool-list-page";

const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

// 프리셋 목록 요청은 이 화면 테스트의 관심사가 아니므로 빈 목록으로 응답하고 나머지만 모의 함수로 넘긴다
const stubFetch = (mock: ReturnType<typeof vi.fn>) =>
  vi.stubGlobal("fetch", (url: string, init?: RequestInit) =>
    String(url).includes("/api/presets")
      ? Promise.resolve(jsonResponse({ ok: true, presets: [] }))
      : mock(url, init),
  );

const tools = [
  {
    name: "validate_resume_xml",
    description: "XML을 공통 이력서 모델로 검증한다",
    inputSchema: {
      type: "object",
      properties: { source: { type: "string" } },
      required: ["source"],
    },
    sampleArguments: { source: "embedded", xml: "<resumeAsset/>" },
  },
  {
    name: "generate_resume",
    description: "모델을 호출해 이력서를 작성한다",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
];

describe("ToolListPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("도구 이름과 설명을 목록으로 보여주고 선택하면 입력 스키마를 상세로 보여준다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ ok: true, tools }));
    stubFetch(fetchMock);
    const user = userEvent.setup();

    render(<ToolListPage />);

    expect(screen.getByRole("status").textContent).toContain("불러오는 중");
    const list = await screen.findByRole("list", { name: "도구 목록" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/admin/tools/resume/api/tools",
      expect.anything(),
    );
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getByText("generate_resume")).toBeTruthy();
    expect(
      within(list).getByText("XML을 공통 이력서 모델로 검증한다"),
    ).toBeTruthy();

    await user.click(
      within(list).getByRole("button", { name: /validate_resume_xml/ }),
    );

    const detail = screen.getByRole("region", {
      name: "validate_resume_xml 상세",
    });
    // 입력 인자가 기본 탭이고 스키마는 같은 자리에서 탭으로 전환해 본다
    expect(
      within(detail)
        .getByRole("tab", { name: "입력 인자" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(within(detail).queryByText(/"required"/)).toBeNull();
    await user.click(within(detail).getByRole("tab", { name: "입력 스키마" }));
    const schema = within(detail).getByRole("tabpanel", {
      name: "입력 스키마",
    });
    expect(schema.textContent).toContain('"required"');
    expect(schema.textContent).toContain('"source"');
    await user.click(within(detail).getByRole("tab", { name: "입력 인자" }));
    expect(within(detail).getByLabelText("입력 인자(JSON)")).toBeTruthy();
  });

  it("목록이 비어 있으면 빈 상태를, 조회에 실패하면 안전한 안내만 보여준다", async () => {
    stubFetch(vi.fn().mockResolvedValue(jsonResponse({ ok: true, tools: [] })));
    const { unmount } = render(<ToolListPage />);
    expect(await screen.findByText("표시할 도구가 없습니다.")).toBeTruthy();
    unmount();

    stubFetch(
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ ok: false, code: "BOOM_INTERNAL" }, 500),
        ),
    );
    render(<ToolListPage />);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "도구 목록을 불러오지 못했습니다.",
    );
    expect(screen.queryByText(/BOOM_INTERNAL/)).toBeNull();
  });

  describe("도구 실행", () => {
    const openTool = async () => {
      const user = userEvent.setup();
      render(<ToolListPage />);
      const list = await screen.findByRole("list", { name: "도구 목록" });
      await user.click(
        within(list).getByRole("button", { name: /validate_resume_xml/ }),
      );
      const detail = screen.getByRole("region", {
        name: "validate_resume_xml 상세",
      });
      return { user, detail };
    };
    const fill = (detail: HTMLElement, value: string) =>
      fireEvent.change(within(detail).getByLabelText("입력 인자(JSON)"), {
        target: { value },
      });

    it("도구를 고르면 입력란이 그 도구의 샘플로 채워지고 샘플이 없으면 빈 객체이며 되돌리기로 샘플을 복원한다", async () => {
      stubFetch(vi.fn().mockResolvedValue(jsonResponse({ ok: true, tools })));
      const { user, detail } = await openTool();
      const input = () =>
        within(detail).getByLabelText("입력 인자(JSON)") as HTMLTextAreaElement;

      expect(JSON.parse(input().value)).toEqual({
        source: "embedded",
        xml: "<resumeAsset/>",
      });
      // 사람이 읽기 쉽게 들여쓴 JSON이다
      expect(input().value).toContain("\n  ");

      fill(detail, "{}");
      await user.click(
        within(detail).getByRole("button", { name: "샘플 입력으로 되돌리기" }),
      );
      expect(JSON.parse(input().value).source).toBe("embedded");

      const list = screen.getByRole("list", { name: "도구 목록" });
      await user.click(
        within(list).getByRole("button", { name: /generate_resume/ }),
      );
      const other = screen.getByRole("region", {
        name: "generate_resume 상세",
      });
      expect(
        (within(other).getByLabelText("입력 인자(JSON)") as HTMLTextAreaElement)
          .value,
      ).toBe("{}");
    });

    it("결과는 입력과 나란한 별도 패널에 보이고 실행 전에는 안내만, 완료되면 성공 표시와 내용을 보여주며 그 위치로 이동시킨다", async () => {
      const scrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      stubFetch(
        vi
          .fn()
          .mockResolvedValueOnce(jsonResponse({ ok: true, tools }))
          .mockResolvedValueOnce(
            jsonResponse({
              ok: true,
              isError: false,
              content: [{ type: "text", text: "resume-test" }],
            }),
          ),
      );
      const { user, detail } = await openTool();
      const panel = within(detail).getByRole("region", { name: "실행 결과" });
      const input = within(detail).getByRole("region", { name: "입력" });
      expect(panel.textContent).toContain("실행하면 결과가 이곳에 표시됩니다.");
      expect(input.contains(panel)).toBe(false);

      await user.click(within(detail).getByRole("button", { name: "실행" }));

      expect(await within(panel).findByText("resume-test")).toBeTruthy();
      expect(within(panel).getByText("성공")).toBeTruthy();
      expect(within(input).queryByText("resume-test")).toBeNull();
      expect(scrollIntoView).toHaveBeenCalled();
      // 도구를 바꾸면 이전 도구의 결과는 남지 않는다
      const list = screen.getByRole("list", { name: "도구 목록" });
      await user.click(
        within(list).getByRole("button", { name: /generate_resume/ }),
      );
      expect(screen.queryByText("resume-test")).toBeNull();
    });

    it("입력한 인자로 실행 버튼을 눌렀을 때 한 번만 호출하고 결과 내용을 보여준다", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ ok: true, tools }))
        .mockResolvedValueOnce(
          jsonResponse({
            ok: true,
            isError: false,
            content: [{ type: "text", text: "resume-test" }],
          }),
        );
      stubFetch(fetchMock);
      const { user, detail } = await openTool();
      expect(fetchMock).toHaveBeenCalledTimes(1);

      fill(detail, '{"source":"repository"}');
      await user.click(within(detail).getByRole("button", { name: "실행" }));

      expect(await within(detail).findByText("resume-test")).toBeTruthy();
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const [path, init] = fetchMock.mock.calls[1] as [string, RequestInit];
      expect(path).toBe("/admin/tools/resume/api/call");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({
        name: "validate_resume_xml",
        arguments: { source: "repository" },
      });
    });

    it("실행 중에는 버튼을 막아 반복 클릭이 요청을 늘리지 않는다", async () => {
      let finish: (value: Response) => void = () => {};
      const pending = new Promise<Response>((resolve) => {
        finish = resolve;
      });
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ ok: true, tools }))
        .mockReturnValueOnce(pending);
      stubFetch(fetchMock);
      const { user, detail } = await openTool();

      const button = within(detail).getByRole("button", { name: "실행" });
      await user.click(button);
      await user.click(button);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(
        within(detail)
          .getByRole("button", { name: /실행 중/ })
          .hasAttribute("disabled"),
      ).toBe(true);
      finish(
        jsonResponse({
          ok: true,
          isError: false,
          content: [{ type: "text", text: "done" }],
        }),
      );
      expect(await within(detail).findByText("done")).toBeTruthy();
    });

    it("JSON이 아니거나 객체가 아닌 인자는 요청 없이 안내하고 도구 실패는 오류 코드로 보여준다", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ ok: true, tools }))
        .mockResolvedValueOnce(
          jsonResponse({
            ok: true,
            isError: true,
            content: [{ type: "text", text: "UNKNOWN_TEMPLATE" }],
          }),
        );
      stubFetch(fetchMock);
      const { user, detail } = await openTool();
      const run = () => within(detail).getByRole("button", { name: "실행" });

      fill(detail, "not json");
      await user.click(run());
      expect((await within(detail).findByRole("alert")).textContent).toContain(
        "JSON 객체",
      );
      fill(detail, "[1]");
      await user.click(run());
      expect(within(detail).getByRole("alert").textContent).toContain(
        "JSON 객체",
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);

      fill(detail, "{}");
      await user.click(run());
      expect(await within(detail).findByText("UNKNOWN_TEMPLATE")).toBeTruthy();
      expect(within(detail).getByText("실패")).toBeTruthy();
    });

    it("실행 요청 자체가 실패하면 서버 응답 원문 없이 안내만 보여준다", async () => {
      stubFetch(
        vi
          .fn()
          .mockResolvedValueOnce(jsonResponse({ ok: true, tools }))
          .mockResolvedValueOnce(
            jsonResponse({ ok: false, code: "TOOL_CALL_FAILED" }, 500),
          ),
      );
      const { user, detail } = await openTool();

      fill(detail, "{}");
      await user.click(within(detail).getByRole("button", { name: "실행" }));

      const alert = await within(detail).findByRole("alert");
      expect(alert.textContent).toContain("도구를 실행하지 못했습니다.");
    });
    it("결과 텍스트가 JSON이면 정렬해서 보여주고 일반 텍스트는 그대로 보여준다", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ ok: true, tools }))
        .mockResolvedValueOnce(
          jsonResponse({
            ok: true,
            isError: false,
            content: [
              { type: "text", text: '{"id":"resume-test","list":[1,2]}' },
              { type: "text", text: "resume-test plain" },
            ],
          }),
        );
      stubFetch(fetchMock);
      const { user, detail } = await openTool();

      await user.click(within(detail).getByRole("button", { name: "실행" }));

      const panel = within(detail).getByRole("region", { name: "실행 결과" });
      const blocks = await within(panel).findAllByText(
        (_, element) => element?.tagName === "PRE",
      );
      expect(blocks[0].textContent).toBe(
        '{\n  "id": "resume-test",\n  "list": [\n    1,\n    2\n  ]\n}',
      );
      expect(blocks[1].textContent).toBe("resume-test plain");
    });
  });

  describe("도구 활성 전환", () => {
    const withPolicy = (enabledByName: Record<string, boolean>) =>
      tools.map((tool) => ({ ...tool, enabled: enabledByName[tool.name] }));

    it("카드에 활성 여부를 표시하고 상세의 스위치로 전환하면 카드도 바로 바뀐다", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            ok: true,
            policyAvailable: true,
            tools: withPolicy({
              validate_resume_xml: true,
              generate_resume: false,
            }),
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            ok: true,
            name: "validate_resume_xml",
            enabled: false,
          }),
        );
      stubFetch(fetchMock);
      const user = userEvent.setup();
      render(<ToolListPage />);
      const list = await screen.findByRole("list", { name: "도구 목록" });
      const cards = within(list).getAllByRole("listitem");
      expect(within(cards[0]).getByText("활성")).toBeTruthy();
      expect(within(cards[1]).getByText("비활성")).toBeTruthy();

      await user.click(
        within(list).getByRole("button", { name: /validate_resume_xml/ }),
      );
      const detail = screen.getByRole("region", {
        name: "validate_resume_xml 상세",
      });
      const toggle = within(detail).getByRole("switch", { name: "도구 활성" });
      expect(toggle.getAttribute("aria-checked")).toBe("true");

      await user.click(toggle);

      const [path, init] = fetchMock.mock.calls[1] as [string, RequestInit];
      expect(path).toBe("/admin/tools/resume/api/policy");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({
        name: "validate_resume_xml",
        enabled: false,
      });
      await vi.waitFor(() =>
        expect(
          within(detail)
            .getByRole("switch", { name: "도구 활성" })
            .getAttribute("aria-checked"),
        ).toBe("false"),
      );
      expect(within(cards[0]).getByText("비활성")).toBeTruthy();
      // 끈 도구도 이 화면에서는 시험할 수 있다고 알린다
      expect(detail.textContent).toContain("시험 실행");
    });

    it("전환 요청 중에는 스위치를 막아 중복 요청을 보내지 않고 실패하면 상태를 유지한 채 안내한다", async () => {
      let finish: (value: Response) => void = () => {};
      const pending = new Promise<Response>((resolve) => {
        finish = resolve;
      });
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            ok: true,
            policyAvailable: true,
            tools: withPolicy({
              validate_resume_xml: true,
              generate_resume: true,
            }),
          }),
        )
        .mockReturnValueOnce(pending);
      stubFetch(fetchMock);
      const user = userEvent.setup();
      render(<ToolListPage />);
      const list = await screen.findByRole("list", { name: "도구 목록" });
      await user.click(
        within(list).getByRole("button", { name: /validate_resume_xml/ }),
      );
      const detail = screen.getByRole("region", {
        name: "validate_resume_xml 상세",
      });
      const toggle = within(detail).getByRole("switch", { name: "도구 활성" });

      await user.click(toggle);
      await user.click(toggle);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(toggle.hasAttribute("disabled")).toBe(true);

      finish(jsonResponse({ ok: false, code: "TOOL_POLICY_UNAVAILABLE" }, 503));
      expect((await within(detail).findByRole("alert")).textContent).toContain(
        "활성 상태를 바꾸지 못했습니다.",
      );
      expect(
        within(detail)
          .getByRole("switch", { name: "도구 활성" })
          .getAttribute("aria-checked"),
      ).toBe("true");
    });

    it("정책을 쓸 수 없는 서버에서는 상태를 표시하지 않고 스위치를 막고 이유를 알린다", async () => {
      stubFetch(
        vi
          .fn()
          .mockResolvedValue(
            jsonResponse({ ok: true, policyAvailable: false, tools }),
          ),
      );
      const user = userEvent.setup();
      render(<ToolListPage />);
      const list = await screen.findByRole("list", { name: "도구 목록" });
      expect(within(list).queryByText("활성")).toBeNull();
      expect(within(list).queryByText("비활성")).toBeNull();

      await user.click(
        within(list).getByRole("button", { name: /validate_resume_xml/ }),
      );
      const detail = screen.getByRole("region", {
        name: "validate_resume_xml 상세",
      });
      expect(
        within(detail)
          .getByRole("switch", { name: "도구 활성" })
          .hasAttribute("disabled"),
      ).toBe(true);
      expect(detail.textContent).toContain("정책 저장소");
    });
  });

  it("서버가 알린 환경을 제목 옆에 배지로 보여주고 알리지 않으면 보여주지 않는다", async () => {
    const stub = (body: unknown) =>
      stubFetch(vi.fn().mockResolvedValue(jsonResponse(body)));

    stub({ ok: true, tools, environment: "production" });
    const prod = render(<ToolListPage />);
    const badge = await screen.findByLabelText("정책 환경");
    expect(badge.textContent).toBe("운영");
    prod.unmount();

    stub({ ok: true, tools, environment: "development" });
    const dev = render(<ToolListPage />);
    expect((await screen.findByLabelText("정책 환경")).textContent).toBe(
      "개발",
    );
    dev.unmount();

    stub({ ok: true, tools });
    render(<ToolListPage />);
    await screen.findByRole("list", { name: "도구 목록" });
    expect(screen.queryByLabelText("정책 환경")).toBeNull();
  });

  it("프리셋을 불러오면 입력란이 저장된 인자 그대로 바뀐다", async () => {
    const preset = {
      id: "00000000-0000-4000-8000-000000000001",
      label: "기본 시험",
      arguments: {
        source: "embedded",
        xml: "<resumeAsset/>",
        elementIds: ["profile-sample"],
      },
      createdAt: "2026-11-05T00:00:00.000Z",
    };
    vi.stubGlobal("fetch", (url: string) =>
      Promise.resolve(
        String(url).includes("/api/presets")
          ? jsonResponse({ ok: true, presets: [preset] })
          : jsonResponse({ ok: true, tools }),
      ),
    );
    const user = userEvent.setup();
    render(<ToolListPage />);
    const list = await screen.findByRole("list", { name: "도구 목록" });
    await user.click(
      within(list).getByRole("button", { name: /validate_resume_xml/ }),
    );
    const detail = screen.getByRole("region", {
      name: "validate_resume_xml 상세",
    });

    await user.click(
      await within(detail).findByRole("button", { name: "불러오기" }),
    );

    const input = within(detail).getByLabelText(
      "입력 인자(JSON)",
    ) as HTMLTextAreaElement;
    expect(JSON.parse(input.value)).toEqual(preset.arguments);
  });
});
