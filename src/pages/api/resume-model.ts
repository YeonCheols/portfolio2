import type { NextApiRequest, NextApiResponse } from "next";

import { readResumeModel } from "@/entities/resume";

const readBody = (
  body: NextApiRequest["body"],
): { source: "repository" | "embedded" | "file"; xml?: string } | null => {
  if (!body || typeof body !== "object") return null;
  const source = body.source;
  if (source !== "repository" && source !== "embedded" && source !== "file") {
    return null;
  }

  return {
    source,
    xml: typeof body.xml === "string" ? body.xml : undefined,
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
    return;
  }

  const token = process.env.RESUME_CONNECTION_TOKEN ?? "";
  const authorization = req.headers.authorization;
  if (token === "" || authorization !== `Bearer ${token}`) {
    res.status(401).json({ ok: false, code: "UNAUTHORIZED" });
    return;
  }

  const input = readBody(req.body);
  if (!input) {
    res.status(400).json({ ok: false, code: "INVALID_INPUT" });
    return;
  }

  const result = readResumeModel(input);
  res.status(result.ok ? 200 : 422).json(result);
}
