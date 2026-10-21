import {
  DOMParser,
  type Document as XmlDocument,
  type Element as XmlElement,
} from "@xmldom/xmldom";

export type ResumeXmlNode = {
  name: string;
  attributes: Readonly<Record<string, string>>;
  references: Readonly<Record<string, readonly string[]>>;
  text: string;
  children: readonly ResumeXmlNode[];
  content: readonly (string | ResumeXmlNode)[];
};

export type ResumeModel = {
  id: string;
  schemaVersion: "0.2.0";
  language: string;
  status: string;
  publicationStatus: string;
  visibility: string;
  attributes: Readonly<Record<string, string>>;
  sections: Readonly<Record<string, readonly ResumeXmlNode[]>>;
};

export type ResumeXmlErrorCode =
  | "INVALID_INPUT"
  | "XML_TOO_LARGE"
  | "XML_TOO_DEEP"
  | "MALFORMED_XML"
  | "DOCTYPE_NOT_ALLOWED"
  | "INVALID_ROOT"
  | "UNSUPPORTED_VERSION"
  | "MISSING_REQUIRED_FIELD"
  | "UNKNOWN_SECTION"
  | "DUPLICATE_SECTION"
  | "DUPLICATE_ID"
  | "UNRESOLVED_REFERENCE"
  | "INVALID_DATE";

export class ResumeXmlError extends Error {
  constructor(public readonly code: ResumeXmlErrorCode) {
    super(code);
    this.name = "ResumeXmlError";
  }
}

const MAX_XML_LENGTH = 2_000_000;
const MAX_XML_DEPTH = 64;
const MAX_XML_NODES = 50_000;
const SUPPORTED_SECTIONS = new Set([
  "metadata",
  "profile",
  "educationHistory",
  "employmentHistory",
  "summaries",
  "competencies",
  "technologies",
  "declaredSkills",
  "workingPractices",
  "projects",
  "contributions",
  "initiatives",
  "workItems",
  "outcomes",
  "activities",
  "trainingHistory",
  "certifications",
  "personalStatements",
  "portfolioReferences",
  "employmentEligibility",
  "employmentPreferences",
  "missingInformation",
  "reviewItems",
]);

const fail = (code: ResumeXmlErrorCode): never => {
  throw new ResumeXmlError(code);
};

const hasDoctype = (xml: string): boolean => {
  let cursor = 0;

  while (cursor < xml.length) {
    if (xml.startsWith("<!--", cursor)) {
      const end = xml.indexOf("-->", cursor + 4);
      cursor = end === -1 ? xml.length : end + 3;
      continue;
    }

    if (xml.startsWith("<![CDATA[", cursor)) {
      const end = xml.indexOf("]]>", cursor + 9);
      cursor = end === -1 ? xml.length : end + 3;
      continue;
    }

    if (xml.startsWith("<?", cursor)) {
      const end = xml.indexOf("?>", cursor + 2);
      cursor = end === -1 ? xml.length : end + 2;
      continue;
    }

    if (xml.slice(cursor, cursor + 9).toUpperCase() === "<!DOCTYPE") {
      return true;
    }

    cursor += 1;
  }

  return false;
};

const readAttributes = (element: XmlElement): Record<string, string> => {
  const attributes: Record<string, string> = {};

  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index);
    if (attribute) attributes[attribute.name] = attribute.value;
  }

  return attributes;
};

const isValidDate = (precision: string, value: string): boolean =>
  (precision === "month" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) ||
  (precision === "year" && /^\d{4}$/.test(value));

