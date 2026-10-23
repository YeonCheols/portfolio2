import { ResumeConnectionError } from "../connection/resumeConnection";
import { connectedResume } from "../testing/resumeFixture";
import { handleMcpRequest } from "./handleMcpRequest";
import type { ResumeConnection } from "./resumeTools";

const connection: ResumeConnection = {
  load: async (input) => {
    if (!input.xml?.includes('schemaVersion="0.2.0"')) {
      throw new ResumeConnectionError("MALFORMED_XML");
    }

    return connectedResume();
  },
};

describe("handleMcpRequest", () => {
  it("도구 호출로 연결, 선택, 미리보기까지 이어진다", async () => {
    const response = await handleMcpRequest(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "preview_resume",
          arguments: {
            source: "embedded",
            xml: 'schemaVersion="0.2.0"',
            elementIds: ["profile-test"],
            sectionOrder: ["profile"],
          },
        },
      },
      connection,
    );

    expect(response).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        isError: false,
        content: [
          { type: "text", text: expect.stringContaining("테스트 사용자") },
        ],
      },
    });
  });

  it("도구 목록에 템플릿 출력 도구를 포함한다", async () => {
    const response = await handleMcpRequest(
      { jsonrpc: "2.0", id: 3, method: "tools/list" },
      connection,
    );

    expect(response).toMatchObject({
      result: {
        tools: expect.arrayContaining([
          expect.objectContaining({
            name: "render_resume_template",
            description: "선택한 원소를 라벨이 있는 템플릿으로 출력한다",
          }),
        ]),
      },
    });
  });

  it("도구 목록에 이력서 양식 출력 도구를 포함한다", async () => {
    const response = await handleMcpRequest(
      { jsonrpc: "2.0", id: 4, method: "tools/list" },
      connection,
    );

    expect(response).toMatchObject({
      result: {
        tools: expect.arrayContaining([
          expect.objectContaining({
            name: "render_resume_form",
            description: "선택한 원소를 이력서 양식으로 출력한다",
          }),
        ]),
      },
    });
  });

  it("연결이 거부한 XML 도구 호출은 오류 코드만 반환한다", async () => {
    const xml = "<resumeAsset><profile>hidden@example.com</resumeAsset>";

    const response = await handleMcpRequest(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "validate_resume_xml",
          arguments: { source: "embedded", xml },
        },
      },
      connection,
    );

    expect(response).toMatchObject({
      result: {
        isError: true,
        content: [{ type: "text", text: "MALFORMED_XML" }],
      },
    });
    expect(JSON.stringify(response)).not.toContain("hidden@example.com");
  });
});
