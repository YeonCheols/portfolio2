import { resumeTemplateNames } from "@mcp/modules/resume/model/resume-template";
import { completeResumeGeneration } from "@mcp/modules/resume/generation/run-resume-harness";
import { evaluateResumePdfQuality } from "@mcp/modules/resume/quality/evaluate-resume-pdf";
import { assertResumePdfReady } from "@mcp/modules/resume/validation/assert-resume-pdf-ready";
import { resumeToolDefinitions } from "@mcp/interfaces/tools/handle-mcp-request";
import { resumeToolSamples } from "@mcp/interfaces/tools/resume/resume-tool-samples";

const sectionNames = [
  "profile",
  "educationHistory",
  "employmentHistory",
  "projects",
];

type Claim = {
  text: string;
  sourceIds: string[];
  evidence: Array<{ sourceId: string; quote: string }>;
};

const sampleOf = (name: string) =>
  resumeToolSamples[name] as Record<string, unknown>;

const qualitySampleSelection = [
  {
    section: "profile",
    name: "profile",
    id: "quality-profile-sample",
    children: [
      { name: "name", text: "홍길동" },
      {
        name: "headline",
        text: "원문 근거를 보존하는 프론트엔드 개발자입니다",
      },
    ],
  },
  {
    section: "educationHistory",
    name: "education",
    id: "quality-education-sample",
    children: [{ name: "institution", text: "예시대학교" }],
  },
  {
    section: "projects",
    name: "project",
    id: "quality-project-sample",
    children: [
      { name: "title", text: "품질 기준 샘플 프로젝트" },
      { name: "role", text: "대시보드 개발" },
      {
        name: "summary",
        text: "운영 상태를 한눈에 확인할 수 있는 대시보드를 구성했습니다",
      },
    ],
  },
  {
    section: "projects",
    name: "project",
    id: "quality-project-secondary-sample",
    children: [
      { name: "title", text: "품질 지표 조회 화면 구성" },
      { name: "role", text: "화면 개발" },
    ],
  },
].map((node) => ({
  ...node,
  text: "",
  sourceRefs: [],
  visibility: "public",
  children: node.children.map((child) => ({
    ...child,
    section: node.section,
    sourceRefs: [],
    visibility: "public",
    children: [],
  })),
}));

