import { createHash } from "crypto";

import type { IntrospectedSession } from "@mcp/infrastructure/portfolio-api/portfolio-api-introspector";

type SessionIntrospector = (token: string) => Promise<IntrospectedSession>;

export const withSessionCache = (
  introspect: SessionIntrospector,
  options: { ttlMs: number; now?: () => number; maxEntries?: number },
): SessionIntrospector => {
  const now = options.now ?? Date.now;
  const maxEntries = options.maxEntries ?? 100;
  const entries = new Map<
    string,
    { session: IntrospectedSession; at: number }
  >();

  return async (token) => {
    // 원문 토큰을 메모리 키로 들고 있지 않는다
    const key = createHash("sha256").update(token).digest("hex");
    const hit = entries.get(key);
    if (hit && now() - hit.at < options.ttlMs) return hit.session;
    entries.delete(key);

    const session = await introspect(token);
    // 폐기된 세션이 잠시라도 활성으로 보이지 않도록 활성 결과만 담는다
    if (session.active) {
      entries.set(key, { session, at: now() });
      // Map은 삽입 순서를 유지하므로 첫 키가 가장 오래된 항목이다
      while (entries.size > maxEntries) {
        entries.delete(entries.keys().next().value as string);
      }
    }
    return session;
  };
};
