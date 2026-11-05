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
