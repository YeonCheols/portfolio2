import { ResumeConnectionError } from "./resumeConnection";
import { connectedResume } from "./resumeFixture";
import { callResumeTool, type ResumeConnection } from "./resumeTools";

const connection: ResumeConnection = {
  load: async (input) => {
    if (!input.xml?.includes('schemaVersion="0.2.0"')) {
      throw new ResumeConnectionError("MALFORMED_XML");
    }

    return connectedResume();
  },
};

describe("callResumeTool", () => {
  it("연결이 거부한 XML은 오류 코드만 반환하고 이력서를 만들지 않는다", async () => {
    const xml = "<resumeAsset><profile></resumeAsset>";

    const result = await callResumeTool(
      "validate_resume_xml",
      { source: "embedded", xml },
      connection,
    );

    expect(result).toEqual({ ok: false, code: "MALFORMED_XML" });
    expect(JSON.stringify(result)).not.toContain("<profile>");
  });

  it("미리보기 도구는 연결로 받은 모델에서 선택한 원소의 원문만 반환한다", async () => {
    const result = await callResumeTool(
      "preview_resume",
      {
        source: "embedded",
        xml: 'schemaVersion="0.2.0"',
        elementIds: ["profile-test"],
        sectionOrder: ["profile"],
      },
      connection,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toContain("테스트 사용자");
    expect(result.text).not.toContain("포함되면 안 되는 회사");
  });

  it("원소 조회는 식별자와 출처만 반환하고 원소 본문은 넣지 않는다", async () => {
    const result = await callResumeTool(
      "list_resume_elements",
      { source: "embedded", xml: 'schemaVersion="0.2.0"' },
      connection,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.parse(result.text)).toEqual(
      expect.arrayContaining([
        {
          id: "profile-test",
          section: "profile",
          name: "profile",
          sourceRefs: ["source-page-1"],
        },
      ]),
    );
    expect(result.text).not.toContain("hidden@example.com");
    expect(result.text).not.toContain("테스트 사용자");
  });
});
