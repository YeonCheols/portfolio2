import fs from "fs";
import path from "path";

import type { ResumeXmlNode } from "./parseResumeXml";
import { readResumeModel } from "./readResumeModel";

const validResumeXml = `<?xml version="1.0" encoding="UTF-8"?>
<resumeAsset id="resume-test" schemaVersion="0.2.0" xml:lang="ko-KR" status="draft" publicationStatus="internal-only" visibility="private" xmlns:xml="http://www.w3.org/XML/1998/namespace">
  <metadata><sourceDocument id="source-page-1" visibility="private-source" /></metadata>
  <profile id="profile-test" sourceRefs="source-page-1" visibility="private">
    <name visibility="public">테스트 사용자</name>
  </profile>
</resumeAsset>`;

const canonicalResumePath = path.join(
  process.cwd(),
  "src/contents/resume/resume.xml",
);

describe("readResumeModel", () => {
  it("임베드와 파일 입력을 같은 모델로 돌려주고 기준 파일을 바꾸지 않는다", () => {
    const before = fs.readFileSync(canonicalResumePath, "utf8");

    const embedded = readResumeModel({
      source: "embedded",
      xml: validResumeXml,
    });
    const file = readResumeModel({ source: "file", xml: validResumeXml });

    expect(embedded).toEqual(file);
    expect(embedded).toMatchObject({
      ok: true,
      model: { id: "resume-test", schemaVersion: "0.2.0" },
    });
    expect(fs.readFileSync(canonicalResumePath, "utf8")).toBe(before);
  });

  it("저장소 원본을 읽고 함께 온 XML로 기준 파일을 덮어쓰지 않는다", () => {
    const before = fs.readFileSync(canonicalResumePath, "utf8");

    const result = readResumeModel({
      source: "repository",
      xml: validResumeXml,
    });

    expect(result).toMatchObject({
      ok: true,
      model: { id: "resume-seong-yeoncheol" },
    });
    expect(fs.readFileSync(canonicalResumePath, "utf8")).toBe(before);
  });

  it("저장소 원본의 프로젝트 설명은 근거가 있는 경우에만 채운다", () => {
    const result = readResumeModel({ source: "repository" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const projects = (result.model.sections.projects ?? [])
      .flatMap((section) => section.children)
      .filter((node) => node.name === "project");

    expect(projects.length).toBeGreaterThan(0);
    projects.forEach((project) => {
      const technicalStructure = project.children.find(
        (child) => child.name === "technicalStructure",
      );
      const projectApproach = project.children.find(
        (child) => child.name === "projectApproach",
      );

      expect(technicalStructure?.attributes.visibility).toBe("public");
      expect(projectApproach?.attributes.visibility).toBe("public");
      if (project.attributes.id === "project-happyshopping-platform") {
        expect(technicalStructure).toMatchObject({
          text: "",
          attributes: { status: "missing" },
        });
        expect(projectApproach).toMatchObject({
          text: "",
          attributes: { status: "missing" },
        });
        return;
      }

      expect(technicalStructure?.text).not.toBe("");
      expect(technicalStructure?.attributes.status).toBe("source-reported");
      expect(projectApproach?.text).not.toBe("");
      expect(projectApproach?.attributes.status).toBe("source-reported");
    });
  });

  it("저장소 이력서의 공개 여부는 모두 public이다", () => {
    const result = readResumeModel({ source: "repository" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const values = [result.model.visibility];
    const walk = (nodes: readonly ResumeXmlNode[]) => {
      nodes.forEach((node) => {
        values.push(node.attributes.visibility ?? "");
        walk(node.children);
      });
    };
    walk(Object.values(result.model.sections).flat());

    expect(new Set(values)).toEqual(new Set(["public"]));
  });

  it("잘못된 XML은 오류 코드만 반환한다", () => {
    const result = readResumeModel({
      source: "embedded",
      xml: "<resumeAsset><profile>hidden@example.com</resumeAsset>",
    });

    expect(result).toEqual({ ok: false, code: "MALFORMED_XML" });
    expect(JSON.stringify(result)).not.toContain("hidden@example.com");
  });
});
