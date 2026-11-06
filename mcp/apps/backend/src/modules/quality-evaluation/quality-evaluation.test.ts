import {
  aggregateMetricCases,
  compareMetricEvaluations,
} from "@mcp/modules/quality-evaluation/evaluation-calculations";

describe("aggregateMetricCases", () => {
  it("미확인 케이스를 분모에 포함하고 해당 없음은 제외한다", () => {
    const result = aggregateMetricCases(
      {
        schemaVersion: 1,
        evaluationId: "evaluation-1",
        evaluatedAt: "2026-11-06T00:00:00.000Z",
        domain: "resume",
        contractVersion: "1",
        caseSetVersion: "facts-v1",
        policyVersion: "resume-v1",
        inputRef: "snapshot-1",
        outputRef: "output-1",
        cases: [
          {
            metricId: "fact-preservation",
            ruleId: "fact-rule",
            stage: "generation",
            caseId: "fact-1",
            unit: "fact",
            decision: "pass",
            blocking: false,
            evidence: [],
          },
          {
            metricId: "fact-preservation",
            ruleId: "fact-rule",
            stage: "generation",
            caseId: "fact-2",
            unit: "fact",
            decision: "fail",
            blocking: true,
            evidence: [],
          },
          {
            metricId: "fact-preservation",
            ruleId: "fact-rule",
            stage: "generation",
            caseId: "fact-3",
            unit: "fact",
            decision: "needs_review",
            blocking: false,
            evidence: [],
          },
          {
            metricId: "fact-preservation",
            ruleId: "fact-rule",
            stage: "generation",
            caseId: "fact-4",
            unit: "fact",
            decision: "measurement_failed",
            blocking: false,
            evidence: [],
          },
          {
            metricId: "fact-preservation",
            ruleId: "fact-rule",
            stage: "generation",
            caseId: "fact-5",
            unit: "fact",
            decision: "not_applicable",
            blocking: false,
            evidence: [],
          },
        ],
      },
      {
        metricId: "fact-preservation",
        stage: "generation",
        populationMode: "fixed",
        unit: "fact",
      },
    );

    expect(result).toMatchObject({
      passedCases: 1,
      failedCases: 1,
      needsReviewCases: 1,
      measurementFailedCases: 1,
      unknownCases: 2,
      notApplicableCases: 1,
      numerator: 1,
      denominator: 4,
      lowerBound: 0.25,
      upperBound: 0.75,
      completionRate: 0.5,
      confirmedRate: null,
      blockingCases: 1,
    });
  });

  it("같은 지표 안에서 caseId가 중복되면 거부한다", () => {
    const run = {
      schemaVersion: 1 as const,
      evaluationId: "evaluation-2",
      evaluatedAt: "2026-11-06T00:00:00.000Z",
      domain: "resume",
      contractVersion: "1",
      caseSetVersion: "facts-v1",
      policyVersion: "resume-v1",
      inputRef: "snapshot-1",
      outputRef: "output-1",
      cases: [
        {
          metricId: "fact-preservation",
          ruleId: "fact-rule",
          stage: "generation",
          caseId: "fact-1",
          unit: "fact",
          decision: "pass" as const,
          blocking: false,
          evidence: [],
        },
        {
          metricId: "fact-preservation",
          ruleId: "fact-rule",
          stage: "generation",
          caseId: "fact-1",
          unit: "fact",
          decision: "pass" as const,
          blocking: false,
          evidence: [],
        },
      ],
    };

    expect(() =>
      aggregateMetricCases(run, {
        metricId: "fact-preservation",
        stage: "generation",
        populationMode: "fixed",
        unit: "fact",
      }),
    ).toThrow("DUPLICATE_EVALUATION_CASE");
  });

  it("caseId가 비어 있으면 거부한다", () => {
    const run = {
      schemaVersion: 1 as const,
      evaluationId: "evaluation-3",
      evaluatedAt: "2026-11-06T00:00:00.000Z",
      domain: "resume",
      contractVersion: "1",
      caseSetVersion: "facts-v1",
      policyVersion: "resume-v1",
      inputRef: "snapshot-1",
      outputRef: "output-1",
      cases: [
        {
          metricId: "fact-preservation",
          ruleId: "fact-rule",
          stage: "generation",
          caseId: "  ",
          unit: "fact",
          decision: "pass" as const,
          blocking: false,
          evidence: [],
        },
      ],
    };

    expect(() =>
      aggregateMetricCases(run, {
        metricId: "fact-preservation",
        stage: "generation",
        populationMode: "fixed",
        unit: "fact",
      }),
    ).toThrow("INVALID_EVALUATION_CASE_ID");
  });

  it("적용 가능한 케이스가 없으면 비율을 만들지 않는다", () => {
    const result = aggregateMetricCases(
      {
        schemaVersion: 1,
        evaluationId: "evaluation-empty",
        evaluatedAt: "2026-11-06T00:00:00.000Z",
        domain: "portfolio",
        contractVersion: "1",
        caseSetVersion: "project-facts-v1",
        policyVersion: "portfolio-v1",
        inputRef: "source-1",
        outputRef: "site-1",
        cases: [
          {
            metricId: "project-attribution",
            ruleId: "project-rule",
            stage: "generation",
            caseId: "case-1",
            unit: "project-fact",
            decision: "not_applicable",
            blocking: false,
            evidence: [],
          },
        ],
      },
      {
        metricId: "project-attribution",
        stage: "generation",
        populationMode: "fixed",
        unit: "project-fact",
      },
    );

    expect(result).toMatchObject({
      domain: "portfolio",
      numerator: 0,
      denominator: 0,
      lowerBound: null,
      upperBound: null,
      completionRate: null,
      confirmedRate: null,
      notApplicableCases: 1,
    });
  });

  it("같은 지표라도 다른 단계의 케이스를 섞지 않는다", () => {
    const result = aggregateMetricCases(
      {
        schemaVersion: 1,
        evaluationId: "evaluation-stages",
        evaluatedAt: "2026-11-06T00:00:00.000Z",
        domain: "resume",
        contractVersion: "1",
        caseSetVersion: "facts-v1",
        policyVersion: "resume-v1",
        inputRef: "snapshot-1",
        outputRef: "output-1",
        cases: [
          {
            metricId: "fact-preservation",
            ruleId: "source-rule",
            stage: "generation",
            caseId: "fact-1",
            unit: "fact",
            decision: "pass",
            blocking: false,
            evidence: [],
          },
          {
            metricId: "fact-preservation",
            ruleId: "pdf-rule",
            stage: "pdf",
            caseId: "fact-1",
            unit: "fact",
            decision: "fail",
            blocking: false,
            evidence: [],
          },
        ],
      },
      {
        metricId: "fact-preservation",
        stage: "generation",
        populationMode: "fixed",
        unit: "fact",
      },
    );

    expect(result).toMatchObject({
      stage: "generation",
      passedCases: 1,
      failedCases: 0,
      denominator: 1,
    });
  });
});

