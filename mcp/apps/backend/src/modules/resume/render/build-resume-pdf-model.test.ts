import type {
  CheckedDraftClaim,
  ResumeSelectionNode,
} from "@mcp/modules/resume/validation/check-resume-draft";
import { buildResumePdfModel } from "@mcp/modules/resume/render/create-resume-pdf";

const node = (
  section: string,
  name: string,
  text = "",
  children: ResumeSelectionNode[] = [],
  options: {
    id?: string;
    employmentRef?: string;
    projectRef?: string;
    workItemRef?: string;
    visibility?: string;
  } = {},
): ResumeSelectionNode => ({
  ...(options.projectRef ? { projectRef: options.projectRef } : {}),
  ...(options.workItemRef ? { workItemRef: options.workItemRef } : {}),
  ...(options.id ? { id: options.id } : {}),
  ...(options.employmentRef ? { employmentRef: options.employmentRef } : {}),
  section,
  name,
  text,
  sourceRefs: [],
  visibility: options.visibility ?? "public",
  children,
});

describe("buildResumePdfModel", () => {
  it("구조화 출력에 없는 프로젝트 URL의 재작성 문장은 누락시키지 않는다", () => {
    const project = node(
      "projects",
      "project",
      "",
      [
        node("projects", "title", "검색"),
        node("projects", "link", "https://example.com"),
      ],
      { id: "project" },
    );
    const model = buildResumePdfModel({
      resume: "",
      selection: [project],
      claims: [
        {
          text: "사이트: https://example.com",
          sourceIds: ["project"],
          sources: [project],
          formItem: "link",
          evidence: [{ sourceId: "project", quote: "https://example.com" }],
        },
      ],
    });
    expect(model.unassignedProjects[0]?.narratives).toEqual([
      "사이트: https://example.com",
    ]);
  });
  it("부분 인용으로는 전체 설명을 대체하지 않고 같은 내용을 덧붙이지 않는다", () => {
    const project = node(
      "projects",
      "project",
      "",
      [
        node("projects", "title", "검색"),
        node("projects", "technicalStructure", "계층 분리와 캐시 동기화"),
      ],
      { id: "project" },
    );
    const model = buildResumePdfModel({
      resume: "",
      selection: [project],
      claims: [
        {
          text: "계층을 분리했습니다",
          sourceIds: ["project"],
          sources: [project],
          formItem: "technicalStructure",
          evidence: [{ sourceId: "project", quote: "계층 분리" }],
        },
      ],
    });
    expect(model.unassignedProjects[0]?.details).toEqual([
      { label: "기술적 구조", value: "계층 분리와 캐시 동기화" },
    ]);
    expect(model.unassignedProjects[0]?.narratives).toEqual([]);
  });
  it("활동 설명은 한 번만 재작성하고 학력과 포트폴리오의 구조화 정보를 문장으로 반복하지 않는다", () => {
    const activity = node(
      "activities",
      "activity",
      "",
      [
        node("activities", "organization", "연구 모임"),
        node("activities", "text", "코드 리뷰 진행"),
      ],
      { id: "activity" },
    );
    const education = node(
      "educationHistory",
      "education",
      "",
      [
        node("educationHistory", "institution", "예시대학"),
        node("educationHistory", "completion", "졸업"),
      ],
      { id: "education" },
    );
    const portfolio = node(
      "portfolioReferences",
      "portfolioReference",
      "",
      [node("portfolioReferences", "value", "https://example.com")],
      { id: "portfolio" },
    );
    const model = buildResumePdfModel({
      resume: "",
      selection: [activity, education, portfolio],
      claims: [
        {
          text: "코드 리뷰를 진행했습니다",
          sourceIds: ["activity"],
          sources: [activity],
          formItem: "text",
          evidence: [{ sourceId: "activity", quote: "코드 리뷰 진행" }],
        },
        {
          text: "예시대학을 졸업했습니다",
          sourceIds: ["education"],
          sources: [education],
          evidence: [{ sourceId: "education", quote: "예시대학\n졸업" }],
        },
        {
          text: "포트폴리오: https://example.com",
          sourceIds: ["portfolio"],
          sources: [portfolio],
          evidence: [{ sourceId: "portfolio", quote: "https://example.com" }],
        },
      ],
    });
    expect(model.activities[0]?.narratives).toEqual([
      "코드 리뷰를 진행했습니다",
    ]);
    expect(model.education[0]?.details).toEqual([
      { label: "졸업 구분", value: "졸업" },
    ]);
    expect(model.education[0]?.narratives).toEqual([]);
    expect(model.portfolio[0]?.title).toBe("https://example.com");
    expect(model.portfolio[0]?.narratives).toEqual([]);
  });
  it("프로젝트 기술 구조 재작성은 해당 항목만 대체하고 역할을 보존한다", () => {
    const project = node(
      "projects",
      "project",
      "",
      [
        node("projects", "title", "검색"),
        node("projects", "role", "프론트엔드 개발"),
        node("projects", "technicalStructure", "기능별 계층 분리"),
      ],
      { id: "project" },
    );
    const model = buildResumePdfModel({
      resume: "",
      selection: [project],
      claims: [
        {
          text: "기능별로 계층을 분리했습니다",
          sourceIds: ["project"],
          sources: [project],
          formItem: "technicalStructure",
          evidence: [{ sourceId: "project", quote: "기능별 계층 분리" }],
        },
      ],
    });
    expect(model.unassignedProjects[0]?.details).toEqual([
      { label: "역할", value: "프론트엔드 개발" },
      { label: "기술적 구조", value: "기능별로 계층을 분리했습니다" },
    ]);
    expect(model.unassignedProjects[0]?.narratives).toEqual([]);
  });
  it("업무 전체 원문을 인용한 재작성은 원문을 대체하고 미대응 설명은 보존한다", () => {
    const work = node(
      "workItems",
      "workItem",
      "",
      [
        node("workItems", "title", "검색 개선"),
        node("workItems", "text", "검색과 필터 구현"),
        node("workItems", "text", "키보드 접근성 개선"),
      ],
      { id: "work", projectRef: "project" },
    );
    const model = buildResumePdfModel({
      resume: "",
      selection: [
        node("projects", "project", "", [node("projects", "title", "검색")], {
          id: "project",
        }),
        work,
      ],
      claims: [
        {
          text: "검색과 필터를 구현했습니다",
          sourceIds: ["work"],
          sources: [work],
          formItem: "text",
          evidence: [{ sourceId: "work", quote: "검색과 필터 구현" }],
        },
      ],
    });
    const item = model.unassignedProjects[0]?.workItems[0];
    expect(item?.descriptions).toEqual([
      "검색과 필터를 구현했습니다",
      "키보드 접근성 개선",
    ]);
    expect(item?.narratives).toEqual([]);
  });
  it("선택 원문을 프로필·기술·회사별 프로젝트·병역의 구조화 데이터로 만든다", () => {
    const model = buildResumePdfModel({
      resume: "프로필\n테스트 개발자",
      claims: [],
      selection: [
        node("profile", "profile", "", [
          node("profile", "name", "테스트 개발자"),
          node("profile", "headline", "재사용 가능한 UI를 만듭니다"),
          node("profile", "phone", "010-0000-0000"),
          node("profile", "careerSummary", "", [
            node("profile", "reportedText", "총 6년 4개월"),
          ]),
        ]),
        node("educationHistory", "education", "", [
          node("educationHistory", "institution", "예시대학교"),
          node("educationHistory", "completion", "졸업"),
        ]),
        node(
          "employmentHistory",
          "employment",
          "",
          [
            node("employmentHistory", "organization", "예시 회사"),
            node("employmentHistory", "position", "프론트엔드 개발자"),
            node(
              "employmentHistory",
              "summary",
              "서비스 운영과 기능 개발을 담당했습니다",
            ),
          ],
          { id: "employment-example" },
        ),
        node(
          "projects",
          "project",
          "",
          [
            node("projects", "title", "지원자 관리 프로젝트"),
            node("projects", "technicalStructure", "FSD 기반 구조"),
            node("projects", "projectApproach", "요구사항부터 배포까지 담당"),
          ],
          { id: "project-example", employmentRef: "employment-example" },
        ),
        node(
          "workItems",
          "workItem",
          "",
          [
            node("workItems", "title", "지원자 목록 화면 개선"),
            node("workItems", "text", "검색과 필터를 구현했습니다"),
            node("workItems", "text", "상태 동기화를 정리했습니다"),
          ],
          { id: "work-item-example", projectRef: "project-example" },
        ),
        node(
          "outcomes",
          "outcome",
          "",
          [node("outcomes", "text", "탐색 시간을 줄였습니다")],
          { id: "outcome-example", workItemRef: "work-item-example" },
        ),
        node(
          "technologies",
          "technology",
          "",
          [node("technologies", "name", "React")],
          { id: "technology-react" },
        ),
        node(
          "activities",
          "activity",
          "",
          [
            node("activities", "organization", "편의점"),
            node("activities", "period", "", [
              node("activities", "start", "2016-04"),
              node("activities", "end", "2017-06"),
            ]),
            node("activities", "text", "고객 응대와 매장 운영을 담당했습니다"),
          ],
          { id: "activity-example" },
        ),
        node(
          "trainingHistory",
          "training",
          "",
          [
            node("trainingHistory", "title", "정보보안 과정"),
            node("trainingHistory", "topics", "", [
              node("trainingHistory", "topic", "웹 보안 기초"),
            ]),
          ],
          { id: "training-example" },
        ),
        node(
          "employmentEligibility",
          "employmentEligibility",
          "",
          [
            node("employmentEligibility", "militaryService", "해당 없음"),
            node("employmentEligibility", "veteran", "미지정"),
          ],
          { id: "employment-eligibility" },
        ),
      ],
    });

    expect(model.profile).toMatchObject({
      name: "테스트 개발자",
      headline: "재사용 가능한 UI를 만듭니다",
    });
    expect(model.profile.details).toContainEqual({
      label: "휴대폰",
      value: "010-0000-0000",
    });
    expect(model.summaryCards).toContainEqual(
      expect.objectContaining({ label: "경력", detail: "총 6년 4개월" }),
    );
    expect(model.technologies).toContain("React");
    expect(model.employment[0]).toMatchObject({
      organization: "예시 회사",
      projects: [
        expect.objectContaining({
          title: "지원자 관리 프로젝트",
          details: expect.arrayContaining([
            { label: "기술적 구조", value: "FSD 기반 구조" },
            {
              label: "프로젝트 진행 방식",
              value: "요구사항부터 배포까지 담당",
            },
          ]),
        }),
      ],
    });
    expect(
      Reflect.get(model.employment[0]?.projects[0] ?? {}, "workItems"),
    ).toEqual([
      expect.objectContaining({
        title: "지원자 목록 화면 개선",
        descriptions: [
          "검색과 필터를 구현했습니다",
          "상태 동기화를 정리했습니다",
        ],
        outcomes: ["탐색 시간을 줄였습니다"],
      }),
    ]);
    expect(model.militaryService).toBe("해당 없음");
    expect(model.employment[0]?.details).toContainEqual({
      label: "주요 업무",
      value: "서비스 운영과 기능 개발을 담당했습니다",
    });
    expect(model.activities[0]?.narratives).toContain(
      "고객 응대와 매장 운영을 담당했습니다",
    );
    expect(model.training[0]?.details).toContainEqual({
      label: "교육 내용",
      value: "웹 보안 기초",
    });
    expect(model.preferences).toEqual([]);
  });

  it("비공개이거나 공개 여부가 없는 프로젝트 원문과 claim을 PDF 모델에서 제외한다", () => {
    const privateField = node(
      "projects",
      "technicalStructure",
      "비공개 구조 설명",
      [],
      { id: "private-technical-structure", visibility: "private" },
    );
    const unknownField = node(
      "projects",
      "projectApproach",
      "확인되지 않은 진행 방식",
      [],
      { id: "unknown-project-approach", visibility: "" },
    );
    const project = node(
      "projects",
      "project",
      "",
      [node("projects", "title", "예시 프로젝트"), privateField, unknownField],
      { id: "project-private-fields" },
    );
    const claims: CheckedDraftClaim[] = [
      {
        text: "비공개 claim 문장",
        sourceIds: ["private-technical-structure"],
        sources: [privateField],
      },
      {
        text: "미확인 claim 문장",
        sourceIds: ["unknown-project-approach"],
        sources: [unknownField],
      },
    ];
    const model = buildResumePdfModel({
      resume: "원문 이력서",
      claims,
      selection: [project],
    });

    expect(model.unassignedProjects[0]?.details).toEqual([]);
    expect(model.unassignedProjects[0]?.narratives).toEqual([]);
  });
});
