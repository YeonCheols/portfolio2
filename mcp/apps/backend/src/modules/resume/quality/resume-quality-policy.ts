import type { EvaluationDecision } from "@mcp/modules/quality-evaluation/evaluation-contract";

export type ResumeQualityMetricDefinition = {
  metricId: string;
  ruleId: string;
  stage: string;
  populationMode: "fixed" | "output_derived";
  unit: string;
  automatedCoverage: "deterministic" | "mixed" | "manual";
  population: string;
  notApplicableWhen: string;
  passWhen: string;
  failWhen: string;
  needsReviewWhen: string;
  measurementFailedWhen: string;
  blockingDecisions: readonly EvaluationDecision[];
};

export const resumeQualityPolicy = {
  domain: "resume",
  contractVersion: "1",
  caseSetVersion: "resume-quality-population-v1",
  policyVersion: "resume-quality-policy-v2",
  metrics: [
    {
      metricId: "required-fact-preservation",
      ruleId: "source-fact-preserved",
      stage: "pdf",
      populationMode: "fixed",
      unit: "source_fact",
      automatedCoverage: "mixed",
      population:
        "생성 전에 선택된 공개 원문에서 양식 계약이 필수로 보존하도록 지정한 사실이며, 원소 ID·필드 경로·반복 위치·소유 관계로 식별합니다.",
      notApplicableWhen:
        "양식 계약이 해당 사실을 출력 대상으로 요구하지 않는다고 생성 전에 판정한 경우만 해당합니다.",
      passWhen:
        "최종 PDF 출력 모델에서 원문 값과 회사·프로젝트·업무 귀속이 확인되고, 의미 보존이 필요한 경우 수동 확인을 통과합니다.",
      failWhen:
        "필수 사실이 최종 출력에서 누락되거나 값·기간 역할·소유 관계가 변경되거나 다른 항목에 귀속됩니다.",
      needsReviewWhen:
        "원문과 재작성 출력의 의미 동등성을 결정할 수 없어 사람이 대조해야 합니다.",
      measurementFailedWhen:
        "원문 또는 최종 출력 참조가 없어 해당 사실을 평가할 수 없습니다.",
      blockingDecisions: ["fail", "measurement_failed"],
    },
    {
      metricId: "required-item-coverage",
      ruleId: "required-output-item",
      stage: "pdf",
      populationMode: "fixed",
      unit: "required_item",
      automatedCoverage: "mixed",
      population:
        "선택한 양식에서 적용 가능한 필수 출력 항목이며, 적용 여부와 목록은 생성 전에 고정합니다.",
      notApplicableWhen:
        "선택한 양식 계약상 해당 항목이 적용되지 않는다고 생성 전에 판정한 경우만 해당합니다.",
      passWhen:
        "최종 출력 모델에 해당 항목의 비어 있지 않고 관련성 있는 내용이 있습니다.",
      failWhen:
        "필수 항목이 없거나 빈 값·자리표시자·무관한 내용으로 채워져 있습니다.",
      needsReviewWhen:
        "출력 내용이 항목을 실질적으로 충족하는지 자동 판정할 수 없습니다.",
      measurementFailedWhen:
        "선택 양식이나 최종 출력 모델을 읽을 수 없어 항목을 평가할 수 없습니다.",
      blockingDecisions: ["fail", "measurement_failed"],
    },
    {
      metricId: "claim-support",
      ruleId: "claim-evidence",
      stage: "pdf",
      populationMode: "output_derived",
      unit: "output_claim",
      automatedCoverage: "mixed",
      population:
        "AI claim과 원문 fallback을 모두 포함한 최종 PDF의 사실 주장 각각을 출력에서 추출합니다.",
      notApplicableWhen:
        "최종 출력 조각이 사실 주장이 아닌 제목·구분선 등으로 판정된 경우에만 해당합니다.",
      passWhen:
        "주장이 공개 원문 사실에 연결되고, 인용·수치·귀속에 충돌이 없으며 필요한 의미 확인을 통과합니다.",
      failWhen:
        "근거 없는 사실, 원문과 충돌하는 주장, 비공개 사실 노출이 확인됩니다.",
      needsReviewWhen:
        "인용 일치는 확인됐지만 문장 의미가 원문 사실을 벗어나는지 자동 판정할 수 없습니다.",
      measurementFailedWhen:
        "출력 주장의 원문 또는 출력 참조가 없어 근거를 평가할 수 없습니다.",
      blockingDecisions: ["fail", "measurement_failed"],
    },
    {
      metricId: "numeric-integrity",
      ruleId: "numeric-value-unit",
      stage: "pdf",
      populationMode: "output_derived",
      unit: "numeric_assertion",
      automatedCoverage: "mixed",
      population:
        "최종 PDF에 표시된 수치 주장 각각이며, 숫자·단위·기간 역할·회사 또는 프로젝트 귀속을 함께 평가합니다.",
      notApplicableWhen:
        "최종 출력에 수치 주장이 없는 경우 지표 전체의 분모를 0으로 둡니다.",
      passWhen:
        "정규화가 허용된 표기 차이 외에 원문 값·확인된 단위·귀속 관계가 모두 일치합니다.",
      failWhen:
        "수치가 바뀌거나 단위가 없거나 틀리거나 기간 역할 또는 소유 관계가 달라집니다.",
      needsReviewWhen:
        "원문 단위나 숫자 표기의 의미를 기계적으로 확정할 수 없습니다.",
      measurementFailedWhen:
        "수치 출력 또는 원문 수치를 추적할 수 없어 대조가 불가능합니다.",
      blockingDecisions: ["fail", "measurement_failed"],
    },
    {
      metricId: "duplicate-content",
      ruleId: "duplicate-output-block",
      stage: "pdf",
      populationMode: "output_derived",
      unit: "output_block",
      automatedCoverage: "mixed",
      population:
        "최종 PDF의 내용 블록 각각이며, 허용된 요약·상세 반복 위치는 이력서 정책에 명시합니다.",
      notApplicableWhen:
        "내용이 없는 구조 장식 블록으로 판정된 경우에만 해당합니다.",
      passWhen:
        "허용된 반복 위치를 제외하고 같은 사실을 불필요하게 다시 출력하지 않습니다.",
      failWhen:
        "정규화 후 동일한 사실 문장이 허용되지 않은 블록에서 반복됩니다.",
      needsReviewWhen:
        "요약과 상세의 반복이 정당한 강조인지 의미 중복인지 판단할 수 없습니다.",
      measurementFailedWhen:
        "출력 블록을 분리하거나 해당 블록의 사실 출처를 추적할 수 없습니다.",
      blockingDecisions: ["fail", "measurement_failed"],
    },
    {
      metricId: "text-proofreading",
      ruleId: "proofread-visible-text",
      stage: "pdf",
      populationMode: "output_derived",
      unit: "visible_text_block",
      automatedCoverage: "manual",
      population:
        "최종 PDF에서 사용자가 읽는 본문 텍스트 블록 각각을 평가합니다.",
      notApplicableWhen:
        "텍스트가 아닌 장식 요소이거나 읽을 내용이 없는 블록에만 해당합니다.",
      passWhen: "확인 가능한 맞춤법·띄어쓰기·오탈자가 없습니다.",
      failWhen: "사람이 확인한 맞춤법·띄어쓰기·오탈자가 남아 있습니다.",
      needsReviewWhen:
        "회사명·고유명사·기술 용어의 표기가 원문과 맞는지 확인이 필요합니다.",
      measurementFailedWhen:
        "페이지 텍스트를 추출하거나 시각적으로 확인할 수 없습니다.",
      blockingDecisions: ["fail", "measurement_failed"],
    },
    {
      metricId: "pdf-layout",
      ruleId: "pdf-page-layout",
      stage: "pdf",
      populationMode: "output_derived",
      unit: "page_layout_check",
      automatedCoverage: "mixed",
      population:
        "실제 PDF의 각 페이지와 사전에 고정한 잘림·겹침·누락·계속 머리말 검사 조합을 평가합니다.",
      notApplicableWhen:
        "해당 페이지에 적용할 특정 레이아웃 검사가 없다고 검사 목록에서 미리 정한 경우에만 해당합니다.",
      passWhen:
        "모든 필수 출력 블록이 읽을 수 있게 배치되고 잘림·겹침·잘못된 계속 머리말이 없습니다.",
      failWhen:
        "내용이 잘리거나 겹치거나 누락되거나 내용 없는 계속 머리말이 표시됩니다.",
      needsReviewWhen:
        "렌더링 페이지의 시각적 판정이 아직 완료되지 않았습니다.",
      measurementFailedWhen:
        "PDF가 없거나 페이지를 렌더링할 수 없어 배치를 평가할 수 없습니다.",
      blockingDecisions: ["fail", "measurement_failed"],
    },
  ],
} as const satisfies {
  domain: "resume";
  contractVersion: string;
  caseSetVersion: string;
  policyVersion: string;
  metrics: readonly ResumeQualityMetricDefinition[];
};
