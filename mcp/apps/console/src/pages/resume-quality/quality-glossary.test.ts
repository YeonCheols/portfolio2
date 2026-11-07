import { describe, expect, it } from "vitest";

import {
  metricDescription,
  metricInfo,
  metricLabel,
  outcomeTerms,
} from "./quality-glossary";

// 백엔드 정책(resume-quality-policy.ts)이 정의한 지표 ID다
const policyMetricIds = [
  "required-fact-preservation",
  "required-item-coverage",
  "claim-support",
  "numeric-integrity",
  "duplicate-content",
  "text-proofreading",
  "pdf-layout",
];

describe("quality-glossary", () => {
  it("정책의 모든 지표에 한글 이름과 쉬운 설명이 있다", () => {
    for (const metricId of policyMetricIds) {
      expect(metricInfo[metricId], metricId).toBeDefined();
      expect(metricLabel(metricId)).not.toBe(metricId);
      expect(metricLabel(metricId)).toMatch(/[가-힣]/);
      expect(metricDescription(metricId)).toMatch(/[가-힣]/);
    }
  });

  it("지표 이름은 서로 겹치지 않는다", () => {
    const labels = policyMetricIds.map(metricLabel);

    expect(new Set(labels).size).toBe(labels.length);
  });

  it("모르는 지표는 ID를 그대로 이름으로 쓰고 설명은 없다", () => {
    expect(metricLabel("future-metric")).toBe("future-metric");
    expect(metricDescription("future-metric")).toBeUndefined();
  });

  it("판정 용어 설명에 통과·실패·검토 대기·측정 실패·차단·통과율이 모두 있다", () => {
    expect(outcomeTerms.map((entry) => entry.term)).toEqual([
      "통과율",
      "통과",
      "검토 대기",
      "실패",
      "측정 실패",
      "차단",
    ]);
    for (const entry of outcomeTerms)
      expect(entry.meaning.length).toBeGreaterThan(10);
  });
});
