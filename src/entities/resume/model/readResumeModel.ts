import fs from "fs";
import path from "path";

import {
  parseResumeXml,
  ResumeXmlError,
  type ResumeModel,
} from "./parseResumeXml";

export type ReadResumeModelInput = {
  source: "repository" | "embedded" | "file";
  xml?: string;
};

export type ReadResumeModelResult =
  | { ok: true; model: ResumeModel }
  | { ok: false; code: string };

const canonicalResumePath = path.join(
  process.cwd(),
  "src/contents/resume/resume.xml",
);

export const readResumeModel = (
  input: ReadResumeModelInput,
): ReadResumeModelResult => {
  try {
    const xml =
      input.source === "repository"
        ? fs.readFileSync(canonicalResumePath, "utf8")
        : (input.xml ?? "");

    return { ok: true, model: parseResumeXml(xml) };
  } catch (error) {
    if (error instanceof ResumeXmlError) {
      return { ok: false, code: error.code };
    }

    throw error;
  }
};
