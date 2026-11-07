import { countResumePdfPages } from "@mcp/modules/resume/quality/evaluate-resume-pdf";

describe("countResumePdfPages", () => {
  it("실제 페이지 객체만 세고 Pages 루트는 제외한다", () => {
    const pdf = Buffer.from(
      "%PDF-1.7\n/Type /Pages /Count 2\n/Type /Page\n/Type /Page\n%%EOF",
    );

    expect(countResumePdfPages(pdf)).toBe(2);
  });

  it("PDF가 아니면 페이지 수를 알 수 없는 값으로 반환한다", () => {
    expect(countResumePdfPages(Buffer.from("not a pdf"))).toBeNull();
  });
});
