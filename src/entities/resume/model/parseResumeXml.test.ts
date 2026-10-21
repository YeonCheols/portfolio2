import { parseResumeXml } from "./parseResumeXml";

const validResumeXml = `<?xml version="1.0" encoding="UTF-8"?>
<resumeAsset id="resume-test" schemaVersion="0.2.0" xml:lang="ko-KR" status="draft" publicationStatus="internal-only" visibility="private" xmlns:xml="http://www.w3.org/XML/1998/namespace">
  <metadata><sourceDocument id="source-page-1" visibility="private-source" /></metadata>
  <profile id="profile-test" sourceRefs="source-page-1" visibility="private">
    <name visibility="public">테스트 사용자</name>
    <email visibility="private">test@example.com</email>
  </profile>
  <employmentHistory>
    <employment id="employment-test" sourceRefs="source-page-1" visibility="private">
      <period precision="month" status="source-reported"><start>2020-01</start><end>2022-12</end></period>
    </employment>
  </employmentHistory>
</resumeAsset>`;

describe("parseResumeXml", () => {
  it("XML 원소와 출처·공개 상태·날짜 정밀도를 공통 모델에 보존한다", () => {
    const resume = parseResumeXml(validResumeXml);

    expect(resume.id).toBe("resume-test");
    expect(resume.schemaVersion).toBe("0.2.0");
    expect(resume.language).toBe("ko-KR");
    expect(resume.sections.profile[0].children[0].text).toBe("테스트 사용자");
    expect(resume.sections.profile[0].children[1].attributes.visibility).toBe(
      "private",
    );
    expect(
      resume.sections.employmentHistory[0].children[0].children[0].attributes
        .precision,
    ).toBe("month");
    expect(resume.sections.profile[0].references.sourceRefs).toEqual([
      "source-page-1",
    ]);
  });

  it("문법이 잘못된 XML을 입력 위치와 개인정보 없이 거부한다", () => {
    expect(() =>
      parseResumeXml("<resumeAsset><profile></resumeAsset>"),
    ).toThrow(expect.objectContaining({ code: "MALFORMED_XML" }));
  });

  it("지원하지 않는 계약 버전을 거부한다", () => {
    expect(() =>
      parseResumeXml(
        validResumeXml.replace(
          'schemaVersion="0.2.0"',
          'schemaVersion="9.0.0"',
        ),
      ),
    ).toThrow(expect.objectContaining({ code: "UNSUPPORTED_VERSION" }));
  });

  it("DTD 선언이 포함된 XML을 거부한다", () => {
    const xmlWithDoctype = validResumeXml.replace(
      "<resumeAsset",
      '<!DOCTYPE resumeAsset [<!ENTITY injected "blocked">]><resumeAsset',
    );

    expect(() => parseResumeXml(xmlWithDoctype)).toThrow(
      expect.objectContaining({ code: "DOCTYPE_NOT_ALLOWED" }),
    );
  });

  it("참조 대상이 없는 XML 원소를 거부한다", () => {
    const xmlWithMissingReference = validResumeXml.replace(
      'sourceRefs="source-page-1" visibility="private"',
      'sourceRefs="source-missing" visibility="private"',
    );

    expect(() => parseResumeXml(xmlWithMissingReference)).toThrow(
      expect.objectContaining({ code: "UNRESOLVED_REFERENCE" }),
    );
  });

  it("중복 원소 ID를 거부한다", () => {
    const xmlWithDuplicateId = validResumeXml.replace(
      'id="source-page-1" visibility="private-source"',
      'id="profile-test" visibility="private-source"',
    );

    expect(() => parseResumeXml(xmlWithDuplicateId)).toThrow(
      expect.objectContaining({ code: "DUPLICATE_ID" }),
    );
  });

  it("정밀도와 일치하지 않는 날짜를 거부한다", () => {
    const xmlWithInvalidMonth = validResumeXml.replace("2020-01", "2020-13");

    expect(() => parseResumeXml(xmlWithInvalidMonth)).toThrow(
      expect.objectContaining({ code: "INVALID_DATE" }),
    );
  });

  it("기간의 날짜가 미상일 때 정밀도 없는 빈 시작·종료 값을 보존한다", () => {
    const partialPeriodXml = validResumeXml
      .replace(
        'precision="month" status="source-reported"',
        'status="partially-known"',
      )
      .replace("2020-01", "")
      .replace("2022-12", "");

    expect(() => parseResumeXml(partialPeriodXml)).not.toThrow();
  });

  it("기간이 아닌 정밀도 지정 날짜도 형식이 잘못되면 거부한다", () => {
    const xmlWithInvalidBirthYear = validResumeXml.replace(
      "</profile>",
      '<birthYear precision="year">19X6</birthYear></profile>',
    );

    expect(() => parseResumeXml(xmlWithInvalidBirthYear)).toThrow(
      expect.objectContaining({ code: "INVALID_DATE" }),
    );
  });

  it("계약의 단일 프로필 섹션이 중복되면 거부한다", () => {
    const xmlWithDuplicateProfile = validResumeXml.replace(
      "</resumeAsset>",
      '<profile id="profile-test-2" sourceRefs="source-page-1" /></resumeAsset>',
    );

    expect(() => parseResumeXml(xmlWithDuplicateProfile)).toThrow(
      expect.objectContaining({ code: "DUPLICATE_SECTION" }),
    );
  });

  it("혼합 콘텐츠 원소의 텍스트와 자식 순서를 보존한다", () => {
    const mixedContentXml = validResumeXml.replace(
      '<name visibility="public">테스트 사용자</name>',
      '<name visibility="public">앞<emphasis>중간</emphasis>뒤</name>',
    );
    const name =
      parseResumeXml(mixedContentXml).sections.profile[0].children[0];

    expect(
      name.content.map((item) => (typeof item === "string" ? item : item.name)),
    ).toEqual(["앞", "emphasis", "뒤"]);
  });

  it("ID 속성이 비어 있는 원소를 거부한다", () => {
    const xmlWithEmptyId = validResumeXml.replace(
      'id="source-page-1"',
      'id=""',
    );

    expect(() => parseResumeXml(xmlWithEmptyId)).toThrow(
      expect.objectContaining({ code: "MISSING_REQUIRED_FIELD" }),
    );
  });
});
