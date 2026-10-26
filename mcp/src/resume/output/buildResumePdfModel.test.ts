import { buildResumePdfModel } from "@mcp/resume/output/createResumePdf";
import type {
  CheckedDraftClaim,
  ResumeSelectionNode,
} from "@mcp/resume/output/checkResumeDraft";

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
