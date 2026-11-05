// 이력서 MCP 도구의 활성 정책 소유자다. /mcp의 tools/list·tools/call과 관리 화면이 같은 정책을 읽는다.
// 저장 위치는 tools/resume/{environment}/policy.json 한 객체이고 끈 도구 이름만 기록한다
export type ToolPolicyStorage = {
  getJson: (path: string) => Promise<unknown>;
  putJsonOverwrite: (path: string, value: unknown) => Promise<void>;
};

export class ToolPolicyError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "ToolPolicyError";
  }
}

// 요청마다 Storage를 조회하지 않도록 10초 동안 읽은 정책을 재사용한다.
// 다른 인스턴스가 바꾼 정책은 최대 이 시간 뒤에 반영된다
export const toolPolicyCacheMs = 10_000;

type PolicyFile = { disabled: string[]; updatedAt: string; updatedBy: string };

const isNotFound = (error: unknown): boolean =>
  (error as { code?: unknown } | null)?.code === "STORAGE_OBJECT_NOT_FOUND";

const parsePolicy = (value: unknown): ReadonlySet<string> => {
  const disabled = (value as { disabled?: unknown } | null)?.disabled;
  if (!Array.isArray(disabled) || !disabled.every((n) => typeof n === "string"))
    throw new ToolPolicyError("TOOL_POLICY_UNAVAILABLE");
  return new Set(disabled);
};

export const createResumeToolPolicy = (options: {
  storage: ToolPolicyStorage;
  environment: "development" | "production";
  knownTools: readonly string[];
  ttlMs?: number;
  now?: () => number;
}) => {
  const { storage } = options;
  const path = `tools/resume/${options.environment}/policy.json`;
  const ttlMs = options.ttlMs ?? toolPolicyCacheMs;
  const now = options.now ?? Date.now;
  const known = new Set(options.knownTools);

  let cached: { disabled: ReadonlySet<string>; expiresAt: number } | undefined;
  let lastGood: ReadonlySet<string> | undefined;
  let loading: Promise<ReadonlySet<string>> | undefined;

  const remember = (disabled: ReadonlySet<string>) => {
    lastGood = disabled;
    cached = { disabled, expiresAt: now() + ttlMs };
  };

  // 정책 파일이 없으면 처음 상태라 모두 활성이다. 그 밖의 읽기 실패나 손상은 활성으로 취급하지 않는다
  const read = async (): Promise<ReadonlySet<string>> => {
    try {
      return parsePolicy(await storage.getJson(path));
    } catch (error) {
      if (isNotFound(error)) return new Set();
      throw error;
    }
  };

  const load = (): Promise<ReadonlySet<string>> => {
    loading ??= (async () => {
      try {
        const disabled = await read();
        remember(disabled);
        return disabled;
      } catch {
        // 일시 장애에는 마지막으로 읽은 정상 정책을 쓰되 매 요청 재시도하지 않도록 수명을 다시 건다
        if (lastGood) {
          remember(lastGood);
          return lastGood;
        }
        throw new ToolPolicyError("TOOL_POLICY_UNAVAILABLE");
      } finally {
        loading = undefined;
      }
    })();
    return loading;
  };

  return {
    disabledNames: async (): Promise<ReadonlySet<string>> =>
      cached && cached.expiresAt > now() ? cached.disabled : load(),

    setEnabled: async (
      name: string,
      enabled: boolean,
      updatedBy: string,
    ): Promise<void> => {
      if (!known.has(name)) throw new ToolPolicyError("UNKNOWN_TOOL");
      // 다른 인스턴스의 변경을 잃지 않도록 캐시가 아니라 최신 정책에서 바꾼다
      let current: ReadonlySet<string>;
      try {
        current = await read();
      } catch {
        throw new ToolPolicyError("TOOL_POLICY_UNAVAILABLE");
      }
      const disabled = new Set(current);
      if (enabled) disabled.delete(name);
      else disabled.add(name);
      const file: PolicyFile = {
        disabled: [...disabled],
        updatedAt: new Date(now()).toISOString(),
        updatedBy,
      };
      await storage.putJsonOverwrite(path, file);
      remember(disabled);
    },
  };
};

export type ResumeToolPolicy = ReturnType<typeof createResumeToolPolicy>;
