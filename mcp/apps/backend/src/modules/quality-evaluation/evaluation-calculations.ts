import type {
  MetricEvaluationAggregate,
  MetricEvaluationComparison,
  MetricEvaluationComparisonMode,
  MetricEvaluationRequest,
  QualityEvaluationRun,
} from "@mcp/modules/quality-evaluation/evaluation-contract";

export const aggregateMetricCases = (
  run: QualityEvaluationRun,
  request: MetricEvaluationRequest,
): MetricEvaluationAggregate => {
  const cases = run.cases.filter(
    (result) =>
      result.metricId === request.metricId && result.stage === request.stage,
  );
  if (cases.some((result) => !result.caseId.trim())) {
    throw new Error("INVALID_EVALUATION_CASE_ID");
  }
  const caseIds = new Set(cases.map((result) => result.caseId));
  if (caseIds.size !== cases.length) {
    throw new Error("DUPLICATE_EVALUATION_CASE");
  }
  if (cases.some((result) => result.unit !== request.unit)) {
    throw new Error("METRIC_UNIT_MISMATCH");
  }

  const passedCases = cases.filter(
    (result) => result.decision === "pass",
  ).length;
  const failedCases = cases.filter(
    (result) => result.decision === "fail",
  ).length;
  const needsReviewCases = cases.filter(
    (result) => result.decision === "needs_review",
  ).length;
  const measurementFailedCases = cases.filter(
    (result) => result.decision === "measurement_failed",
  ).length;
  const unknownCases = needsReviewCases + measurementFailedCases;
  const notApplicableCases = cases.filter(
    (result) => result.decision === "not_applicable",
  ).length;
  const denominator = passedCases + failedCases + unknownCases;
  const lowerBound = denominator ? passedCases / denominator : null;
  const upperBound = denominator
    ? (passedCases + unknownCases) / denominator
    : null;
  const completionRate = denominator
    ? (passedCases + failedCases) / denominator
    : null;
  const confirmedRate = denominator && unknownCases === 0 ? lowerBound : null;

  return {
    evaluationId: run.evaluationId,
    evaluatedAt: run.evaluatedAt,
    domain: run.domain,
    contractVersion: run.contractVersion,
    caseSetVersion: run.caseSetVersion,
    policyVersion: run.policyVersion,
    inputRef: run.inputRef,
    outputRef: run.outputRef,
    metricId: request.metricId,
    ruleIds: [...new Set(cases.map((result) => result.ruleId))].sort(),
    stage: request.stage,
    populationMode: request.populationMode,
    unit: request.unit,
    caseIds: cases.map((result) => result.caseId).sort(),
    passedCases,
    failedCases,
    needsReviewCases,
    measurementFailedCases,
    unknownCases,
    notApplicableCases,
    numerator: passedCases,
    denominator,
    lowerBound,
    upperBound,
    completionRate,
    confirmedRate,
    blockingCases: cases.filter(
      (result) =>
        result.blocking &&
        result.decision !== "pass" &&
        result.decision !== "not_applicable",
    ).length,
  };
};

const percentagePointChange = (
  before: number | null,
  after: number | null,
): number | null =>
  before === null || after === null ? null : (after - before) * 100;

/** Compares output changes under one policy or policy changes against one output. */
export const compareMetricEvaluations = (
  before: MetricEvaluationAggregate,
  after: MetricEvaluationAggregate,
  mode: MetricEvaluationComparisonMode,
): MetricEvaluationComparison => {
  if (before.domain !== after.domain) {
    return { comparable: false, mode, reason: "DIFFERENT_DOMAIN" };
  }
  if (before.contractVersion !== after.contractVersion) {
    return { comparable: false, mode, reason: "DIFFERENT_CONTRACT_VERSION" };
  }
  if (before.caseSetVersion !== after.caseSetVersion) {
    return { comparable: false, mode, reason: "DIFFERENT_CASE_SET" };
  }
  if (before.populationMode !== after.populationMode) {
    return { comparable: false, mode, reason: "DIFFERENT_POPULATION_MODE" };
  }
  if (
    before.populationMode === "fixed" &&
    (before.caseIds.length !== after.caseIds.length ||
      before.caseIds.some((caseId, index) => caseId !== after.caseIds[index]))
  ) {
    return { comparable: false, mode, reason: "DIFFERENT_CASE_SET" };
  }
  if (before.metricId !== after.metricId) {
    return { comparable: false, mode, reason: "DIFFERENT_METRIC" };
  }
  if (
    before.ruleIds.length !== after.ruleIds.length ||
    before.ruleIds.some((ruleId, index) => ruleId !== after.ruleIds[index])
  ) {
    return { comparable: false, mode, reason: "DIFFERENT_RULE_SET" };
  }
  if (before.stage !== after.stage) {
    return { comparable: false, mode, reason: "DIFFERENT_STAGE" };
  }
  if (before.unit !== after.unit) {
    return { comparable: false, mode, reason: "DIFFERENT_UNIT" };
  }
  if (before.inputRef !== after.inputRef) {
    return { comparable: false, mode, reason: "DIFFERENT_INPUT" };
  }
  if (mode === "output_change") {
    if (before.policyVersion !== after.policyVersion) {
      return { comparable: false, mode, reason: "DIFFERENT_POLICY" };
    }
    if (before.outputRef === after.outputRef) {
      return { comparable: false, mode, reason: "DIFFERENT_OUTPUT" };
    }
  } else {
    if (before.outputRef !== after.outputRef) {
      return { comparable: false, mode, reason: "DIFFERENT_OUTPUT" };
    }
    if (before.policyVersion === after.policyVersion) {
      return { comparable: false, mode, reason: "DIFFERENT_POLICY" };
    }
  }

  const baselineRate = before.confirmedRate;
  const confirmedRatePercentagePoints = percentagePointChange(
    baselineRate,
    after.confirmedRate,
  );

  return {
    comparable: true,
    mode,
    delta: {
      numerator: after.numerator - before.numerator,
      passedCases: after.passedCases - before.passedCases,
      failedCases: after.failedCases - before.failedCases,
      unknownCases: after.unknownCases - before.unknownCases,
      notApplicableCases: after.notApplicableCases - before.notApplicableCases,
      denominator: after.denominator - before.denominator,
    },
    lowerBoundPercentagePoints: percentagePointChange(
      before.lowerBound,
      after.lowerBound,
    ),
    upperBoundPercentagePoints: percentagePointChange(
      before.upperBound,
      after.upperBound,
    ),
    completionRatePercentagePoints: percentagePointChange(
      before.completionRate,
      after.completionRate,
    ),
    confirmedRatePercentagePoints,
    relativeConfirmedRatePercent:
      baselineRate === null ||
      baselineRate === 0 ||
      after.confirmedRate === null
        ? null
        : ((after.confirmedRate - baselineRate) / baselineRate) * 100,
  };
};
