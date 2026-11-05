export type JsonStorage = {
  putJson: (path: string, value: unknown) => Promise<void>;
};

export type StorageEntry = {
  name: string;
  kind: "file" | "folder";
  createdAt?: string;
};

export class StorageError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "StorageError";
  }
}

const removeBatchSize = 100;

const objectPath = (path: string): string => {
  if (
    !path
      .split("/")
      .every((part) => /^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(part))
  ) {
    throw new StorageError("STORAGE_PATH_INVALID");
  }
  return path;
};

export const createSupabaseStorage = (options: {
  url: string;
  secretKey: string;
  bucket: string;
  fetchImpl?: typeof fetch;
}) => {
  let base: URL;
  try {
    base = new URL(options.url);
  } catch {
    throw new StorageError("STORAGE_CONFIG_INVALID");
  }
  if (
    base.protocol !== "https:" ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    base.pathname !== "/" ||
    !options.secretKey.trim() ||
    !/^[a-z0-9][a-z0-9_-]*$/.test(options.bucket)
  ) {
    throw new StorageError("STORAGE_CONFIG_INVALID");
  }
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const bucket = encodeURIComponent(options.bucket);
  // 같은 경로에 이미 객체가 있어 거부됐는지 본다. 본문은 판단에만 쓰고 밖으로 내보내지 않는다
  const isAlreadyExists = async (response: Response): Promise<boolean> => {
    if (response.status === 409) return true;
    try {
      const body = (await response.json()) as { error?: unknown };
      return body.error === "Duplicate";
    } catch {
      return false;
    }
  };
  // Supabase는 없는 객체를 404 또는 본문이 not_found인 400으로 알린다. 본문은 판단에만 쓰고 밖으로 내보내지 않는다
  const isNotFound = async (response: Response): Promise<boolean> => {
    if (response.status === 404) return true;
    try {
      const body = (await response.json()) as {
        error?: unknown;
        statusCode?: unknown;
      };
      return body.error === "not_found" || String(body.statusCode) === "404";
    } catch {
      return false;
    }
  };
  const request = async (
    path: string,
    init: RequestInit,
    code: string,
    existsCode?: string,
    notFoundCode?: string,
  ): Promise<Response> => {
    let response: Response;
    try {
      response = await fetchImpl(`${base.origin}/storage/v1${path}`, {
        ...init,
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
        headers: {
          apikey: options.secretKey,
          "content-type": "application/json",
          "cache-control": "no-store",
          ...(init.headers as Record<string, string> | undefined),
        },
      });
    } catch {
      throw new StorageError(code);
    }
    if (!response.ok) {
      if (existsCode && (await isAlreadyExists(response)))
        throw new StorageError(existsCode);
      if (notFoundCode && (await isNotFound(response)))
        throw new StorageError(notFoundCode);
      throw new StorageError(code);
    }
    return response;
  };
  return {
    putJson: async (path: string, value: unknown): Promise<void> => {
      await request(
        `/object/${bucket}/${objectPath(path)}`,
        { method: "POST", body: JSON.stringify(value) },
        "STORAGE_WRITE_FAILED",
        "STORAGE_OBJECT_EXISTS",
      );
    },
    // 같은 경로를 계속 갱신하는 값(도구 활성 정책)에만 쓴다. 보관 기록은 putJson으로 덮어쓰지 않는다
    putJsonOverwrite: async (path: string, value: unknown): Promise<void> => {
      await request(
        `/object/${bucket}/${objectPath(path)}`,
        {
          method: "POST",
          body: JSON.stringify(value),
          headers: { "x-upsert": "true" },
        },
        "STORAGE_WRITE_FAILED",
      );
    },
    getJson: async (path: string): Promise<unknown> => {
      const response = await request(
        `/object/authenticated/${bucket}/${objectPath(path)}`,
        { method: "GET" },
        "STORAGE_READ_FAILED",
        undefined,
        "STORAGE_OBJECT_NOT_FOUND",
      );
      try {
        return await response.json();
      } catch {
        throw new StorageError("STORAGE_READ_FAILED");
      }
    },
    // 원문이 공개되지 않도록 버킷이 비공개인지 확인한다. 값을 알 수 없으면 공개로 보고 거부한다
    assertBucketPrivate: async (): Promise<void> => {
      const response = await request(
        `/bucket/${bucket}`,
        { method: "GET" },
        "STORAGE_BUCKET_CHECK_FAILED",
      );
      let isPublic: unknown;
      try {
        isPublic = ((await response.json()) as { public?: unknown }).public;
      } catch {
        throw new StorageError("STORAGE_BUCKET_CHECK_FAILED");
      }
      if (isPublic !== false) throw new StorageError("STORAGE_BUCKET_PUBLIC");
    },
    // 지웠다고 응답한 경로만 반환하므로 호출자가 요청과 비교해 일부 실패를 알아낸다
    removeObjects: async (paths: string[]): Promise<string[]> => {
      const valid = paths.map(objectPath);
      const removed: string[] = [];
      for (let start = 0; start < valid.length; start += removeBatchSize) {
        const response = await request(
          `/object/${bucket}`,
          {
            method: "DELETE",
            body: JSON.stringify({
              prefixes: valid.slice(start, start + removeBatchSize),
            }),
          },
          "STORAGE_DELETE_FAILED",
        );
        try {
          const data: unknown = await response.json();
          if (!Array.isArray(data)) throw new Error();
          for (const item of data) {
            if (
              typeof item !== "object" ||
              item === null ||
              !("name" in item) ||
              typeof item.name !== "string"
            )
              throw new Error();
            removed.push(item.name);
          }
        } catch {
          throw new StorageError("STORAGE_DELETE_FAILED");
        }
      }
      return removed;
    },
    listObjects: async (
      prefix: string,
      page: { limit: number; offset: number },
    ): Promise<StorageEntry[]> => {
      const response = await request(
        `/object/list/${bucket}`,
        {
          method: "POST",
          body: JSON.stringify({
            prefix: objectPath(prefix),
            limit: page.limit,
            offset: page.offset,
            sortBy: { column: "name", order: "asc" },
          }),
        },
        "STORAGE_LIST_FAILED",
      );
      try {
        const data: unknown = await response.json();
        if (!Array.isArray(data)) throw new Error();
        return data.map((item: unknown) => {
          if (
            typeof item !== "object" ||
            item === null ||
            !("name" in item) ||
            typeof item.name !== "string"
          )
            throw new Error();
          // Supabase는 폴더 항목에 id를 주지 않는다
          const isFile = "id" in item && Boolean(item.id);
          const createdAt =
            isFile &&
            "created_at" in item &&
            typeof item.created_at === "string" &&
            !Number.isNaN(Date.parse(item.created_at))
              ? item.created_at
              : undefined;
          return {
            name: item.name,
            kind: isFile ? "file" : "folder",
            ...(createdAt ? { createdAt } : {}),
          } satisfies StorageEntry;
        });
      } catch {
        throw new StorageError("STORAGE_LIST_FAILED");
      }
    },
    createSignedUrl: async (path: string): Promise<string> => {
      const expected = `/object/sign/${bucket}/${objectPath(path)}`;
      const response = await request(
        expected,
        { method: "POST", body: JSON.stringify({ expiresIn: 300 }) },
        "STORAGE_SIGN_FAILED",
      );
      try {
        const data: unknown = await response.json();
        if (
          typeof data !== "object" ||
          data === null ||
          !("signedURL" in data) ||
          typeof data.signedURL !== "string"
        )
          throw new Error();
        const url = new URL(`/storage/v1${data.signedURL}`, base.origin);
        if (
          url.origin !== base.origin ||
          url.pathname !== `/storage/v1${expected}` ||
          !url.searchParams.get("token")
        )
          throw new Error();
        return url.toString();
      } catch {
        throw new StorageError("STORAGE_SIGN_FAILED");
      }
    },
  };
};
