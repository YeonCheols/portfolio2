import { ResumeConnectionError } from "@mcp/resume/connection/resumeConnection";
import { connectedResume } from "@mcp/resume/testing/resumeFixture";
import { handleMcpRequest } from "@mcp/resume/tools/handleMcpRequest";
import type { ResumeConnection } from "@mcp/resume/tools/resumeTools";

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

  it("도구 목록에 선택한 원소의 구조화 조회를 포함한다", async () => {
    const response = await handleMcpRequest(
      { jsonrpc: "2.0", id: 6, method: "tools/list" },
      connection,
    );

    expect(response).toMatchObject({
      result: {
        tools: expect.arrayContaining([
          expect.objectContaining({
            name: "read_resume_selection",
            description:
              "선택한 원소의 식별자, 원문, 출처, 공개 여부를 반환한다",
          }),
        ]),
      },
    });
  });

  it("도구 목록에 초안 근거 검사를 포함한다", async () => {
    const response = await handleMcpRequest(
      { jsonrpc: "2.0", id: 7, method: "tools/list" },
      connection,
    );

    expect(response).toMatchObject({
      result: {
        tools: expect.arrayContaining([
          expect.objectContaining({
            name: "check_resume_draft",
            description:
              "초안 문장의 근거를 선택 원소와 맞춰 누락, 충돌, 확인 대상을 반환한다",
          }),
        ]),
      },
    });
  });

  it("도구 목록에 이력서 생성을 포함한다", async () => {
    const response = await handleMcpRequest(
      { jsonrpc: "2.0", id: 8, method: "tools/list" },
      connection,
    );

    expect(response).toMatchObject({
      result: {
        tools: expect.arrayContaining([
          expect.objectContaining({
            name: "generate_resume",
            description:
              "어떤 AI든 같은 작성자 역할로 양식의 각 섹션을 다시 쓰게 하고, 받은 문장을 검사해 최종 본문을 만든다",
            inputSchema: {
              type: "object",
              properties: {
                template: {
                  type: "string",
                  enum: ["기본형", "경력 중심형", "프로젝트 중심형"],
                },
                interpretation: { type: "string" },
                claims: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      sourceIds: { type: "array", items: { type: "string" } },
                      formItem: { type: "string" },
                    },
                    required: ["text", "sourceIds"],
                  },
                },
              },
              required: ["template"],
            },
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

  it("템플릿 출력과 양식 출력은 같은 템플릿 이름만 계약으로 알린다", async () => {
    const response = await handleMcpRequest(
      { jsonrpc: "2.0", id: 5, method: "tools/list" },
      connection,
    );
    const tools =
      response && "result" in response
        ? (
            response.result as {
              tools: {
                name: string;
                inputSchema: {
                  properties?: { template?: { enum?: string[] } };
                };
              }[];
            }
          ).tools
        : [];
    const templateTools = tools.filter(
      (tool) =>
        tool.name === "render_resume_template" ||
        tool.name === "render_resume_form",
    );

    expect(templateTools).toHaveLength(2);
    templateTools.forEach((tool) => {
      expect(tool.inputSchema.properties?.template?.enum).toEqual([
        "기본형",
        "경력 중심형",
        "프로젝트 중심형",
      ]);
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