describe("compareMetricEvaluations", () => {
  it("같은 입력과 정책에서 출력이 바뀐 결과의 퍼센트포인트와 상대 개선율을 계산한다", () => {
    const before = aggregateMetricCases(
      {
        schemaVersion: 1,
        evaluationId: "evaluation-before",
        evaluatedAt: "2026-11-06T00:00:00.000Z",
        domain: "resume",
        contractVersion: "1",
        caseSetVersion: "facts-v1",
        policyVersion: "resume-v1",
        inputRef: "snapshot-1",
        outputRef: "output-before",
        cases: [
          ...["1", "2", "3"].map((caseId) => ({
            metricId: "fact-preservation",
            ruleId: "fact-rule",
            stage: "generation",
            caseId,
            unit: "fact",
            decision: "pass" as const,
            blocking: false,
            evidence: [],
          })),
          ...["4", "5"].map((caseId) => ({
            metricId: "fact-preservation",
            ruleId: "fact-rule",
            stage: "generation",
            caseId,
            unit: "fact",
            decision: "fail" as const,
            blocking: false,
            evidence: [],
          })),
        ],
      },
      {
        metricId: "fact-preservation",
        stage: "generation",
        populationMode: "fixed",
        unit: "fact",
      },
    );
    const after = aggregateMetricCases(
      {
        schemaVersion: 1,
        evaluationId: "evaluation-after",
        evaluatedAt: "2026-11-06T00:00:00.000Z",
        domain: "resume",
        contractVersion: "1",
        caseSetVersion: "facts-v1",
        policyVersion: "resume-v1",
        inputRef: "snapshot-1",
        outputRef: "output-after",
        cases: [
          ...["1", "2", "3", "4"].map((caseId) => ({
            metricId: "fact-preservation",
            ruleId: "fact-rule",
            stage: "generation",
            caseId,
            unit: "fact",
            decision: "pass" as const,
            blocking: false,
            evidence: [],
          })),
          {
            metricId: "fact-preservation",
            ruleId: "fact-rule",
            stage: "generation",
            caseId: "5",
            unit: "fact",
            decision: "fail" as const,
            blocking: false,
            evidence: [],
          },
        ],
      },
      {
        metricId: "fact-preservation",
        stage: "generation",
        populationMode: "fixed",
        unit: "fact",
      },
    );

    const comparison = compareMetricEvaluations(before, after, "output_change");

    expect(comparison).toMatchObject({
      comparable: true,
      mode: "output_change",
      delta: {
        numerator: 1,
        passedCases: 1,
        failedCases: -1,
        unknownCases: 0,
        notApplicableCases: 0,
        denominator: 0,
      },
    });
    if (!comparison.comparable) throw new Error("Expected comparable results");
    expect(comparison.lowerBoundPercentagePoints).toBeCloseTo(20);
    expect(comparison.upperBoundPercentagePoints).toBeCloseTo(20);
    expect(comparison.completionRatePercentagePoints).toBeCloseTo(0);
    expect(comparison.confirmedRatePercentagePoints).toBeCloseTo(20);
    expect(comparison.relativeConfirmedRatePercent).toBeCloseTo(33.3333);
  });

  it("같은 출력을 다른 정책으로 재평가하는 비교를 구분한다", () => {
    const makeRun = (
      policyVersion: string,
      decisions: ["pass" | "fail", "pass" | "fail"],
    ) =>
      aggregateMetricCases(
        {
          schemaVersion: 1,
          evaluationId: `evaluation-${policyVersion}`,
          evaluatedAt: "2026-11-06T00:00:00.000Z",
          domain: "resume",
          contractVersion: "1",
          caseSetVersion: "facts-v1",
          policyVersion,
          inputRef: "snapshot-1",
          outputRef: "same-output",
          cases: decisions.map((decision, index) => ({
            metricId: "fact-preservation",
            ruleId: "fact-rule",
            stage: "generation",
            caseId: `fact-${index + 1}`,
            unit: "fact",
            decision,
            blocking: false,
            evidence: [],
          })),
        },
        {
          metricId: "fact-preservation",
          stage: "generation",
          populationMode: "fixed",
          unit: "fact",
        },
      );
    const before = makeRun("resume-v1", ["pass", "fail"]);
    const after = makeRun("resume-v2", ["pass", "pass"]);

    const comparison = compareMetricEvaluations(before, after, "policy_change");

    expect(comparison).toMatchObject({
      comparable: true,
      mode: "policy_change",
      delta: { numerator: 1, denominator: 0 },
    });
    if (!comparison.comparable) throw new Error("Expected comparable results");
    expect(comparison.confirmedRatePercentagePoints).toBeCloseTo(50);
  });

  it("도메인이 다르면 같은 지표 이름이어도 비교하지 않는다", () => {
    const makeRun = (domain: string) =>
      aggregateMetricCases(
        {
          schemaVersion: 1,
          evaluationId: `evaluation-${domain}`,
          evaluatedAt: "2026-11-06T00:00:00.000Z",
          domain,
          contractVersion: "1",
          caseSetVersion: "facts-v1",
          policyVersion: `${domain}-v1`,
          inputRef: "input-1",
          outputRef: `${domain}-output`,
          cases: [
            {
              metricId: "content-preservation",
              ruleId: "content-rule",
              stage: "generation",
              caseId: "fact-1",
              unit: "fact",
              decision: "pass" as const,
              blocking: false,
              evidence: [],
            },
          ],
        },
        {
          metricId: "content-preservation",
          stage: "generation",
          populationMode: "fixed",
          unit: "fact",
        },
      );

    expect(
      compareMetricEvaluations(
        makeRun("resume"),
        makeRun("portfolio"),
        "output_change",
      ),
    ).toEqual({
      comparable: false,
      mode: "output_change",
      reason: "DIFFERENT_DOMAIN",
    });
  });

  it("평가 케이스 집합이 다르면 비교하지 않는다", () => {
    const makeRun = (outputRef: string, caseId: string) =>
      aggregateMetricCases(
        {
          schemaVersion: 1,
          evaluationId: `evaluation-${outputRef}`,
          evaluatedAt: "2026-11-06T00:00:00.000Z",
          domain: "resume",
          contractVersion: "1",
          caseSetVersion: "facts-v1",
          policyVersion: "resume-v1",
          inputRef: "snapshot-1",
          outputRef,
          cases: [
            {
              metricId: "fact-preservation",
              ruleId: "fact-rule",
              stage: "generation",
              caseId,
              unit: "fact",
              decision: "pass" as const,
              blocking: false,
              evidence: [],
            },
          ],
        },
        {
          metricId: "fact-preservation",
          stage: "generation",
          populationMode: "fixed",
          unit: "fact",
        },
      );

    expect(
      compareMetricEvaluations(
        makeRun("output-before", "fact-original"),
        makeRun("output-after", "fact-reduced-set"),
        "output_change",
      ),
    ).toEqual({
      comparable: false,
      mode: "output_change",
      reason: "DIFFERENT_CASE_SET",
    });
  });

  it("출력에서 케이스가 만들어지는 지표는 입력과 모집단 규칙이 같으면 다른 출력도 비교한다", () => {
    const makeRun = (
      outputRef: string,
      claims: Array<[string, "pass" | "fail"]>,
    ) =>
      aggregateMetricCases(
        {
          schemaVersion: 1,
          evaluationId: `evaluation-${outputRef}`,
          evaluatedAt: "2026-11-06T00:00:00.000Z",
          domain: "resume",
          contractVersion: "1",
          caseSetVersion: "claim-population-v1",
          policyVersion: "resume-v1",
          inputRef: "snapshot-1",
          outputRef,
          cases: claims.map(([caseId, decision]) => ({
            metricId: "claim-support",
            ruleId: "claim-evidence-rule",
            stage: "pdf",
            caseId,
            unit: "output-claim",
            decision,
            blocking: false,
            evidence: [],
          })),
        },
        {
          metricId: "claim-support",
          stage: "pdf",
          populationMode: "output_derived",
          unit: "output-claim",
        },
      );

    const comparison = compareMetricEvaluations(
      makeRun("output-before", [
        ["claim-a", "pass"],
        ["claim-b", "fail"],
      ]),
      makeRun("output-after", [
        ["claim-c", "pass"],
        ["claim-d", "pass"],
        ["claim-e", "fail"],
      ]),
      "output_change",
    );

    expect(comparison).toMatchObject({
      comparable: true,
      mode: "output_change",
      delta: {
        numerator: 1,
        passedCases: 1,
        failedCases: 0,
        unknownCases: 0,
        notApplicableCases: 0,
        denominator: 1,
      },
    });
    if (!comparison.comparable) throw new Error("Expected comparable results");
    expect(comparison.confirmedRatePercentagePoints).toBeCloseTo(16.6667);
  });
});
