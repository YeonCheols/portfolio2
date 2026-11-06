// 관리 화면에서 도구를 바로 시험하도록 도구마다 채워 두는 기본 입력이다. 모두 가상의 인물·회사 자료이며
// 실제 이력서 원문을 쓰지 않는다. /mcp의 tools/list 계약에는 넣지 않고 관리자 목록에만 붙인다
const sampleResumeXml = `<?xml version="1.0" encoding="utf-8"?>
<resumeAsset id="resume-sample" schemaVersion="0.2.0" xml:lang="ko-KR" status="draft" publicationStatus="internal-only" visibility="public">
  <metadata visibility="public">
    <title visibility="public">샘플 이력서 원소 데이터</title>
    <sourceDocument id="source-sample-doc" fileName="sample-resume.pdf" pageCount="3" visibility="public">
      <title visibility="public">샘플 경력기술서</title>
      <page id="source-sample-page-1" number="1" visibility="public"/>
      <page id="source-sample-page-2" number="2" visibility="public"/>
      <page id="source-sample-page-3" number="3" visibility="public"/>
    </sourceDocument>
  </metadata>
  <profile id="profile-sample" sourceRefs="source-sample-page-1" visibility="public">
    <name visibility="public">홍길동</name>
    <headline sourceRefs="source-sample-page-1" status="source-reported" visibility="public">사용자 경험과 성능을 함께 개선하는 프론트엔드 개발자입니다</headline>
    <email sourceRefs="source-sample-page-1" visibility="public">gildong@example.com</email>
    <address sourceRefs="source-sample-page-1" visibility="public">서울특별시 예시구</address>
  </profile>
  <educationHistory visibility="public">
    <education id="education-sample-univ" sourceRefs="source-sample-page-1" status="source-reported" visibility="public">
      <institution visibility="public">예시대학교</institution>
      <level visibility="public">대학(4년)</level>
      <department visibility="public">컴퓨터공학과</department>
      <period precision="month" status="source-reported" visibility="public">
        <start visibility="public">2014-03</start>
        <end visibility="public">2018-02</end>
      </period>
      <completion visibility="public">졸업</completion>
    </education>
  </educationHistory>
  <employmentHistory visibility="public">
    <employment id="employment-sample-a" sourceRefs="source-sample-page-1 source-sample-page-2" status="source-reported" visibility="public">
      <organization visibility="public">예시테크 주식회사</organization>
      <department visibility="public">웹플랫폼팀</department>
      <position visibility="public">선임 개발자</position>
      <period precision="month" status="source-reported" visibility="public">
        <start visibility="public">2021-03</start>
        <end visibility="public">2025-06</end>
      </period>
      <employmentStatus visibility="public">퇴사</employmentStatus>
    </employment>
    <employment id="employment-sample-b" sourceRefs="source-sample-page-1 source-sample-page-3" status="source-reported" visibility="public">
      <organization visibility="public">샘플소프트 주식회사</organization>
      <department visibility="public">프론트엔드개발팀</department>
      <position visibility="public">주임 개발자</position>
      <period precision="month" status="source-reported" visibility="public">
        <start visibility="public">2018-03</start>
        <end visibility="public">2021-02</end>
      </period>
      <employmentStatus visibility="public">퇴사</employmentStatus>
    </employment>
  </employmentHistory>
  <projects visibility="public">
    <project id="project-sample-dashboard" sourceRefs="source-sample-page-2" status="source-reported" employmentRef="employment-sample-a" visibility="public">
      <title visibility="public">통합 운영 대시보드 구축</title>
      <role visibility="public">프론트엔드 리드</role>
      <responsibility sourceRefs="source-sample-page-2" visibility="public">화면 구조 설계와 공통 컴포넌트 개발을 맡아 기획자 및 디자이너와 협업했습니다</responsibility>
      <summary visibility="public">여러 운영 도구를 하나의 대시보드로 통합하고 상태 관리를 단순화했습니다</summary>
    </project>
    <project id="project-sample-design-system" sourceRefs="source-sample-page-2" status="source-reported" employmentRef="employment-sample-a" visibility="public">
      <title visibility="public">디자인 시스템 도입</title>
      <role visibility="public">컴포넌트 개발</role>
      <responsibility sourceRefs="source-sample-page-2" visibility="public">공통 컴포넌트 라이브러리를 설계하고 서비스별 적용을 지원했습니다</responsibility>
      <summary visibility="public">재사용 가능한 컴포넌트를 정리해 화면 개발 속도를 높였습니다</summary>
    </project>
    <project id="project-sample-shop" sourceRefs="source-sample-page-3" status="source-reported" employmentRef="employment-sample-b" visibility="public">
      <title visibility="public">쇼핑몰 반응형 웹 개편</title>
      <role visibility="public">프론트엔드 개발</role>
      <responsibility sourceRefs="source-sample-page-3" visibility="public">상품 목록과 결제 화면을 반응형으로 개편하고 접근성을 개선했습니다</responsibility>
      <summary visibility="public">모바일 화면 이탈을 줄이기 위해 결제 흐름을 단순화했습니다</summary>
    </project>
  </projects>
</resumeAsset>`;

