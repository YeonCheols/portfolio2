import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArchiveDetailPage } from "./archive-detail-page";

const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

const archiveKey = {
  environment: "development",
  subjectHash: "subj-a",
  generationId: "gen-1",
  attemptId: "att-1",
} as const;

const broken = '{"summary": "<img src=x onerror=alert(1)> 끊긴 JSON';
const detail = {
  ok: true,
  summary: {
    ...archiveKey,
    startedAt: "2026-11-04T01:00:00.000Z",
    stages: ["started", "model_response", "failed"],
    status: "failed",
    failedAfter: "model_response",
  },
  files: [
    { name: "001-started.json", stage: "started" },
    { name: "002-model_response.json", stage: "model_response" },
    { name: "003-failed.json", stage: "failed" },
  ],
  latest: {
    request: { persona: "작성자", prompt: "요청 본문" },
    response: broken,
    validation: {
      gaps: [],
      conflicts: [],
      uncertain: [],
      validationIssues: [],
    },
    errorCode: "INVALID_MODEL_JSON",
  },
};

// 상세는 수정본·재현 기록도 함께 불러오므로 호출 순서가 아니라 URL로 응답한다
const router = (routes: Record<string, () => Response | Promise<Response>>) =>
  vi.fn(async (url: string) => {
    const route = Object.entries(routes).find(([part]) => url.includes(part));
    if (!route) throw new Error(`UNEXPECTED_FETCH ${url}`);
    return route[1]();
  });

// 상세 응답이 늦게 와도 화면이 올바로 기다리는지 보려고 응답을 일부러 늦춘다
const afterDelay = (response: Response) => async () => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return response;
};

const extras = {
  "/revisions?": () =>
    jsonResponse({
      ok: true,
      items: [{ revisionId: "rev-1", createdAt: "2026-11-04T03:00:00.000Z" }],
    }),
  "/reproductions?": () =>
    jsonResponse({
      ok: true,
      items: [
        {
          reproductionId: "rep-1",
          createdAt: "2026-11-04T04:00:00.000Z",
          source: { kind: "original" },
          action: "validate",
          status: "failed",
          failedStage: "validation",
          errorCode: "MODEL_REJECTED",
        },
      ],
    }),
};

