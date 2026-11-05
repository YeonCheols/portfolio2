/** @jest-environment node */

import { createResumeGenerationStore } from "@mcp/modules/resume/generation/resume-generation-store";
import { connectedResume } from "@mcp/modules/resume/testing/resume-fixture";
import { handleMcpRequest } from "@mcp/interfaces/tools/handle-mcp-request";
import type { ResumeConnection } from "@mcp/interfaces/tools/resume/resume-tools";
import { ResumeConnectionError } from "@mcp/infrastructure/connection/connection";

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

  it("도구 목록은 새 생성 입력과 기존 생성 ID 재실행 입력을 구분한다", async () => {
    const response = await handleMcpRequest(
      { jsonrpc: "2.0", id: 8, method: "tools/list" },
      connection,
    );
    expect(response).toMatchObject({
      result: {
        tools: expect.arrayContaining([
          expect.objectContaining({
            name: "generate_resume",
            inputSchema: {
              oneOf: [
                expect.objectContaining({
                  required: [
                    "source",
                    "elementIds",
                    "sectionOrder",
                    "template",
                  ],
                  additionalProperties: false,
                }),
                expect.objectContaining({
                  required: ["generationId"],
                  additionalProperties: false,
                }),
              ],
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

  it("도구 입력 스키마가 런타임에 필요한 연결 및 선택 인자를 안내한다", async () => {
    const response = await handleMcpRequest(
      { jsonrpc: "2.0", id: 9, method: "tools/list" },
      connection,
    );
    const tools =
      response && "result" in response
        ? (
            response.result as {
              tools: {
                name: string;
                inputSchema: {
                  properties?: Record<
                    string,
                    { type?: string; enum?: string[] }
                  >;
                  required?: string[];
                  allOf?: unknown[];
                };
              }[];
            }
          ).tools
        : [];
    const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));

    ["validate_resume_xml", "list_resume_elements"].forEach((name) => {
      expect(byName[name].inputSchema.properties?.source).toEqual({
        type: "string",
        enum: ["repository", "embedded", "file"],
      });
      expect(byName[name].inputSchema.required).toContain("source");
      expect(byName[name].inputSchema.allOf).toEqual([
        {
          if: { properties: { source: { enum: ["embedded", "file"] } } },
          then: { required: ["xml"] },
        },
      ]);
    });
    [
      "preview_resume",
      "read_resume_selection",
      "check_resume_draft",
      "render_resume_template",
      "render_resume_form",
    ].forEach((name) => {
      const schema = byName[name].inputSchema;
      expect(schema.properties?.source?.enum).toEqual([
        "repository",
        "embedded",
        "file",
      ]);
      expect(schema.properties?.elementIds?.type).toBe("array");
      expect(schema.properties?.sectionOrder?.type).toBe("array");
      expect(schema.required).toEqual(
        expect.arrayContaining(["source", "elementIds", "sectionOrder"]),
      );
    });
    expect(byName.convert_resume_to_pdf.inputSchema.required).toEqual([
      "generationId",
    ]);
  });

  it("생성 ID를 PDF에 전달하면 모델 추가 호출 없이 실제 PDF 바이너리 리소스를 반환한다", async () => {
    const generation = {
      store: createResumeGenerationStore(),
      scope: { subject: "fixture-user", environment: "production" },
    };
    const model = {
      generate: jest.fn(async () =>
        JSON.stringify({
          claims: [
            {
              text: "테스트 사용자입니다",
              sourceIds: ["profile-test"],
              evidence: [{ sourceId: "profile-test", quote: "테스트 사용자" }],
            },
          ],
        }),
      ),
    };
    const generated = await handleMcpRequest(
      {
        jsonrpc: "2.0",
        id: 10,
        method: "tools/call",
        params: {
          name: "generate_resume",
          arguments: {
            source: "embedded",
            xml: 'schemaVersion="0.2.0"',
            elementIds: ["profile-test"],
            sectionOrder: ["profile"],
            template: "기본형",
          },
        },
      },
      connection,
      model,
      generation,
    );
    expect(generated).toMatchObject({ result: { isError: false } });
    if (
      !generated ||
      !("result" in generated) ||
      !generated.result ||
      !("content" in generated.result)
    )
      throw new Error("result missing");
    const generatedText = generated.result.content?.[0];
    if (!generatedText || !("text" in generatedText))
      throw new Error("text missing");
    const { generationId } = JSON.parse(generatedText.text);
    const converted = await handleMcpRequest(
      {
        jsonrpc: "2.0",
        id: 11,
        method: "tools/call",
        params: { name: "convert_resume_to_pdf", arguments: { generationId } },
      },
      connection,
      model,
      generation,
    );
    expect(converted).toMatchObject({ result: { isError: false } });
    if (
      !converted ||
      !("result" in converted) ||
      !converted.result ||
      !("content" in converted.result)
    )
      throw new Error("content missing");
    const resource = converted.result.content?.find(
      (item) => "resource" in item,
    );
    if (!resource || !("resource" in resource)) throw new Error("PDF missing");
    expect(resource.resource.mimeType).toBe("application/pdf");
    expect(
      Buffer.from(resource.resource.blob, "base64").subarray(0, 5).toString(),
    ).toBe("%PDF-");
    expect(model.generate).toHaveBeenCalledTimes(1);
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
