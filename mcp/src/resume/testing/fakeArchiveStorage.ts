// 아카이브 서비스 테스트용 인메모리 Storage. 실제 Supabase처럼 같은 경로에 다시 쓰기를 거부하고
// 폴더는 경로에서 파생하며 객체마다 순서가 있는 생성 시각을 준다. 실행 코드는 이 파일을 가져오지 않는다
export type FakeStorageEntry = {
  name: string;
  kind: "file" | "folder";
  createdAt?: string;
};

export const createFakeArchiveStorage = (
  initial: Record<string, unknown> = {},
) => {
  const objects = new Map<string, { body: unknown; createdAt: string }>();
  let tick = 0;
  const put = (path: string, body: unknown) => {
    objects.set(path, {
      body: structuredClone(body),
      createdAt: new Date(Date.UTC(2026, 10, 4, 0, 0, tick++)).toISOString(),
    });
  };
  for (const [path, body] of Object.entries(initial)) put(path, body);
  const calls = { putJson: 0, removeObjects: 0, listObjects: 0 };
  // 이 경로에 쓰기·삭제를 일으키는 호출을 실패시키려는 테스트용 스위치
  const failures = { removeBatch: false };
  return {
    objects,
    calls,
    failures,
    putJson: async (path: string, value: unknown): Promise<void> => {
      calls.putJson += 1;
      // 실제 Storage 어댑터처럼 "이미 있음"을 다른 쓰기 오류와 구분해 알린다
      if (objects.has(path))
        throw Object.assign(new Error("STORAGE_OBJECT_EXISTS"), {
          code: "STORAGE_OBJECT_EXISTS",
        });
      put(path, value);
    },
    getJson: async (path: string): Promise<unknown> => {
      const object = objects.get(path);
      if (!object) throw new Error("STORAGE_READ_FAILED");
      return structuredClone(object.body);
    },
    listObjects: async (
      prefix: string,
      page: { limit: number; offset: number },
    ): Promise<FakeStorageEntry[]> => {
      calls.listObjects += 1;
      const entries = new Map<string, FakeStorageEntry>();
      for (const [path, object] of objects) {
        if (!path.startsWith(`${prefix}/`)) continue;
        const [head, ...rest] = path.slice(prefix.length + 1).split("/");
        entries.set(
          head,
          rest.length
            ? { name: head, kind: "folder" }
            : { name: head, kind: "file", createdAt: object.createdAt },
        );
      }
      return [...entries.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(page.offset, page.offset + page.limit);
    },
    createSignedUrl: async (path: string): Promise<string> =>
      `https://storage.example.test/sign/${path}?token=fake`,
    removeObjects: async (paths: string[]): Promise<string[]> => {
      calls.removeObjects += 1;
      const removed: string[] = [];
      paths.forEach((path, index) => {
        // 일부 실패를 흉내 낸다: 마지막 객체는 지워지지 않고 응답에서 빠진다
        if (failures.removeBatch && index === paths.length - 1) return;
        if (objects.delete(path)) removed.push(path);
      });
      return removed;
    },
  };
};

export type FakeArchiveStorage = ReturnType<typeof createFakeArchiveStorage>;

export const archiveBase = "debug/resume/development/subj-a/gen-1/att-1";

// 실패한 실행 하나: 스냅샷·요청·원문 응답이 단계별로 누적된다
export const failedAttemptObjects = (response: string) => {
  const snapshot = {
    selection: [
      {
        id: "profile",
        section: "profile",
        name: "name",
        text: "테스트 사용자",
        sourceRefs: [],
        visibility: "public",
        children: [],
      },
    ],
    forms: [],
  };
  const request = { persona: "작성자", prompt: "요청 본문" };
  return {
    [`${archiveBase}/001-started.json`]: { stage: "started" },
    [`${archiveBase}/002-source.json`]: { stage: "source", snapshot },
    [`${archiveBase}/003-model_response.json`]: {
      stage: "model_response",
      snapshot,
      request,
      response,
    },
    [`${archiveBase}/004-failed.json`]: {
      stage: "failed",
      snapshot,
      request,
      response,
      errorCode: "MODEL_REJECTED",
    },
  };
};

export const validResponse = JSON.stringify({
  claims: [
    {
      text: "테스트 사용자",
      sourceIds: ["profile"],
      evidence: [{ sourceId: "profile", quote: "테스트 사용자" }],
    },
  ],
});
