# Resume XML contract 0.2.0

`src/contents/resume/resume.xml` is the canonical internal source for the resume model. The parser also accepts XML strings from uploads, embedded content, or other callers; input origin and file path do not affect interpretation. Parsing never writes external input back to the canonical source.

## Root and sections

The document root is `resumeAsset` with required `id`, `schemaVersion="0.2.0"`, `xml:lang`, `status`, `publicationStatus`, and `visibility` attributes. Exactly one `metadata` and one `profile` top-level section are required. Other supported sections are `educationHistory`, `employmentHistory`, `summaries`, `competencies`, `technologies`, `declaredSkills`, `workingPractices`, `projects`, `contributions`, `initiatives`, `workItems`, `outcomes`, `activities`, `trainingHistory`, `certifications`, `personalStatements`, `portfolioReferences`, `employmentEligibility`, `employmentPreferences`, `missingInformation`, and `reviewItems`.

Nested elements are retained recursively as named nodes with string attributes, direct text, ordered mixed content, and child nodes. Unknown nested element names are preserved for model evolution; unknown top-level sections are rejected until a schema version defines them. Each element may carry a stable non-empty `id`, `status`, `visibility`, `sourceRefs`, and domain references such as `projectRef` or `technologyRefs`. IDs are unique across the document, and whitespace-separated reference values must resolve to an ID in that document. The normalized `references` view splits reference attributes while the original attribute value remains available unchanged.

Project records may include `technicalStructure` for system or architecture structure and `projectApproach` for the way the project was carried out. These values must come from project-specific source evidence. If the source has only the field heading and no content, keep the element empty with `status="missing"`; output adapters must omit the empty field and its heading.

## Dates and validation

Elements with a `precision` attribute use `month` with `YYYY-MM`, or `year` with `YYYY`. `period` and `periodVariant` apply that precision to their `start` and `end` children; other precision-bearing elements apply it to their direct text. A period may omit precision only when its `start` and `end` values are both empty, representing unknown dates. Present values must match the declared precision. Other element names and attributes, including source attribution, status, and visibility, are preserved without rewriting.

The parser reports stable error codes for malformed XML, unsupported versions, missing required fields, unknown sections, duplicate IDs, unresolved references, invalid dates, prohibited DTDs, and input size/depth limits. It rejects DTD declarations and does not resolve external entities. The current limits are 2,000,000 UTF-16 code units, 64 nested element levels, and 50,000 elements.

The model is an internal data contract. It does not publish or expose private resume fields; output adapters must apply visibility and publication rules before rendering or exporting data.
