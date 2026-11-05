import { resumeTemplateNames } from "@mcp/modules/resume/model/resume-template";
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
      if (name !== "convert_resume_to_pdf") expect(sample.xml).toBe(xml);
    }
  });

  it("선택 원소, 섹션, 양식, 근거 인용이 샘플 XML과 정의의 허용값에 모두 맞는다", () => {
    const xml = String(sampleOf("validate_resume_xml").xml);
    const ids = new Set([...xml.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));

    for (const name of [
      "preview_resume",
      "read_resume_selection",
      "check_resume_draft",
      "generate_resume",
      "render_resume_template",
      "render_resume_form",
    ]) {
      const sample = sampleOf(name);
      const elementIds = sample.elementIds as string[];
      expect(elementIds.length).toBeGreaterThan(3);
      for (const id of elementIds) expect(ids.has(id)).toBe(true);
      for (const section of sample.sectionOrder as string[])
        expect(sectionNames).toContain(section);
      if ("template" in sample)
        expect(resumeTemplateNames).toContain(sample.template);
    }

    for (const name of ["check_resume_draft", "generate_resume"]) {
      const claims = sampleOf(name).claims as Claim[];
      expect(claims.length).toBeGreaterThanOrEqual(3);
      for (const claim of claims) {
        for (const id of claim.sourceIds) expect(ids.has(id)).toBe(true);
        for (const evidence of claim.evidence) {
          expect(claim.sourceIds).toContain(evidence.sourceId);
          expect(xml).toContain(evidence.quote);
        }
      }
    }
  });

  it("모델 비용이 드는 새 생성이 아니라 직접 문장을 낸 샘플이라 모델을 호출하지 않고 PDF 샘플은 생성 ID 안내만 둔다", () => {
    expect(sampleOf("generate_resume").claims).toBeDefined();
    expect(sampleOf("generate_resume").generationId).toBeUndefined();
    expect(Object.keys(sampleOf("convert_resume_to_pdf"))).toEqual([
      "generationId",
    ]);
  });
});
