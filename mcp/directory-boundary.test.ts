import fs from "fs";
import path from "path";

const sourceFiles = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
      ? [file]
      : [];
  });

describe("MCP workspace boundaries", () => {
  it("직접 관리하는 코드 파일과 폴더는 kebab-case로 작성한다", () => {
    const violations: string[] = [];
    const inspect = (directory: string): void => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (
          ["node_modules", "dist"].includes(entry.name) ||
          entry.name.startsWith(".")
        )
          continue;
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name))
            violations.push(path.relative(__dirname, file));
          inspect(file);
        } else if (
          /\.(?:[cm]?js|tsx?)$/.test(entry.name) &&
          !/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(
            entry.name,
          )
        ) {
          violations.push(path.relative(__dirname, file));
        }
      }
    };
    for (const directory of ["apps", "packages", "scripts"])
      inspect(path.join(__dirname, directory));
    for (const entry of fs.readdirSync(__dirname)) {
      if (/\.(?:[cm]?js|tsx?)$/.test(entry) && /[A-Z_]/.test(entry))
        violations.push(entry);
    }
    expect(violations).toEqual([]);
  });

  it("업무 모듈과 소비처가 서로의 내부 구현을 가져오지 않는다", () => {
    const root = path.join(__dirname, "apps/backend/src");
    const violations = sourceFiles(root).flatMap((file) => {
      const relative = path.relative(root, file);
      const imports = [
        ...fs
          .readFileSync(file, "utf8")
          .matchAll(/(?:from\s+|import\s*\(\s*)["'](@mcp\/[^"']+)["']/g),
      ];
      return imports.flatMap((match) => {
        const target = match[1].slice("@mcp/".length);
        const forbidden = relative.startsWith("modules/")
          ? /^(interfaces|bootstrap)\//.test(target)
          : relative.startsWith("interfaces/admin/")
            ? /^(interfaces\/tools|bootstrap)\//.test(target)
            : relative.startsWith("interfaces/tools/")
              ? /^(interfaces\/admin|bootstrap)\//.test(target)
              : relative.startsWith("infrastructure/")
                ? /^(interfaces|bootstrap)\//.test(target)
                : false;
        return forbidden ? [`${relative} -> ${target}`] : [];
      });
    });
    expect(violations).toEqual([]);
  });

  it("콘솔은 백엔드 소스를 직접 가져오지 않고 공통 계약은 순수 데이터로 유지한다", () => {
    const consoleRoot = path.join(__dirname, "apps/console/src");
    const violations = sourceFiles(consoleRoot).flatMap((file) => {
      const imports = [
        ...fs
          .readFileSync(file, "utf8")
          .matchAll(/(?:from\s+|import\s*\(\s*)["']([^"']+)["']/g),
      ];
      return imports.flatMap((match) => {
        const specifier = match[1];
        if (specifier.startsWith("@mcp/") || specifier.includes("backend/"))
          return [specifier];
        if (
          specifier.startsWith(".") &&
          !path
            .resolve(path.dirname(file), specifier)
            .startsWith(consoleRoot + path.sep)
        )
          return [specifier];
        return [];
      });
    });
    expect(violations).toEqual([]);
    const contracts = path.join(__dirname, "packages/admin-contracts/src");
    expect(
      fs.readFileSync(path.join(contracts, "admin-menu.ts"), "utf8"),
    ).not.toMatch(/^\s*import\s/m);
    const manifest = JSON.parse(
      fs.readFileSync(path.join(contracts, "../package.json"), "utf8"),
    );
    expect(manifest.dependencies ?? {}).toEqual({});
  });
});
