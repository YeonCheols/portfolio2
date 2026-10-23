import fs from "fs";
import path from "path";

const distRoot = path.resolve("dist");
const alias = "@mcp/";

const readJavaScriptFiles = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return readJavaScriptFiles(entryPath);
    return entry.name.endsWith(".js") ? [entryPath] : [];
  });

const relativeSpecifier = (file, specifier) => {
  const target = path.join(distRoot, specifier.slice(alias.length));
  const relativePath = path
    .relative(path.dirname(file), target)
    .split(path.sep)
    .join("/");
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
};

for (const file of readJavaScriptFiles(distRoot)) {
  const source = fs.readFileSync(file, "utf8");
  const rewritten = source.replace(
    /(["'])@mcp\/([^"']+)\1/g,
    (match, quote, specifier) =>
      `${quote}${relativeSpecifier(file, `${alias}${specifier}`)}${quote}`,
  );
  if (rewritten !== source) fs.writeFileSync(file, rewritten);
}
