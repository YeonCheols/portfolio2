import { composeResume } from "@mcp/resume/compose/composeResume";
import { connectedResume } from "@mcp/resume/testing/resumeFixture";

describe("composeResume", () => {
  it("선택한 원소만 지정한 섹션 순서로 남기고 출처 참조를 유지한다", () => {
    const composed = composeResume(connectedResume(), {
      elementIds: ["profile-test"],
      sectionOrder: ["profile", "metadata"],
    });

    expect(Object.keys(composed.sections)).toEqual(["profile", "metadata"]);
    expect(composed.sections.profile[0].attributes.sourceRefs).toBe(
      "source-page-1",
    );
    expect(composed.sections.profile[0].references.sourceRefs).toEqual([
      "source-page-1",
    ]);
    expect(composed.sections.profile[0].children[0].text).toBe("테스트 사용자");
    expect(JSON.stringify(composed)).not.toContain("employment-test");
    expect(JSON.stringify(composed)).not.toContain("포함되면 안 되는 회사");
  });
});
