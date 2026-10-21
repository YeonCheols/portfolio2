import fs from "fs";
import path from "path";

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

  it("잘못된 XML은 오류 코드만 반환한다", () => {
    const result = readResumeModel({
      source: "embedded",
      xml: "<resumeAsset><profile>hidden@example.com</resumeAsset>",
    });

    expect(result).toEqual({ ok: false, code: "MALFORMED_XML" });
    expect(JSON.stringify(result)).not.toContain("hidden@example.com");
  });
});
