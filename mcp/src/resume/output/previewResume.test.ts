import { composeResume } from "@mcp/resume/compose/composeResume";
import { previewResume } from "@mcp/resume/output/previewResume";
import { connectedResume, resumeNode } from "@mcp/resume/testing/resumeFixture";

describe("previewResume", () => {
  it("대표 템플릿이 한글, 링크, 긴 텍스트를 그대로 보여 준다", () => {
    const longText = "한".repeat(180);
    const composed = composeResume(
      connectedResume([
        resumeNode("name", { text: "테스트 사용자" }),
        resumeNode("summary", { text: longText }),
        resumeNode("url", { text: "https://example.com/resume" }),
      ]),
      {
        elementIds: ["profile-test"],
        sectionOrder: ["profile"],
      },
    );

    const preview = previewResume(composed);

    expect(preview).toContain("테스트 사용자");
    expect(preview).toContain(longText);
    expect(preview).toContain("https://example.com/resume");
  });
});