const readNode = (
  element: XmlElement,
  depth: number,
  nodeCount: { value: number },
): ResumeXmlNode => {
  if (depth > MAX_XML_DEPTH) fail("XML_TOO_DEEP");

  nodeCount.value += 1;
  if (nodeCount.value > MAX_XML_NODES) fail("XML_TOO_LARGE");

  const attributes = readAttributes(element);
  const references: Record<string, readonly string[]> = {};
  Object.entries(attributes).forEach(([name, value]) => {
    if (name === "ref" || /Refs?$/.test(name)) {
      references[name] = value.trim().split(/\s+/).filter(Boolean);
    }
  });

  const children: ResumeXmlNode[] = [];
  const content: (string | ResumeXmlNode)[] = [];
  let text = "";
  for (let index = 0; index < element.childNodes.length; index += 1) {
    const child = element.childNodes.item(index);
    if (!child) continue;
    if (child.nodeType === 1) {
      const node = readNode(child as XmlElement, depth + 1, nodeCount);
      children.push(node);
      content.push(node);
    } else if (child.nodeType === 3 || child.nodeType === 4) {
      const nodeText = child.nodeValue ?? "";
      text += nodeText;
      content.push(nodeText);
    }
  }

  const precision = attributes.precision;
  if (precision && precision !== "month" && precision !== "year")
    fail("INVALID_DATE");

  if (element.tagName === "period" || element.tagName === "periodVariant") {
    const dateValues = children.filter(
      (child) => child.name === "start" || child.name === "end",
    );
    if (!precision && dateValues.some((child) => child.text.trim() !== ""))
      fail("INVALID_DATE");

    if (precision) {
      dateValues.forEach((child) => {
        const value = child.text.trim();
        if (value && !isValidDate(precision, value)) fail("INVALID_DATE");
      });
    }
  } else if (precision && text.trim() && !isValidDate(precision, text.trim())) {
    fail("INVALID_DATE");
  }

  return {
    name: element.tagName,
    attributes,
    references,
    text,
    children,
    content,
  };
};

export const parseResumeXml = (xml: string): ResumeModel => {
  if (typeof xml !== "string" || xml.trim() === "") fail("INVALID_INPUT");
  if (xml.length > MAX_XML_LENGTH) fail("XML_TOO_LARGE");
  if (hasDoctype(xml)) fail("DOCTYPE_NOT_ALLOWED");

  let parseError = false;
  let document: XmlDocument;
  try {
    document = new DOMParser({
      onError: (level) => {
        if (
          level === "warning" ||
          level === "error" ||
          level === "fatalError"
        ) {
          parseError = true;
        }
      },
    }).parseFromString(xml, "application/xml");
  } catch {
    return fail("MALFORMED_XML");
  }
  const root = document.documentElement;
  if (parseError) fail("MALFORMED_XML");
  if (!root) throw new ResumeXmlError("MALFORMED_XML");
  if (root.tagName !== "resumeAsset") fail("INVALID_ROOT");

  const attributes = readAttributes(root);
  if (attributes.schemaVersion !== "0.2.0") fail("UNSUPPORTED_VERSION");
  const language = attributes["xml:lang"];
  if (
    !attributes.id?.trim() ||
    !language ||
    !attributes.status ||
    !attributes.publicationStatus ||
    !attributes.visibility
  ) {
    fail("MISSING_REQUIRED_FIELD");
  }

  const sections: Record<string, ResumeXmlNode[]> = {};
  const ids = new Set<string>();
  const references: string[] = [];
  const nodeCount = { value: 0 };

  for (let index = 0; index < root.childNodes.length; index += 1) {
    const child = root.childNodes.item(index);
    if (!child || child.nodeType !== 1) continue;
    const element = child as XmlElement;
    if (!SUPPORTED_SECTIONS.has(element.tagName)) fail("UNKNOWN_SECTION");
    const node = readNode(element, 1, nodeCount);
    sections[node.name] ??= [];
    sections[node.name].push(node);
  }

  if (!sections.metadata?.length || !sections.profile?.length)
    fail("MISSING_REQUIRED_FIELD");
  if (sections.metadata.length !== 1 || sections.profile.length !== 1)
    fail("DUPLICATE_SECTION");

  const collect = (nodes: readonly ResumeXmlNode[]): void => {
    nodes.forEach((node) => {
      const id = node.attributes.id;
      if (id !== undefined) {
        if (!id.trim()) fail("MISSING_REQUIRED_FIELD");
        if (ids.has(id)) fail("DUPLICATE_ID");
        ids.add(id);
      }
      Object.values(node.references).forEach((values) =>
        references.push(...values),
      );
      collect(node.children);
    });
  };
  collect(Object.values(sections).flat());

  if (attributes.id && ids.has(attributes.id)) fail("DUPLICATE_ID");
  if (attributes.id) ids.add(attributes.id);
  if (references.some((reference) => !ids.has(reference)))
    fail("UNRESOLVED_REFERENCE");

  return {
    id: attributes.id,
    schemaVersion: "0.2.0",
    language,
    status: attributes.status,
    publicationStatus: attributes.publicationStatus,
    visibility: attributes.visibility,
    attributes,
    sections,
  };
};
