import { evaluateResumePdfQuality } from "@mcp/modules/resume/quality/evaluate-resume-pdf";

const projectSource = {
  id: "source-1",
  section: "projects",
  name: "project",
  text: "",
  sourceRefs: [],
  visibility: "public",
  children: [
    {
      section: "projects",
      name: "title",
      text: "검색 서비스",
      sourceRefs: [],
      visibility: "public",
      children: [],
    },
    {
      section: "projects",
      name: "summary",
      text: "매출 20% 개선",
      sourceRefs: [],
      visibility: "public",
      children: [],
    },
  ],
};

const generated = {
  resume: "매출 20% 개선",
  selection: [projectSource],
  validationMode: "source_evidence" as const,
  claims: [
    {
      text: "매출 20% 개선",
      sourceIds: ["source-1"],
      sources: [projectSource],
      evidence: [{ sourceId: "source-1", quote: "매출 20% 개선" }],
    },
  ],
  gaps: [],
  validationIssues: [],
  conflicts: [],
  uncertain: [],
};

describe("evaluateResumePdfQuality", () => {
  it("출력 주장을 생성하고 인용 검증만으로 의미 통과를 주지 않는다", () => {
    const run = evaluateResumePdfQuality({
      generated,
      evaluationId: "evaluation-1",
      evaluatedAt: "2026-11-06T00:00:00.000Z",
      inputRef: "snapshot-1",
      outputRef: "output-1",
      pdfPageCount: 1,
    });

    expect(run.run.cases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metricId: "claim-support",
          caseId: "output/unassignedProjects/0/details/0/value",
          decision: "needs_review",
          blocking: false,
          evidence: expect.arrayContaining([
            { kind: "source_fact", reference: "source-1" },
            {
              kind: "output_block",
              reference: "output/unassignedProjects/0/details/0/value",
            },
          ]),
        }),
        expect.objectContaining({
          metricId: "numeric-integrity",
          caseId: "output/unassignedProjects/0/details/0/value/number/0",
          decision: "needs_review",
          blocking: false,
        }),
      ]),
    );
    expect(run.aggregates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metricId: "claim-support",
          passedCases: 1,
          needsReviewCases: 1,
          denominator: 2,
          confirmedRate: null,
          blockingCases: 0,
        }),
        expect.objectContaining({
          metricId: "numeric-integrity",
          needsReviewCases: 1,
          denominator: 1,
        }),
      ]),
    );
  });

  it("사실 주장이 없으면 claim 모집단을 빈 배열로 둔다", () => {
    const run = evaluateResumePdfQuality({
      generated: {
        ...generated,
        claims: [],
        selection: [],
        resume: "경력",
      },
      evaluationId: "evaluation-1",
      evaluatedAt: "2026-11-06T00:00:00.000Z",
      inputRef: "snapshot-1",
      outputRef: "output-1",
      pdfPageCount: 1,
    });

    expect(
      run.run.cases.filter(({ metricId }) => metricId === "claim-support"),
    ).toEqual([]);
    expect(
      run.aggregates.find(({ metricId }) => metricId === "claim-support")
        ?.denominator,
    ).toBe(0);
  });

  it("PDF 출력 모델의 원문 fallback도 주장 모집단에 포함한다", () => {
    const fallback = { ...projectSource, id: "project-1" };
    const run = evaluateResumePdfQuality({
      generated: {
        ...generated,
        claims: [],
        selection: [fallback],
        resume: "프로젝트",
      },
      evaluationId: "evaluation-1",
      evaluatedAt: "2026-11-06T00:00:00.000Z",
      inputRef: "snapshot-1",
      outputRef: "output-1",
      pdfPageCount: 1,
    });

    expect(run.run.cases).toContainEqual(
      expect.objectContaining({
        metricId: "claim-support",
        caseId: "output/unassignedProjects/0/title",
        decision: "pass",
        evidence: expect.arrayContaining([
          { kind: "source_fact", reference: "project-1" },
        ]),
      }),
    );
  });

  it("필수 출력 항목과 원문 사실을 출력 모델의 식별자로 대조한다", () => {
    const run = evaluateResumePdfQuality({
      generated,
      evaluationId: "evaluation-1",
      evaluatedAt: "2026-11-06T00:00:00.000Z",
      inputRef: "snapshot-1",
      outputRef: "output-1",
      pdfPageCount: 1,
    });

    expect(run.run.cases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metricId: "required-item-coverage",
          caseId: expect.stringContaining(
            "required-item/projects/source-1/project-title",
          ),
          decision: "pass",
        }),
        expect.objectContaining({
          metricId: "required-fact-preservation",
          caseId: expect.stringContaining("source-fact/"),
          decision: "pass",
          evidence: expect.arrayContaining([
            { kind: "source_fact", reference: "source-1" },
          ]),
        }),
      ]),
    );
  });

  it("내용이 있는 프로젝트에 필수 제목 원문이 없으면 실패로 판정한다", () => {
    const missingTitle = {
      ...projectSource,
      children: [
        {
          ...projectSource.children[1],
          text: "원문에 있는 프로젝트 설명",
        },
      ],
    };
    const run = evaluateResumePdfQuality({
      generated: {
        ...generated,
        claims: [],
        selection: [missingTitle],
      },
      evaluationId: "evaluation-1",
      evaluatedAt: "2026-11-06T00:00:00.000Z",
      inputRef: "snapshot-1",
      outputRef: "output-1",
      pdfPageCount: 1,
    });

    expect(run.run.cases).toContainEqual(
      expect.objectContaining({
        metricId: "required-item-coverage",
        caseId: "required-item/projects/source-1/project-title",
        decision: "fail",
      }),
    );
  });

  it("중복 출력은 실패로, 교정과 페이지 배치는 사람 검토로 집계한다", () => {
    const duplicate = {
      ...projectSource,
      id: "project-2",
      children: [
        { ...projectSource.children[0] },
        { ...projectSource.children[1], text: "검색 서비스 20% 성장" },
      ],
    };
    const run = evaluateResumePdfQuality({
      generated: {
        ...generated,
        claims: [],
        selection: [projectSource, duplicate],
        resume: "프로젝트 두 건",
      },
      evaluationId: "evaluation-1",
      evaluatedAt: "2026-11-06T00:00:00.000Z",
      inputRef: "snapshot-1",
      outputRef: "output-1",
      pdfPageCount: 2,
    });

    expect(run.run.cases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metricId: "duplicate-content",
          caseId: "output/unassignedProjects/1/title",
          decision: "fail",
          blocking: true,
        }),
        expect.objectContaining({
          metricId: "text-proofreading",
          decision: "needs_review",
          blocking: false,
        }),
        expect.objectContaining({
          metricId: "pdf-layout",
          caseId: "pdf-page/2",
          decision: "needs_review",
          blocking: false,
        }),
      ]),
    );
  });
});