const selection = {
  elementIds: [
    "profile-sample",
    "education-sample-univ",
    "employment-sample-a",
    "employment-sample-b",
    "project-sample-dashboard",
    "project-sample-design-system",
    "project-sample-shop",
  ],
  sectionOrder: [
    "profile",
    "educationHistory",
    "employmentHistory",
    "projects",
  ],
};

// 초안 검증 도구용 고정 주장이다. 인용은 샘플 XML 원문에서 그대로 가져왔다
const claims = [
  {
    text: "사용자 경험과 성능을 함께 개선하는 프론트엔드 개발자입니다.",
    sourceIds: ["profile-sample"],
    evidence: [
      {
        sourceId: "profile-sample",
        quote: "사용자 경험과 성능을 함께 개선하는 프론트엔드 개발자입니다",
      },
    ],
  },
  {
    text: "예시테크 주식회사 웹플랫폼팀에서 선임 개발자로 일했습니다.",
    sourceIds: ["employment-sample-a"],
    evidence: [
      { sourceId: "employment-sample-a", quote: "예시테크 주식회사" },
      { sourceId: "employment-sample-a", quote: "선임 개발자" },
    ],
  },
  {
    text: "여러 운영 도구를 하나의 대시보드로 통합했습니다.",
    sourceIds: ["project-sample-dashboard"],
    evidence: [
      {
        sourceId: "project-sample-dashboard",
        quote: "여러 운영 도구를 하나의 대시보드로 통합",
      },
    ],
  },
];

const source = { source: "embedded", xml: sampleResumeXml };
const template = { ...source, ...selection, template: "기본형" };

const qualitySampleXml = `<?xml version="1.0" encoding="utf-8"?>
<resumeAsset id="resume-quality-sample" schemaVersion="0.2.0" xml:lang="ko-KR" status="draft" publicationStatus="internal-only" visibility="public">
  <metadata><sourceDocument id="quality-source-sample" visibility="private-source" /></metadata>
  <profile id="quality-profile-sample" sourceRefs="quality-source-sample" visibility="public">
    <name visibility="public">홍길동</name>
    <headline visibility="public">원문 근거를 보존하는 프론트엔드 개발자입니다</headline>
  </profile>
  <educationHistory visibility="public">
    <education id="quality-education-sample" visibility="public">
      <institution visibility="public">예시대학교</institution>
    </education>
  </educationHistory>
  <projects visibility="public">
    <project id="quality-project-sample" visibility="public">
      <title visibility="public">품질 기준 샘플 프로젝트</title>
      <role visibility="public">대시보드 개발</role>
      <summary visibility="public">운영 상태를 한눈에 확인할 수 있는 대시보드를 구성했습니다</summary>
    </project>
    <project id="quality-project-secondary-sample" visibility="public">
      <title visibility="public">품질 지표 조회 화면 구성</title>
      <role visibility="public">화면 개발</role>
    </project>
  </projects>
</resumeAsset>`;

const qualityTemplate = {
  source: "embedded",
  xml: qualitySampleXml,
  elementIds: [
    "quality-profile-sample",
    "quality-education-sample",
    "quality-project-sample",
    "quality-project-secondary-sample",
  ],
  sectionOrder: selection.sectionOrder,
  template: "기본형",
  // 원문 요약을 그대로 인용해 PDF 입력을 만들되, 실제 문장의 품질 검토는 그대로 측정한다
  claims: [
    {
      text: "운영 상태를 한눈에 확인할 수 있는 대시보드를 구성했습니다",
      sourceIds: ["quality-project-sample"],
      formItem: "summary",
      evidence: [
        {
          sourceId: "quality-project-sample",
          quote: "운영 상태를 한눈에 확인할 수 있는 대시보드를 구성했습니다",
        },
      ],
    },
  ],
};

export const resumeToolSamples: Record<string, Record<string, unknown>> = {
  validate_resume_xml: source,
  list_resume_elements: source,
  preview_resume: { ...source, ...selection },
  read_resume_selection: template,
  check_resume_draft: { ...template, claims },
  // 품질 측정용 기준선은 원문 fallback만 사용하며 PDF 시각 검토 게이트는 그대로 적용한다
  generate_resume: qualityTemplate,
  render_resume_template: template,
  render_resume_form: template,
  convert_resume_to_pdf: {
    generationId: "generate_resume 응답의 generationId를 붙여 넣으세요",
  },
};
