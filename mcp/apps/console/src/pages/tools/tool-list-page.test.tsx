import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ToolListPage } from "./tool-list-page";

const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

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
    vi.stubGlobal("fetch", fetchMock);
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
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ ok: true, tools: [] })),
    );
    const { unmount } = render(<ToolListPage />);
    expect(await screen.findByText("표시할 도구가 없습니다.")).toBeTruthy();
    unmount();

    vi.stubGlobal(
      "fetch",
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
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(jsonResponse({ ok: true, tools })),
      );
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
      vi.stubGlobal(
        "fetch",
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
      vi.stubGlobal("fetch", fetchMock);
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
      vi.stubGlobal("fetch", fetchMock);
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
      vi.stubGlobal("fetch", fetchMock);
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
      vi.stubGlobal(
        "fetch",
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
  });
});
