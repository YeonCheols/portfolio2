import type { ResumeSelectionNode } from "@mcp/resume/output/checkResumeDraft";
import {
  resumeWriterPersona,
  runResumeHarness,
  type ResumeModelRequest,
} from "@mcp/resume/output/runResumeHarness";

const employment: ResumeSelectionNode = {
  id: "employment-selected",
  section: "employmentHistory",
  name: "employment",
  text: "",
  sourceRefs: ["source-page-1"],
  visibility: "private",
  children: [
    {
      section: "employmentHistory",
      name: "organization",
      text: "선택한 회사",
      sourceRefs: [],
      visibility: "public",
      children: [],
    },
  ],
};

const recordingClient = (responses: string[]) => {
  const requests: ResumeModelRequest[] = [];
  return {
    requests,
    generate: async (input: ResumeModelRequest) => {
      requests.push(input);
      return responses[requests.length - 1] ?? "";
    },
  };
};

describe("runResumeHarness", () => {
  it("생성 요청의 첫 단계는 이력서 전문 작성자 역할로 원소를 해석한다", async () => {
    const client = recordingClient([
      JSON.stringify({
        elements: [
          {
            id: "employment-selected",
            interpretation: "선택한 회사에서 일했다",
          },
        ],
      }),
    ]);

    await runResumeHarness([employment], client);

    expect(client.requests[0]?.persona).toBe(resumeWriterPersona);
    expect(resumeWriterPersona).toContain("이력서 전문 작성자");
    expect(resumeWriterPersona).toContain("XML에 없는");
    expect(client.requests[0]?.prompt).toContain("해석");
    expect(client.requests[0]?.prompt).toContain("employment-selected");
    expect(client.requests[0]?.prompt).toContain("선택한 회사");
  });

  it("해석 뒤에 다시 쓴 문장 중 검사를 통과한 것만 최종 이력서에 남긴다", async () => {
    const client = recordingClient([
      JSON.stringify({
        elements: [
          {
            id: "employment-selected",
            interpretation: "선택한 회사에서 일했다",
          },
        ],
      }),
      JSON.stringify({
        claims: [
          {
            text: "선택한 회사에서 일했습니다",
            sourceIds: ["employment-selected"],
          },
          { text: "없는 성과를 냈습니다", sourceIds: ["missing-id"] },
        ],
      }),
    ]);

    const result = await runResumeHarness([employment], client);

    expect(client.requests).toHaveLength(2);
    expect(client.requests[1]?.persona).toBe(resumeWriterPersona);
    expect(client.requests[1]?.prompt).toContain("재작성");
    expect(client.requests[1]?.prompt).toContain("선택한 회사에서 일했다");
    expect(result.resume).toBe("선택한 회사에서 일했습니다");
    expect(result.resume).not.toContain("없는 성과");
    expect(result.claims[0]?.sources[0]?.sourceRefs).toEqual(["source-page-1"]);
    expect(result.claims[0]?.sources[0]?.visibility).toBe("private");
    expect(JSON.stringify(result.claims)).toContain("선택한 회사");
  });

  it("양식의 각 섹션을 따로 해석하고 다시 쓴 문장만 이어 붙인다", async () => {
    const profile: ResumeSelectionNode = {
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
      ],
    };
    const client = recordingClient([
      JSON.stringify({
        elements: [{ id: "profile-test", interpretation: "이름을 소개한다" }],
      }),
      JSON.stringify({
        claims: [{ text: "테스트 사용자입니다", sourceIds: ["profile-test"] }],
      }),
      JSON.stringify({
        elements: [
          {
            id: "employment-selected",
            interpretation: "선택한 회사에서 일했다",
          },
        ],
      }),
      JSON.stringify({
        claims: [
          {
            text: "선택한 회사에서 일했습니다",
            sourceIds: ["employment-selected"],
          },
        ],
      }),
    ]);

    const result = await runResumeHarness([profile, employment], client, [
      { section: "profile", text: "프로필\n이름 테스트 사용자" },
      { section: "employmentHistory", text: "경력\n회사 선택한 회사" },
    ]);

    expect(client.requests).toHaveLength(4);
    expect(client.requests[0]?.prompt).toContain("이름 테스트 사용자");
    expect(client.requests[0]?.prompt).not.toContain("회사 선택한 회사");
    expect(client.requests[2]?.prompt).toContain("회사 선택한 회사");
    expect(client.requests[2]?.prompt).not.toContain("이름 테스트 사용자");
    expect(result.resume).toBe(
      "테스트 사용자입니다\n선택한 회사에서 일했습니다",
    );
  });

  it("해석 결과가 없으면 문장을 다시 쓰지 않는다", async () => {
    const client = recordingClient([
      JSON.stringify({ elements: [] }),
      JSON.stringify({
        claims: [
          {
            text: "없는 성과를 냈습니다",
            sourceIds: ["employment-selected"],
          },
        ],
      }),
    ]);

    const result = await runResumeHarness([employment], client);

    expect(client.requests).toHaveLength(1);
    expect(result.resume).toBe("");
  });
});