describe("이력서 도구 샘플 입력", () => {
  it("모든 도구가 샘플을 하나씩 가지고 도구 정의에 없는 샘플은 없다", () => {
    const names = resumeToolDefinitions.map((tool) => tool.name).sort();

    expect(Object.keys(resumeToolSamples).sort()).toEqual(names);
    for (const name of names)
      expect(JSON.parse(JSON.stringify(sampleOf(name)))).toEqual(
        sampleOf(name),
      );
  });

  it("XML을 받는 도구의 샘플은 같은 가상 이력서를 쓰고 경력·프로젝트·학력을 풍부하게 담는다", () => {
    const xml = String(sampleOf("validate_resume_xml").xml);

    expect(sampleOf("validate_resume_xml").source).toBe("embedded");
    expect(xml).toContain('schemaVersion="0.2.0"');
    expect(xml.match(/<employment /g)?.length).toBeGreaterThanOrEqual(2);
    expect(xml.match(/<project /g)?.length).toBeGreaterThanOrEqual(3);
    expect(xml.match(/<education /g)?.length).toBeGreaterThanOrEqual(1);
    for (const name of resumeToolDefinitions.map((tool) => tool.name)) {
      const sample = sampleOf(name);
      if (name !== "convert_resume_to_pdf" && name !== "generate_resume")
        expect(sample.xml).toBe(xml);
    }
  });

  it("선택 원소, 섹션, 양식, 근거 인용이 샘플 XML과 정의의 허용값에 모두 맞는다", () => {
    const xml = String(sampleOf("validate_resume_xml").xml);
    const claimXml = String(sampleOf("check_resume_draft").xml);
    const claimIds = new Set(
      [...claimXml.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]),
    );

    for (const name of [
      "preview_resume",
      "read_resume_selection",
      "check_resume_draft",
      "generate_resume",
      "render_resume_template",
      "render_resume_form",
    ]) {
      const sample = sampleOf(name);
      const sampleXml = String(sample.xml ?? xml);
      const ids = new Set(
        [...sampleXml.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]),
      );
      const elementIds = sample.elementIds as string[];
      expect(elementIds.length).toBeGreaterThan(3);
      for (const id of elementIds) expect(ids.has(id)).toBe(true);
      for (const section of sample.sectionOrder as string[])
        expect(sectionNames).toContain(section);
      if ("template" in sample)
        expect(resumeTemplateNames).toContain(sample.template);
    }

    for (const name of ["check_resume_draft"]) {
      const claims = sampleOf(name).claims as Claim[];
      expect(claims.length).toBeGreaterThanOrEqual(3);
      for (const claim of claims) {
        for (const id of claim.sourceIds) expect(claimIds.has(id)).toBe(true);
        for (const evidence of claim.evidence) {
          expect(claim.sourceIds).toContain(evidence.sourceId);
          expect(claimXml).toContain(evidence.quote);
        }
      }
    }
  });

  it("이력서 품질 샘플은 필수 항목만 원문 fallback으로 평가하고 날짜 수치는 피하며 PDF 샘플은 ID 안내만 둔다", () => {
    const qualitySample = sampleOf("generate_resume");

    expect(qualitySample.claims).toEqual([
      expect.objectContaining({
        sourceIds: ["quality-project-sample"],
        formItem: "summary",
      }),
    ]);
    expect(qualitySample.xml).toContain(
      "운영 상태를 한눈에 확인할 수 있는 대시보드를 구성했습니다",
    );
    expect(qualitySample.elementIds).toEqual([
      "quality-profile-sample",
      "quality-education-sample",
      "quality-project-sample",
      "quality-project-secondary-sample",
    ]);
    expect(qualitySample.xml).toMatch(/<metadata\b/u);
    expect(qualitySample.xml).toContain('sourceRefs="quality-source-sample"');
    expect(qualitySample.xml).not.toMatch(/<period\b/u);
    expect(qualitySample.xml).toContain("예시대학교");
    expect(qualitySample.xml).toContain("품질 기준 샘플 프로젝트");
    expect(qualitySample.xml).toContain("품질 지표 조회 화면 구성");
    expect(sampleOf("generate_resume").generationId).toBeUndefined();
    expect(Object.keys(sampleOf("convert_resume_to_pdf"))).toEqual([
      "generationId",
    ]);
  });

  it("이력서 품질 생성 샘플은 비어 있지 않은 본문을 만들어 PDF 준비 검사를 통과한다", () => {
    const claims = sampleOf("generate_resume").claims as Claim[];
    const generated = completeResumeGeneration(
      qualitySampleSelection,
      JSON.stringify({ claims }),
    );

    expect(generated.resume.trim()).not.toBe("");
    expect(() => assertResumePdfReady(generated)).not.toThrow();
  });

  it("품질 샘플은 실제 실패 없이 검토 대기만 남겨 PDF 변환을 허용한다", () => {
    const claims = sampleOf("generate_resume").claims as Claim[];
    const generated = completeResumeGeneration(
      qualitySampleSelection,
      JSON.stringify({ claims }),
    );
    const evaluation = evaluateResumePdfQuality({
      generated,
      evaluationId: "quality-sample-evaluation",
      evaluatedAt: "2026-11-06T00:00:00.000Z",
      inputRef: "quality-sample-input",
      outputRef: "quality-sample-output",
      pdfPageCount: 1,
    });
    expect(
      evaluation.aggregates
        .filter(
          (metric) =>
            metric.metricId !== "pdf-layout" &&
            metric.metricId !== "claim-support",
        )
        .every((metric) => metric.blockingCases === 0),
    ).toBe(true);
    expect(
      evaluation.aggregates.find(
        (metric) => metric.metricId === "claim-support",
      ),
    ).toEqual(
      expect.objectContaining({ blockingCases: 0, needsReviewCases: 1 }),
    );
    expect(
      evaluation.aggregates.find((metric) => metric.metricId === "pdf-layout"),
    ).toEqual(
      expect.objectContaining({ blockingCases: 0, needsReviewCases: 1 }),
    );
    const sourcePreservation = evaluation.aggregates.find(
      (metric) => metric.metricId === "required-fact-preservation",
    );
    expect(sourcePreservation?.denominator).toBeGreaterThan(0);
    expect(sourcePreservation?.passedCases).toBe(
      sourcePreservation?.denominator,
    );
    expect(
      evaluation.aggregates.find(
        (metric) => metric.metricId === "numeric-integrity",
      )?.denominator,
    ).toBe(0);
  });
});