describe("ArchiveDetailPage", () => {
  it("생성 작업이 완료돼도 검증이 차단되면 PDF 변환 불가를 안내한다", async () => {
    vi.stubGlobal(
      "fetch",
      router({
        "/detail?": () =>
          jsonResponse({
            ...detail,
            summary: { ...detail.summary, status: "completed" },
            latest: {
              ...detail.latest,
              validation: { ...detail.latest.validation, status: "blocked" },
            },
          }),
        ...extras,
      }),
    );
    render(<ArchiveDetailPage archiveKey={archiveKey} />);
    expect(
      await screen.findByText(
        "생성 응답은 보관됐지만 검증에서 차단되어 PDF로 변환할 수 없습니다.",
      ),
    ).toBeTruthy();
  });
  it("저장된 PDF 품질 평가가 있으면 같은 실행의 검토 판정 UI를 보여준다", async () => {
    vi.stubGlobal(
      "fetch",
      router({
        "/detail?": () =>
          jsonResponse({
            ...detail,
            latest: {
              ...detail.latest,
              qualityEvaluation: {
                run: {
                  evaluationId: "gen-1-pdf-quality",
                  caseSetVersion: "resume-quality-population-v1",
                  policyVersion: "resume-quality-policy-v1",
                  inputRef: "gen-1",
                  outputRef: "gen-1-pdf",
                  cases: [
                    {
                      metricId: "pdf-layout",
                      caseId: "pdf-page/1",
                      decision: "needs_review",
                      blocking: true,
                      evidence: [],
                    },
                  ],
                },
                aggregates: [],
              },
            },
          }),
        ...extras,
        "/quality-reviews?": () => jsonResponse({ ok: true, items: [] }),
      }),
    );

    render(<ArchiveDetailPage archiveKey={archiveKey} />);

    expect(
      await screen.findByRole("region", { name: "품질 검토" }),
    ).toBeTruthy();
  });
  it("상단 실행 요약에 당시 AI 공급자와 모델명을 보여주고 이전 기록은 기록 없음으로 표시한다", async () => {
    vi.stubGlobal(
      "fetch",
      router({
        "/detail?": () =>
          jsonResponse({
            ...detail,
            latest: {
              ...detail.latest,
              model: { provider: "openai", modelName: "test-model" },
            },
          }),
        ...extras,
      }),
    );
    const first = render(<ArchiveDetailPage archiveKey={archiveKey} />);
    expect(await screen.findByText("openai / test-model")).toBeTruthy();
    expect(
      screen.getByText("AI 사용 모델").closest("dl")?.textContent,
    ).toContain("openai / test-model");
    first.unmount();
    vi.stubGlobal(
      "fetch",
      router({ "/detail?": () => jsonResponse(detail), ...extras }),
    );
    render(<ArchiveDetailPage archiveKey={archiveKey} />);
    expect(await screen.findByText("기록 없음")).toBeTruthy();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("실행 요약과 저장된 요청·원문 응답·검증 결과·오류 코드를 가공 없이 텍스트로 보여준다", async () => {
    vi.stubGlobal(
      "fetch",
      router({ "/detail?": afterDelay(jsonResponse(detail)), ...extras }),
    );

    const { container } = render(<ArchiveDetailPage archiveKey={archiveKey} />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "실행 상세" }),
    ).toBeTruthy();
    // 제목은 로딩 중에도 보이므로 불러온 내용이 나타날 때까지 기다린다
    expect(await screen.findByText("att-1")).toBeTruthy();
    expect(screen.getByText("model_response 직후 실패")).toBeTruthy();
    expect(screen.getByText("INVALID_MODEL_JSON")).toBeTruthy();

    const request = screen.getByRole("region", { name: "요청 페이로드" });
    expect(request.textContent).toContain('"prompt": "요청 본문"');
    const response = screen.getByRole("region", { name: "모델 원문 응답" });
    // 깨진 JSON과 HTML처럼 보이는 문자열도 해석하지 않고 그대로 보인다
    expect(within(response).getByText(broken)).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
    expect(
      screen.getByRole("region", { name: "검증 결과" }).textContent,
    ).toContain("validationIssues");
    expect(
      screen.getByRole("link", { name: "목록으로" }).getAttribute("href"),
    ).toBe("/admin/debug/resume?environment=development&page=1");
  });

  it("단계 파일은 서명 URL을 받아 새 탭으로 열고 발급이 실패하면 그 파일에만 안내한다", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    let signCalls = 0;
    const fetchMock = router({
      "/detail?": afterDelay(jsonResponse(detail)),
      "/file-url?": () =>
        ++signCalls === 1
          ? jsonResponse({
              ok: true,
              url: "https://storage.example.test/sign?t=1",
            })
          : jsonResponse({ code: "STORAGE_FAILED" }, 502),
      ...extras,
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<ArchiveDetailPage archiveKey={archiveKey} />);
    // 제목은 로딩 중에도 보이므로 단계 파일 버튼이 나타날 때까지 기다린다
    await user.click(
      await screen.findByRole("button", {
        name: "002-model_response.json 원본 열기",
      }),
    );
    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    expect(open).toHaveBeenCalledWith(
      "https://storage.example.test/sign?t=1",
      "_blank",
      "noopener,noreferrer",
    );
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes("file=002-model_response.json"),
      ),
    ).toBe(true);

    await user.click(
      screen.getByRole("button", { name: "003-failed.json 원본 열기" }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "요청을 처리하지 못했습니다. 다시 시도해 주세요.",
    );
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("없는 실행은 찾을 수 없다고 알리고 목록으로 돌아가는 링크를 둔다", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(jsonResponse({ code: "ARCHIVE_NOT_FOUND" }, 404)),
    );

    render(<ArchiveDetailPage archiveKey={archiveKey} />);

    expect((await screen.findByRole("alert")).textContent).toContain(
      "보관된 실행을 찾을 수 없습니다.",
    );
    expect(screen.getByRole("link", { name: "목록으로" })).toBeTruthy();
  });

  it("수정본·재현 기록을 함께 불러와 편집·재현·삭제 영역에 전달한다", async () => {
    vi.stubGlobal(
      "fetch",
      router({ "/detail?": () => jsonResponse(detail), ...extras }),
    );

    render(<ArchiveDetailPage archiveKey={archiveKey} />);

    const revision = await screen.findByRole("region", { name: "수정본 편집" });
    expect(within(revision).getByText(/rev-1/)).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "재현 기록" }).textContent,
    ).toContain("MODEL_REJECTED");
    expect(screen.getByRole("button", { name: "이 실행 삭제" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "PDF 재현" })).toBeTruthy();
  });

  it("수정본이나 재현 기록을 불러오지 못해도 상세는 보여주고 그 영역에 안내한다", async () => {
    vi.stubGlobal(
      "fetch",
      router({
        "/detail?": () => jsonResponse(detail),
        "/revisions?": () => jsonResponse({ code: "STORAGE_FAILED" }, 502),
        "/reproductions?": () => jsonResponse({ ok: true, items: [] }),
      }),
    );

    render(<ArchiveDetailPage archiveKey={archiveKey} />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "실행 상세" }),
    ).toBeTruthy();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "수정본 목록을 불러오지 못했습니다.",
    );
    expect(screen.getByRole("region", { name: "모델 원문 응답" })).toBeTruthy();
  });
});
