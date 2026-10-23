import type { ResumeModel, ResumeXmlNode } from "@mcp/resume/model/resumeModel";

export const resumeNode = (
  name: string,
  options: {
    attributes?: Record<string, string>;
    references?: Record<string, readonly string[]>;
    text?: string;
    children?: readonly ResumeXmlNode[];
  } = {},
): ResumeXmlNode => ({
  name,
  attributes: options.attributes ?? {},
  references: options.references ?? {},
  text: options.text ?? "",
  children: options.children ?? [],
  content: options.children ?? [],
});

export const connectedResume = (
  profileChildren: readonly ResumeXmlNode[] = [
    resumeNode("name", {
      attributes: { visibility: "public" },
      text: "테스트 사용자",
    }),
    resumeNode("email", {
      attributes: { visibility: "private" },
      text: "hidden@example.com",
    }),
  ],
): ResumeModel => ({
  id: "resume-test",
  schemaVersion: "0.2.0",
  language: "ko-KR",
  status: "draft",
  publicationStatus: "internal-only",
  visibility: "private",
  attributes: { id: "resume-test" },
  sections: {
    metadata: [
      resumeNode("metadata", {
        children: [
          resumeNode("sourceDocument", {
            attributes: { id: "source-page-1", visibility: "private-source" },
          }),
        ],
      }),
    ],
    profile: [
      resumeNode("profile", {
        attributes: {
          id: "profile-test",
          sourceRefs: "source-page-1",
          visibility: "private",
        },
        references: { sourceRefs: ["source-page-1"] },
        children: profileChildren,
      }),
    ],
    employmentHistory: [
      resumeNode("employmentHistory", {
        children: [
          resumeNode("employment", {
            attributes: {
              id: "employment-test",
              sourceRefs: "source-page-1",
              visibility: "private",
            },
            references: { sourceRefs: ["source-page-1"] },
            children: [
              resumeNode("organization", { text: "포함되면 안 되는 회사" }),
            ],
          }),
        ],
      }),
    ],
  },
});
