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
  const request = async (
    path: string,
    init: RequestInit,
    code: string,
  ): Promise<Response> => {
    try {
      const response = await fetchImpl(`${base.origin}/storage/v1${path}`, {
        ...init,
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
        headers: {
          apikey: options.secretKey,
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      });
      if (!response.ok) throw new StorageError(code);
      return response;
    } catch {
      throw new StorageError(code);
    }
  };
  return {
    putJson: async (path: string, value: unknown): Promise<void> => {
      await request(
        `/object/${bucket}/${objectPath(path)}`,
        { method: "POST", body: JSON.stringify(value) },
        "STORAGE_WRITE_FAILED",
      );
    },
    getJson: async (path: string): Promise<unknown> => {
      const response = await request(
        `/object/authenticated/${bucket}/${objectPath(path)}`,
        { method: "GET" },
        "STORAGE_READ_FAILED",
      );
      try {
        return await response.json();
      } catch {
        throw new StorageError("STORAGE_READ_FAILED");
      }
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
