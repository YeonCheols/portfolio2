export type EvaluationDecision =
  | "pass"
  | "fail"
  | "needs_review"
  | "measurement_failed"
  | "not_applicable";

export type EvaluationEvidenceReference = {
  /** Domain-owned opaque reference; evidence content stays with the domain archive. */
  kind: string;
  reference: string;
};

export type EvaluationCaseResult = {
  metricId: string;
  ruleId: string;
  stage: string;
  caseId: string;
  unit: string;
  decision: EvaluationDecision;
  blocking: boolean;
  evidence: readonly EvaluationEvidenceReference[];
  reasonCode?: string;
};

export type QualityEvaluationRun = {
  schemaVersion: 1;
  evaluationId: string;
  evaluatedAt: string;
  /** Domain and references are opaque to shared aggregation. */
  domain: string;
  /** Shared serialized result and calculation semantics. */
  contractVersion: string;
  /** Domain-owned fixed population and case identity definition. */
  caseSetVersion: string;
  /** Domain-owned decision criteria, versioned independently from the case set. */
  policyVersion: string;
  /** Opaque references to the fixed input and the output being evaluated. */
  inputRef: string;
  outputRef: string;
  cases: readonly EvaluationCaseResult[];
};

export type MetricEvaluationRequest = {
  metricId: string;
  stage: string;
  populationMode: "fixed" | "output_derived";
  unit: string;
};

export type MetricEvaluationAggregate = {
  evaluationId: string;
  evaluatedAt: string;
  domain: string;
  contractVersion: string;
  caseSetVersion: string;
  policyVersion: string;
  inputRef: string;
  outputRef: string;
  metricId: string;
  ruleIds: readonly string[];
  stage: string;
  populationMode: "fixed" | "output_derived";
  unit: string;
  caseIds: readonly string[];
  passedCases: number;
  failedCases: number;
  needsReviewCases: number;
  measurementFailedCases: number;
  unknownCases: number;
  notApplicableCases: number;
  /** Counts use the case unit: pass / (pass + fail + unknown). */
  numerator: number;
  denominator: number;
  /** Rates are fractions in [0, 1]; null means no valid denominator or unresolved cases. */
  lowerBound: number | null;
  upperBound: number | null;
  completionRate: number | null;
  confirmedRate: number | null;
  blockingCases: number;
};

export type MetricEvaluationComparisonMode = "output_change" | "policy_change";

export type MetricEvaluationComparisonReason =
  | "DIFFERENT_DOMAIN"
  | "DIFFERENT_CONTRACT_VERSION"
  | "DIFFERENT_CASE_SET"
  | "DIFFERENT_POPULATION_MODE"
  | "DIFFERENT_METRIC"
  | "DIFFERENT_RULE_SET"
  | "DIFFERENT_STAGE"
  | "DIFFERENT_UNIT"
  | "DIFFERENT_INPUT"
  | "DIFFERENT_POLICY"
  | "DIFFERENT_OUTPUT";

export type MetricEvaluationComparison =
  | {
      comparable: true;
      mode: MetricEvaluationComparisonMode;
      delta: {
        numerator: number;
        passedCases: number;
        failedCases: number;
        unknownCases: number;
        notApplicableCases: number;
        denominator: number;
      };
      lowerBoundPercentagePoints: number | null;
      upperBoundPercentagePoints: number | null;
      completionRatePercentagePoints: number | null;
      confirmedRatePercentagePoints: number | null;
      relativeConfirmedRatePercent: number | null;
    }
  | {
      comparable: false;
      mode: MetricEvaluationComparisonMode;
      reason: MetricEvaluationComparisonReason;
    };
