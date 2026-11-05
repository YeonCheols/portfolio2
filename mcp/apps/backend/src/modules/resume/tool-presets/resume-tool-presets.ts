import { randomUUID } from "node:crypto";

// 이력서 도구 시험 입력(프리셋)의 소유자다. 관리자 공용이며 환경별로
// tools/resume/{environment}/presets/{toolName}/{presetId}.json 객체 하나가 프리셋 하나다.
// 저장하는 것은 도구 이름과 입력 인자뿐이다. 이력서 XML 원문은 저장하지 않으므로 인자의 xml은
// 그 도구의 샘플(가상 자료) XML과 완전히 같을 때만 허용하고 다르면 조용히 바꾸지 않고 거절한다
export type ToolPresetStorage = {
  putJson: (path: string, value: unknown) => Promise<void>;
  getJson: (path: string) => Promise<unknown>;
  listObjects: (
    prefix: string,
    page: { limit: number; offset: number },
  ) => Promise<Array<{ name: string; kind: "file" | "folder" }>>;
  removeObjects: (paths: string[]) => Promise<string[]>;
};

export class ToolPresetError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "ToolPresetError";
  }
}

export type ToolPreset = {
  id: string;
  label: string;
  arguments: Record<string, unknown>;
  createdAt: string;
};

export const maxPresetLabelLength = 60;
export const maxPresetBytes = 64 * 1024;
export const maxPresetsPerTool = 30;

const idPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toPreset = (id: string, value: unknown, toolName: string) => {
  if (
    !isRecord(value) ||
    value.toolName !== toolName ||
    typeof value.label !== "string" ||
    typeof value.createdAt !== "string" ||
    !isRecord(value.arguments)
  )
    return null;
  return {
    id,
    label: value.label,
    arguments: value.arguments,
    createdAt: value.createdAt,
  } satisfies ToolPreset;
};

export const createResumeToolPresets = (options: {
  storage: ToolPresetStorage;
  environment: "development" | "production";
  knownTools: readonly string[];
  // 도구별 샘플 XML. 프리셋에 저장할 수 있는 XML은 이 값과 같은 것뿐이다
  sampleXml?: (toolName: string) => string | undefined;
  now?: () => number;
  newId?: () => string;
}) => {
  const { storage } = options;
  const known = new Set(options.knownTools);
  const now = options.now ?? Date.now;
  const newId = options.newId ?? randomUUID;

  const directory = (toolName: string): string => {
    if (!known.has(toolName)) throw new ToolPresetError("UNKNOWN_TOOL");
    return `tools/resume/${options.environment}/presets/${toolName}`;
  };

  const fileNames = async (dir: string): Promise<string[]> => {
    try {
      const entries = await storage.listObjects(dir, {
        limit: maxPresetsPerTool + 20,
        offset: 0,
      });
      return entries
        .filter((entry) => entry.kind === "file")
        .map((entry) => entry.name)
        .filter((name) => name.endsWith(".json"));
    } catch {
      throw new ToolPresetError("PRESET_STORAGE_FAILED");
    }
  };

  const list = async (toolName: string): Promise<ToolPreset[]> => {
    const dir = directory(toolName);
    const names = await fileNames(dir);
    const loaded = await Promise.all(
      names.map(async (name) => {
        const id = name.slice(0, -".json".length);
        if (!idPattern.test(id)) return null;
        try {
          return toPreset(
            id,
            await storage.getJson(`${dir}/${name}`),
            toolName,
          );
        } catch {
          // 읽지 못하거나 손상된 객체 하나가 목록 전체를 막지 않게 건너뛴다
          return null;
        }
      }),
    );
    return loaded
      .filter((preset): preset is ToolPreset => preset !== null)
      .sort(
        (a, b) =>
          b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
      );
  };

  return {
    list,

    save: async (
      input: {
        toolName: string;
        label: string;
        arguments: Record<string, unknown>;
      },
      createdBy: string,
    ): Promise<ToolPreset> => {
      const dir = directory(input.toolName);
      const label = typeof input.label === "string" ? input.label.trim() : "";
      if (
        !label ||
        label.length > maxPresetLabelLength ||
        !isRecord(input.arguments)
      )
        throw new ToolPresetError("INVALID_PRESET");
      const kept = input.arguments;
      if ("xml" in kept && kept.xml !== options.sampleXml?.(input.toolName))
        throw new ToolPresetError("PRESET_XML_NOT_ALLOWED");
      let size: number;
      try {
        size = Buffer.byteLength(JSON.stringify(kept));
      } catch {
        throw new ToolPresetError("INVALID_PRESET");
      }
      if (size > maxPresetBytes) throw new ToolPresetError("PRESET_TOO_LARGE");
      if ((await fileNames(dir)).length >= maxPresetsPerTool)
        throw new ToolPresetError("PRESET_LIMIT");

      const id = newId();
      const createdAt = new Date(now()).toISOString();
      try {
        await storage.putJson(`${dir}/${id}.json`, {
          toolName: input.toolName,
          label,
          arguments: kept,
          createdAt,
          createdBy,
        });
      } catch {
        throw new ToolPresetError("PRESET_STORAGE_FAILED");
      }
      return { id, label, arguments: kept, createdAt };
    },

    remove: async (toolName: string, presetId: string): Promise<void> => {
      const dir = directory(toolName);
      if (!idPattern.test(presetId))
        throw new ToolPresetError("INVALID_PRESET");
      const file = `${presetId}.json`;
      if (!(await fileNames(dir)).includes(file))
        throw new ToolPresetError("PRESET_NOT_FOUND");
      const path = `${dir}/${file}`;
      let removed: string[];
      try {
        removed = await storage.removeObjects([path]);
      } catch {
        throw new ToolPresetError("PRESET_DELETE_FAILED");
      }
      // 저장소가 지웠다고 알린 경로만 성공으로 본다
      if (!removed.includes(path))
        throw new ToolPresetError("PRESET_DELETE_FAILED");
    },
  };
};

export type ResumeToolPresets = ReturnType<typeof createResumeToolPresets>;
