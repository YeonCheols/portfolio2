export type ModelEnvironment = "development" | "production";

export type ModelSetting = {
  id: number;
  environment: ModelEnvironment;
  provider: string;
  modelName: string;
  url: string;
  hasApiKey: boolean;
  isActive: boolean;
};

// json_schema 응답 형식을 쓸 수 있는지 확인한 결과다. 지원하지 않거나 형식이 틀리면 코드가 온다
export type StructuredCheck =
  | { ok: true; latencyMs: number; response?: unknown }
  | { ok: false; code: string; response?: unknown };

// 서버는 성공 여부와 소요 시간, 공급자 응답 원문, 구조화 응답 확인 결과 또는 안전한 오류 코드만 돌려준다
export type ConnectionTestResult =
  | {
      ok: true;
      latencyMs: number;
      response?: unknown;
      structured?: StructuredCheck;
    }
  | { ok: false; code: string };

export type ConnectionTestState =
  | { status: "running" }
  | { status: "done"; result: ConnectionTestResult };

export type ModelSettingInput = Pick<
  ModelSetting,
  "environment" | "provider" | "modelName" | "url"
> & { apiKey?: string };

export type ArchiveStatus = "completed" | "failed" | "incomplete";

// 서버가 폴더 이름과 단계 파일명으로 만든 실행 요약이다. 본문은 상세에서만 온다
export type ArchiveSummary = {
  subjectHash: string;
  generationId: string;
  attemptId: string;
  startedAt?: string;
  stages: string[];
  status: ArchiveStatus;
  failedAfter?: string;
};

export type ArchiveFile = { name: string; stage: string; createdAt?: string };

export type ArchiveDetail = {
  summary: ArchiveSummary;
  files: ArchiveFile[];
  // 마지막 단계 기록이다. 요청·원문 응답·검증 결과가 저장된 그대로 들어 있다
  latest: unknown;
};

export type ArchiveKey = {
  environment: ModelEnvironment;
  subjectHash: string;
  generationId: string;
  attemptId: string;
};

export type ArchiveQuery = {
  environment: ModelEnvironment;
  generationId?: string;
  attemptId?: string;
  failedStage?: string;
  page?: number;
  pageSize?: number;
};

export type RevisionSummary = { revisionId: string; createdAt?: string };

export type ResumeQualityReview = {
  reviewId: string;
  evaluationId: string;
  caseSetVersion: string;
  policyVersion: string;
  inputRef: string;
  outputRef: string;
  caseId: string;
  decision: "pass" | "fail";
  reviewedAt: string;
  reviewerHash: string;
};

export type ResumeQualityEvaluation = {
  run: {
    evaluationId: string;
    caseSetVersion: string;
    policyVersion: string;
    inputRef: string;
    outputRef: string;
    cases: {
      metricId: string;
      caseId: string;
      decision: string;
      blocking: boolean;
      reasonCode?: string;
      evidence: readonly { kind: string; reference: string }[];
    }[];
  };
  aggregates: readonly {
    metricId: string;
    confirmedRate: number | null;
    denominator: number;
    blockingCases: number;
  }[];
  manualReviews?: readonly ResumeQualityReview[];
};

export type ResumeQualityDashboardMetric = {
  metricId: string;
  confirmedRate: number | null;
  lowerBound: number | null;
  upperBound: number | null;
  denominator: number;
  blockingCases: number;
  needsReviewCases: number;
  failedCases: number;
  passedCases: number;
};

export type ResumeQualityDashboardItem = {
  archive: ArchiveKey & {
    startedAt?: string;
    status: ArchiveStatus;
  };
  evaluationId: string;
  evaluatedAt: string;
  metrics: ResumeQualityDashboardMetric[];
};

export type RevisionRecord = {
  revisionId: string;
  createdAt?: string;
  base?: { file: string };
  request?: unknown;
  response: string;
};

export type ReproductionSource =
  | { kind: "original" }
  | { kind: "revision"; revisionId: string };

export type ReproductionAction = "validate" | "pdf";

export type ReproductionRecord = {
  reproductionId: string;
  createdAt: string;
  source: ReproductionSource;
  action: ReproductionAction;
  status: "completed" | "failed";
  failedStage?: "snapshot" | "response" | "validation" | "pdf";
  errorCode?: string;
  validation?: {
    claims: number;
    gaps: number;
    conflicts: number;
    uncertain: number;
    issues: unknown[];
  };
  pdf?: { byteLength: number };
};
