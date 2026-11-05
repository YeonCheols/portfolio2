// 도구 결과 텍스트가 JSON 객체나 배열이면 읽기 쉽게 들여써서 돌려준다.
// 일반 텍스트와 깨진 JSON, 숫자·문자열 같은 단순 값은 도구가 준 그대로 둔다
export const formatResultText = (text: string): string => {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return text;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return typeof parsed === "object" && parsed !== null
      ? JSON.stringify(parsed, null, 2)
      : text;
  } catch {
    return text;
  }
};
