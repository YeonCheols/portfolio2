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
  const leaf = (name: string, text: string) => ({
    section: "employmentHistory",
    name,
    text,
    sourceRefs: [],
    visibility: "public",
    children: [],
  });
  const employment = {
    id: "employment-1",
    section: "employmentHistory",
    name: "employment",
    text: "",
    sourceRefs: [],
    visibility: "public",
    children: [
      leaf("organization", "예시회사"),
      leaf("position", "선임"),
      leaf("department", "플랫폼팀"),
      {
        ...leaf("period", ""),
        children: [leaf("start", "2020-01"), leaf("end", "2022-03")],
      },
    ],
  };
  const evaluateEmployment = () =>
    evaluateResumePdfQuality({
      generated: {
        ...generated,
        claims: [],
        selection: [employment],
        resume: "경력",
      },
      evaluationId: "evaluation-1",
      evaluatedAt: "2026-11-06T00:00:00.000Z",
      inputRef: "snapshot-1",
      outputRef: "output-1",
      pdfPageCount: 1,
    });

  it("원문 필드를 이어 붙인 기간과 소제목은 출처를 찾아 차단하지 않는다", () => {
    const { run } = evaluateEmployment();

    expect(
      run.cases.filter(
        ({ caseId, blocking }) =>
          blocking && /\/(period|subtitle)(\/|$)/u.test(caseId),
      ),
    ).toEqual([]);
  });

  it("기간 원문 start·end는 이어 붙인 기간 블록에 보존된 것으로 본다", () => {
    const { run } = evaluateEmployment();

    expect(
      run.cases.filter(
        ({ metricId, caseId }) =>
          metricId === "required-fact-preservation" &&
          /\/(start|end)\/text$/u.test(caseId),
      ),
    ).toEqual([
      expect.objectContaining({ decision: "pass" }),
      expect.objectContaining({ decision: "pass" }),
    ]);
  });
  it("경력의 title과 같은 값을 복사한 organization은 중복 출력으로 보지 않는다", () => {
    const { run } = evaluateEmployment();

    expect(
      run.cases.filter(
        ({ metricId, decision }) =>
          metricId === "duplicate-content" && decision === "fail",
      ),
    ).toEqual([]);
  });

  it("프로젝트 기간이 소속 경력 기간과 같아도 중복 출력으로 보지 않는다", () => {
    const project = {
      id: "project-1",
      section: "projects",
      name: "project",
      text: "",
      sourceRefs: [],
      visibility: "public",
      employmentRef: "employment-1",
      children: [
        { ...leaf("title", "검색 서비스"), section: "projects" },
        {
          ...leaf("period", ""),
          section: "projects",
          children: [leaf("start", "2020-01"), leaf("end", "2022-03")],
        },
      ],
    };
    const { run } = evaluateResumePdfQuality({
      generated: {
        ...generated,
        claims: [],
        selection: [employment, project],
        resume: "경력",
      },
      evaluationId: "evaluation-1",
      evaluatedAt: "2026-11-06T00:00:00.000Z",
      inputRef: "snapshot-1",
      outputRef: "output-1",
      pdfPageCount: 1,
    });

    expect(
      run.cases.filter(
        ({ metricId, decision }) =>
          metricId === "duplicate-content" && decision === "fail",
      ),
    ).toEqual([]);
  });
  it("자체 id를 가진 자식 원문이 소유 레코드의 출력에 그대로 있으면 보존으로 본다", () => {
    const project = {
      ...projectSource,
      id: "project-3",
      children: [
        projectSource.children[0],
        {
          ...projectSource.children[1],
          id: "approach-1",
          name: "projectApproach",
          text: "요구사항부터 배포까지 담당",
        },
      ],
    };
    const { run } = evaluateResumePdfQuality({
      generated: { ...generated, claims: [], selection: [project] },
      evaluationId: "evaluation-1",
      evaluatedAt: "2026-11-06T00:00:00.000Z",
      inputRef: "snapshot-1",
      outputRef: "output-1",
      pdfPageCount: 1,
    });

    expect(
      run.cases.filter(
        ({ metricId, caseId }) =>
          metricId === "required-fact-preservation" &&
          caseId.endsWith("/projectApproach/text"),
      ),
    ).toEqual([expect.objectContaining({ decision: "pass" })]);
  });
  it("자체 id를 가진 자식 원문을 claim으로 재작성해도 소유 레코드 출력과 연결해 검토로 둔다", () => {
    const child = {
      ...projectSource.children[1],
      id: "approach-1",
      name: "technicalStructure",
      text: "계층을 나눠 책임을 분리",
    };
    const project = {
      ...projectSource,
      id: "project-4",
      children: [projectSource.children[0], child],
    };
    const { run } = evaluateResumePdfQuality({
      generated: {
        ...generated,
        selection: [project],
        claims: [
          {
            text: "계층을 분리해 책임을 나눴습니다.",
            sourceIds: ["approach-1"],
            sources: [child],
            formItem: "technicalStructure",
            evidence: [{ sourceId: "approach-1", quote: child.text }],
          },
        ],
      },
      evaluationId: "evaluation-1",
      evaluatedAt: "2026-11-06T00:00:00.000Z",
      inputRef: "snapshot-1",
      outputRef: "output-1",
      pdfPageCount: 1,
    });

    expect(
      run.cases.filter(
        ({ metricId, caseId }) =>
          metricId === "required-fact-preservation" &&
          caseId.endsWith("/technicalStructure/text"),
      ),
    ).toEqual([expect.objectContaining({ decision: "needs_review" })]);
  });
  it("자체 id를 가진 자식 원문을 그대로 출력한 블록은 출처를 찾아 차단하지 않는다", () => {
    const project = {
      ...projectSource,
      id: "project-5",
      children: [
        projectSource.children[0],
        {
          ...projectSource.children[1],
          id: "approach-2",
          name: "projectApproach",
          text: "요구사항부터 배포까지 담당",
        },
      ],
    };
    const { run } = evaluateResumePdfQuality({
      generated: { ...generated, claims: [], selection: [project] },
      evaluationId: "evaluation-1",
      evaluatedAt: "2026-11-06T00:00:00.000Z",
      inputRef: "snapshot-1",
      outputRef: "output-1",
      pdfPageCount: 1,
    });

    expect(
      run.cases.filter(
        ({ metricId, blocking }) => metricId === "claim-support" && blocking,
      ),
    ).toEqual([]);
  });
  it("현재 기준값이 아닌 superseded 원문은 필수 사실로 요구하지 않는다", () => {
    const project = {
      ...projectSource,
      id: "project-6",
      children: [
        projectSource.children[0],
        {
          ...projectSource.children[1],
          id: "period-variant-1",
          name: "periodVariant",
          text: "2023-11",
          status: "superseded",
        },
      ],
    };
    const { run } = evaluateResumePdfQuality({
      generated: { ...generated, claims: [], selection: [project] },
      evaluationId: "evaluation-1",
      evaluatedAt: "2026-11-06T00:00:00.000Z",
      inputRef: "snapshot-1",
      outputRef: "output-1",
      pdfPageCount: 1,
    });

    expect(
      run.cases.filter(({ caseId }) => caseId.includes("/periodVariant/")),
    ).toEqual([]);
  });
  it("period 블록에 start 값이 부분 문자열로만 들어 있으면 보존으로 보지 않는다", () => {
    const withProbation = {
      ...employment,
      children: [
        ...employment.children,
        {
          ...leaf("probation", ""),
          children: [leaf("start", "2020")],
        },
      ],
    };
    const { run } = evaluateResumePdfQuality({
      generated: {
        ...generated,
        claims: [],
        selection: [withProbation],
        resume: "경력",
      },
      evaluationId: "evaluation-1",
      evaluatedAt: "2026-11-06T00:00:00.000Z",
      inputRef: "snapshot-1",
      outputRef: "output-1",
      pdfPageCount: 1,
    });

    expect(
      run.cases.filter(
        ({ caseId }) =>
          caseId.includes("/probation/") && caseId.endsWith("/start/text"),
      ),
    ).toEqual([expect.objectContaining({ decision: "fail" })]);
  });

  it("소유 레코드의 제목 블록은 같은 텍스트의 출력되지 않은 자식 원문을 대신 보존하지 않는다", () => {
    const project = {
      ...projectSource,
      id: "project-7",
      children: [
        projectSource.children[0],
        {
          ...projectSource.children[1],
          id: "variant-1",
          name: "responsibilityVariant",
          text: projectSource.children[0].text,
        },
      ],
    };
    const { run } = evaluateResumePdfQuality({
      generated: { ...generated, claims: [], selection: [project] },
      evaluationId: "evaluation-1",
      evaluatedAt: "2026-11-06T00:00:00.000Z",
      inputRef: "snapshot-1",
      outputRef: "output-1",
      pdfPageCount: 1,
    });

    expect(
      run.cases.filter(
        ({ metricId, caseId }) =>
          metricId === "required-fact-preservation" &&
          caseId.endsWith("/responsibilityVariant/text"),
      ),
    ).toEqual([expect.objectContaining({ decision: "fail" })]);
  });
  it("경력 연차의 구조화 값은 출력된 reportedText의 구성 요소이면 보존으로 본다", () => {
    const part = (name: string, text: string, unit?: string) => ({
      section: "profile",
      name,
      text,
      ...(unit ? { unit } : {}),
      sourceRefs: [],
      visibility: "public",
      children: [],
    });
    const profileSource = {
      id: "profile-1",
      section: "profile",
      name: "profile",
      text: "",
      sourceRefs: [],
      visibility: "public",
      children: [
        part("name", "홍길동"),
        {
          ...part("careerSummary", ""),
          children: [
            part("reportedYears", "6", "year"),
            part("reportedMonths", "4", "month"),
            part("reportedText", "총 6년 4개월"),
          ],
        },
      ],
    };
    const { run } = evaluateResumePdfQuality({
      generated: {
        ...generated,
        claims: [],
        // reportedText는 첫 경력의 요약 카드에 출력됩니다.
        selection: [profileSource, employment],
      },
      evaluationId: "evaluation-1",
      evaluatedAt: "2026-11-06T00:00:00.000Z",
      inputRef: "snapshot-1",
      outputRef: "output-1",
      pdfPageCount: 1,
    });

    expect(
      run.cases.filter(
        ({ metricId, caseId }) =>
          metricId === "required-fact-preservation" &&
          /\/(reportedYears|reportedMonths)\/text$/u.test(caseId),
      ),
    ).toEqual([
      expect.objectContaining({ decision: "pass" }),
      expect.objectContaining({ decision: "pass" }),
    ]);
  });
});
