/** @jest-environment node */

import PDFDocument from "pdfkit";

import {
  createResumePdf,
  resumePdfContinuationLabel,
} from "@mcp/resume/output/createResumePdf";
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
  it("CRLF·CR 개행을 보존하고 한 줄보다 긴 URL은 글자 손실 없이 나눈다", async () => {
    const text = jest.spyOn(PDFDocument.prototype, "text");
    const longUrl = `https://example.test/${"long-path".repeat(80)}`;
    try {
      await createResumePdf(
        resumeInput(`첫 문단\r\n\r\n둘째 문단\r${longUrl}`),
      );
      const first = text.mock.calls.find((call) => call[0] === "첫 문단");
      const second = text.mock.calls.find((call) => call[0] === "둘째 문단");
      expect(first).toBeDefined();
      expect(second).toBeDefined();
      expect(Number(second?.[2]) - Number(first?.[2])).toBeCloseTo(24.4);
      const start = text.mock.calls.findIndex(
        (call) => call[0] === "둘째 문단",
      );
      const lines = text.mock.calls
        .slice(start + 1)
        .filter((call) => call[1] === 160)
        .map((call) => call[0]);
      expect(lines.length).toBeGreaterThan(1);
      expect(lines.join("")).toBe(longUrl);
    } finally {
      text.mockRestore();
    }
  });
  it("여러 페이지의 자기소개서를 공백 경계로 나눠 단어를 중간에 자르지 않는다", async () => {
    const text = jest.spyOn(PDFDocument.prototype, "text");
    const vocabulary = [
      "검증용",
      "본문입니다.",
      "입력",
      "정보를",
      "보존하고",
      "예외",
      "상황을",
      "점검하며",
      "안정적인",
      "사용자",
      "경험을",
      "만듭니다.",
    ];
    const words = Array.from({ length: 110 }, () => vocabulary).flat();
    try {
      const pdf = await createResumePdf(resumeInput(words.join(" ")));
      const start = text.mock.calls.findIndex((call) => call[0] === "자기소개");
      expect(start).toBeGreaterThan(-1);
      const body = text.mock.calls
        .slice(start + 1)
        .filter((call) => call[1] === 160)
        .map((call) => call[0])
        .join(" ");
      expect(body.trim().split(/\s+/)).toEqual(words);
      expect(
        pdf.toString("latin1").match(/\/Type \/Page\b/g)?.length,
      ).toBeGreaterThan(1);
    } finally {
      text.mockRestore();
    }
  });
  it("자기소개서의 명시적 줄바꿈과 빈 줄을 실제 PDF 배치에 보존한다", async () => {
    const text = jest.spyOn(PDFDocument.prototype, "text");
    try {
      await createResumePdf(
        resumeInput("첫 번째 문단입니다.\n\n두 번째 문단입니다."),
      );
      const first = text.mock.calls.find(
        (call) => call[0] === "첫 번째 문단입니다.",
      );
      const second = text.mock.calls.find(
        (call) => call[0] === "두 번째 문단입니다.",
      );
      expect(first).toBeDefined();
      expect(second).toBeDefined();
      expect(Number(second?.[2]) - Number(first?.[2])).toBeCloseTo(24.4);
    } finally {
      text.mockRestore();
    }
  });
  it("페이지가 넘어가면 섹션과 프로젝트의 이어지는 위치를 표시한다", () => {
    expect(resumePdfContinuationLabel("경력", ["플랫폼 재구축"])).toBe(
      "경력 · 플랫폼 재구축 (계속)",
    );
  });

  it("한글 이력서 본문을 PDF 바이트로 만든다", async () => {
    const pdf = await createResumePdf(resumeInput());
    expect(Buffer.isBuffer(pdf)).toBe(true);
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
