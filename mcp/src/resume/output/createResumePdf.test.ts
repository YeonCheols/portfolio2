/** @jest-environment node */

import { createResumePdf } from "@mcp/resume/output/createResumePdf";
import type { ResumePdfInput } from "@mcp/resume/output/createResumePdf";

const resumeInput = (statementText = ""): ResumePdfInput => ({
  resume: "프로필\nFrontend engineer",
  claims: [],
  selection: [
    {
      id: "profile-test",
      section: "profile",
      name: "profile",
      text: "",
      sourceRefs: [],
      visibility: "public",
      children: [
        {
          section: "profile",
          name: "name",
          text: "테스트 사용자",
          sourceRefs: [],
          visibility: "public",
          children: [],
        },
        {
          section: "profile",
          name: "headline",
          text: "Frontend engineer",
          sourceRefs: [],
          visibility: "public",
          children: [],
        },
      ],
    },
    ...(statementText
      ? [
          {
            id: "statement-test",
            section: "personalStatements",
            name: "statement",
            text: "",
            sourceRefs: [],
            visibility: "public",
            children: [
              {
                section: "personalStatements",
                name: "title",
                text: "자기소개",
                sourceRefs: [],
                visibility: "public",
                children: [],
              },
              {
                section: "personalStatements",
                name: "text",
                text: statementText,
                sourceRefs: [],
                visibility: "public",
                children: [],
              },
            ],
          },
        ]
      : []),
  ],
});

describe("createResumePdf", () => {
  it("한글 이력서 본문을 PDF 바이트로 만든다", async () => {
    const pdf = await createResumePdf(resumeInput());
    const header = pdf.subarray(0, 5).toString("ascii");
    const end = pdf.subarray(-6).toString("ascii");

    expect(header).toBe("%PDF-");
    expect(end).toContain("%%EOF");
    expect(pdf.length).toBeGreaterThan(1_000);
    expect(pdf.toString("latin1")).toContain("NotoSansKR-Regular");
  });

  it("본문이 길면 새 페이지로 이어서 출력한다", async () => {
    const statement = Array.from(
      { length: 180 },
      (_, index) => `긴 자기소개 내용 ${index + 1}입니다.`,
    ).join(" ");
    const pdf = await createResumePdf(resumeInput(statement));
    const pageCount =
      pdf.toString("latin1").match(/\/Type \/Page\b/g)?.length ?? 0;

    expect(pageCount).toBeGreaterThan(1);
  });
});
