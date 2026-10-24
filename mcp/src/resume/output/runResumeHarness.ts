import {
  checkResumeDraft,
  checkedResumeText,
  type CheckedDraft,
  type DraftClaim,
  type ResumeSelectionNode,
} from "@mcp/resume/output/checkResumeDraft";

export const resumeWriterPersona = [
  "너는 이력서 전문 작성자다.",
  "선택한 XML 원소의 원문만 근거로 원소를 해석하고, 그 해석으로 이력서 문장을 다시 쓴다.",
  "원문을 그대로 이어 붙이지 않고 이력서 문장으로 재구성한다.",
  "XML에 없는 경력, 성과, 기술은 만들지 않는다.",
  "각 문장에는 근거 원소 id를 붙인다.",
  "원문이 비어 있거나 근거 id가 없으면 그 내용은 누락으로 남긴다.",
  "같은 원소에 서로 다른 단정이 있으면 하나를 고르지 않고 충돌로 남긴다.",
  "공개 여부가 비어 있으면 공개로 단정하지 않는다.",
  "비공개 원문을 지우거나 공개로 바꾸지 않는다.",
  "응답은 요청된 JSON만 반환한다.",
].join("\n");

export type ResumeModelRequest = {
  persona: string;
  prompt: string;
};

export type ResumeModelClient = {
  generate: (input: ResumeModelRequest) => Promise<string>;
};

export type GeneratedResume = CheckedDraft & {
  resume: string;
};

const isClaim = (value: unknown): value is DraftClaim => {
  if (typeof value !== "object" || value === null) return false;
  if (!("text" in value) || !("sourceIds" in value)) return false;
  const { text, sourceIds } = value;
  return (
    typeof text === "string" &&
    Array.isArray(sourceIds) &&
    sourceIds.every((id) => typeof id === "string")
  );
};

const hasInterpretation = (text: string): boolean => {
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("elements" in parsed)
    ) {
      return false;
    }
    const { elements } = parsed;
    return Array.isArray(elements) && elements.length > 0;
  } catch {
    return false;
  }
};

const parseClaims = (text: string): DraftClaim[] => {
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("claims" in parsed)
    ) {
      return [];
    }
    const { claims } = parsed;
    if (!Array.isArray(claims) || !claims.every(isClaim)) return [];
    return claims;
  } catch {
    return [];
  }
};

export type ResumeFormSection = {
  section: string;
  text: string;
};

export const interpretResumePrompt = (
  selection: readonly ResumeSelectionNode[],
  form?: string,
) =>
  `선택한 원소를 해석하고 JSON만 반환한다. 형식은 {"elements":[{"id":"","interpretation":""}]} 이다.\n${form ? `${form}\n` : ""}${JSON.stringify(selection)}`;

export const rewriteResumePrompt = (interpretation: string) =>
  `해석을 이력서 문장으로 재작성하고 JSON만 반환한다. 형식은 {"claims":[{"text":"","sourceIds":[""]}]} 이다.\n${interpretation}`;

export const continueResumeGeneration = (
  selection: readonly ResumeSelectionNode[],
  interpretation: string,
) => {
  if (!hasInterpretation(interpretation)) {
    const checked = checkResumeDraft(selection, []);
    return {
      ...checked,
      step: "done" as const,
      resume: checkedResumeText(checked),
    };
  }
  return {
    persona: resumeWriterPersona,
    step: "rewrite" as const,
    prompt: rewriteResumePrompt(interpretation),
  };
};

const mergeChecked = (parts: readonly CheckedDraft[]): GeneratedResume => {
  const checked = {
    claims: parts.flatMap((part) => part.claims),
    gaps: parts.flatMap((part) => part.gaps),
    conflicts: parts.flatMap((part) => part.conflicts),
    uncertain: parts.flatMap((part) => part.uncertain),
  };
  return { ...checked, resume: checkedResumeText(checked) };
};

export const runResumeHarness = async (
  selection: readonly ResumeSelectionNode[],
  client: ResumeModelClient,
  forms?: readonly ResumeFormSection[],
): Promise<GeneratedResume> => {
  const groups = forms
    ? forms.flatMap((form) => {
        const nodes = selection.filter((node) => node.section === form.section);
        return nodes.length === 0 ? [] : [{ text: form.text, nodes }];
      })
    : [{ text: "", nodes: selection }];
  const checked: CheckedDraft[] = [];

  for (const group of groups) {
    const interpretation = await client.generate({
      persona: resumeWriterPersona,
      prompt: interpretResumePrompt(group.nodes, group.text),
    });
    if (!hasInterpretation(interpretation)) continue;
    const rewritten = await client.generate({
      persona: resumeWriterPersona,
      prompt: rewriteResumePrompt(interpretation),
    });
    checked.push(checkResumeDraft(selection, parseClaims(rewritten)));
  }

  return mergeChecked(checked);
};

export const generateResume = async (
  selection: readonly ResumeSelectionNode[],
  input: {
    claims?: readonly DraftClaim[];
    interpretation?: string;
    model?: ResumeModelClient;
    forms?: readonly ResumeFormSection[];
  },
) => {
  if (input.claims !== undefined) {
    const checked = checkResumeDraft(selection, input.claims);
    return {
      ...checked,
      step: "done" as const,
      resume: checkedResumeText(checked),
    };
  }
  if (input.interpretation !== undefined) {
    return continueResumeGeneration(selection, input.interpretation);
  }
  if (input.model) {
    return runResumeHarness(selection, input.model, input.forms);
  }
  return {
    persona: resumeWriterPersona,
    step: "interpret" as const,
    prompt: interpretResumePrompt(
      selection,
      input.forms?.map((form) => form.text).join("\n"),
    ),
    selection,
  };
};
