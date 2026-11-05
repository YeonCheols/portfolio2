import type { ConnectionTestState, StructuredCheck } from "../../types";

// 서버가 주는 안전한 코드만 사람이 읽는 문장으로 바꾼다. 모르는 코드는 일반 문구로 가려 원문을 노출하지 않는다
const failureMessages: Record<string, string> = {
  API_KEY_MISSING: "API 키가 등록되지 않았습니다.",
  MODEL_AUTH_FAILED:
    "API 키가 올바르지 않거나 권한이 없습니다. 키를 확인해 주세요.",
  MODEL_PROVIDER_ERROR:
    "모델 공급자에 일시적인 오류가 있거나 호출 한도를 넘었습니다. 잠시 후 다시 시도해 주세요.",
  MODEL_REJECTED:
    "모델 공급자가 요청을 거부했습니다. 모델 이름과 요청 설정을 확인해 주세요.",
  MODEL_TIMEOUT: "제한 시간 안에 응답이 없습니다.",
  MODEL_UNAVAILABLE: "모델 공급자에 연결하지 못했습니다.",
  MISSING_MODEL_CONNECTION: "지원하지 않는 공급자입니다.",
  SETTING_INVALID: "설정의 주소나 모델 정보가 올바르지 않습니다.",
  SETTING_NOT_FOUND: "설정을 찾을 수 없습니다. 새로고침해 주세요.",
  ENVIRONMENT_MISMATCH: "설정의 환경이 달라졌습니다. 새로고침해 주세요.",
  SETTING_UNAVAILABLE:
    "설정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
  REQUEST_FAILED: "요청을 처리하지 못했습니다. 다시 시도해 주세요.",
};

const fallbackFailure = "연결에 실패했습니다.";

// 브라우저 번들이라 Object.hasOwn(Chrome 93, Safari 15.4 이상)을 쓰지 않는다. 서버가 준 코드가 prototype 키여도 걸러야 한다
const failureText = (code: string): string =>
  Object.prototype.hasOwnProperty.call(failureMessages, code)
    ? failureMessages[code]
    : fallbackFailure;

export const connectionTestMessage = (state: ConnectionTestState): string => {
  if (state.status === "running") return "연결을 테스트하는 중입니다.";
  if (state.result.ok) return `연결 성공 · ${state.result.latencyMs}ms`;
  return `연결 실패 · ${failureText(state.result.code)}`;
};

// 연결이 성공한 뒤 json_schema 응답을 쓸 수 있는지 알려 준다. 이력서 생성의 의미 검증이 이 형식을 쓴다
export const structuredMessage = (check: StructuredCheck): string => {
  if (check.ok) return `구조화 응답 지원 · ${check.latencyMs}ms`;
  if (check.code === "STRUCTURED_INVALID") {
    return "구조화 응답 형식 오류 · 모델이 약속한 JSON으로 답하지 않았습니다.";
  }
  return `구조화 응답 미지원 · ${failureText(check.code)}`;
};
