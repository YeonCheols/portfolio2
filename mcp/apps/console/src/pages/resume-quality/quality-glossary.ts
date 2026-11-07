export type MetricInfo = { label: string; description: string };

// 지표 ID는 백엔드 정책(resume-quality-policy.ts)이 소유한다. 여기서는 화면에 보일 이름과 설명만 둔다
export const metricInfo: Record<string, MetricInfo> = {
  "required-fact-preservation": {
    label: "필수 사실 보존",
    description:
      "원문에 있는 핵심 사실(회사, 기간, 맡은 일 등)이 PDF에서 빠지거나 다른 내용으로 바뀌지 않았는지 봅니다.",
  },
  "required-item-coverage": {
    label: "필수 항목 채움",
    description:
      "선택한 양식이 요구하는 항목이 PDF에 빠짐없이, 빈 값이나 엉뚱한 내용 없이 들어갔는지 봅니다.",
  },
  "claim-support": {
    label: "문장 근거",
    description:
      "PDF의 각 문장이 원문에 있는 사실에 근거하는지, AI가 없는 내용을 지어내지 않았는지 봅니다.",
  },
  "numeric-integrity": {
    label: "수치 정확성",
    description:
      "PDF에 나온 숫자와 단위, 기간이 원문과 같은지, 다른 회사나 프로젝트의 숫자로 바뀌지 않았는지 봅니다.",
  },
  "duplicate-content": {
    label: "중복 내용",
    description:
      "같은 내용이 허용된 자리 밖에서 불필요하게 반복되지 않았는지 봅니다.",
  },
  "text-proofreading": {
    label: "맞춤법·표기",
    description:
      "맞춤법, 띄어쓰기, 오탈자가 없는지 사람이 읽으며 확인합니다. 자동 검사가 아니라 수동 확인입니다.",
  },
  "pdf-layout": {
    label: "PDF 레이아웃",
    description:
      "내용이 잘리거나 겹치거나 빠지지 않고, 페이지마다 읽기 좋게 배치됐는지 봅니다.",
  },
};

export const metricLabel = (metricId: string): string =>
  metricInfo[metricId]?.label ?? metricId;

export const metricDescription = (metricId: string): string | undefined =>
  metricInfo[metricId]?.description;

export const outcomeTerms: readonly { term: string; meaning: string }[] = [
  {
    term: "통과율",
    meaning:
      "통과한 검사 건수를 전체 검사 건수로 나눈 비율입니다. 검토 대기와 측정 실패는 통과로 세지 않으므로 실제보다 낮게 나올 수 있습니다.",
  },
  { term: "통과", meaning: "기준을 만족해 문제없다고 확인된 검사 건입니다." },
  {
    term: "검토 대기",
    meaning: "자동으로 판정하지 못해 사람의 확인을 기다리는 검사 건입니다.",
  },
  {
    term: "실패",
    meaning: "기준을 지키지 못한 검사 건입니다. 예: 숫자가 원문과 다릅니다.",
  },
  {
    term: "측정 실패",
    meaning:
      "필요한 자료(PDF나 원문 참조)가 없어 검사 자체를 하지 못한 건입니다.",
  },
  {
    term: "차단",
    meaning:
      "실패나 측정 실패 중 PDF 변환을 막는 건입니다. 하나라도 있으면 PDF 변환이 거절됩니다.",
  },
];
