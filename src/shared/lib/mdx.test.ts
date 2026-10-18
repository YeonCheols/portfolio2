import fs from "fs";
import path from "path";
import matter from "gray-matter";

import { getMdxFileCount, loadMdxFiles } from "@/shared/lib/mdx";

jest.mock("fs");
jest.mock("gray-matter");

const existsSync = fs.existsSync as jest.Mock;
const readdirSync = fs.readdirSync as jest.Mock;
const readFileSync = fs.readFileSync as jest.Mock;
const mockedMatter = matter as unknown as jest.Mock;

describe("loadMdxFiles", () => {
  const dirPath = path.join(process.cwd(), "src", "contents", "learn", "react");

  it("디렉터리가 없으면 빈 배열을 반환한다", () => {
    existsSync.mockReturnValue(false);

    expect(loadMdxFiles("react")).toEqual([]);
    expect(existsSync).toHaveBeenCalledWith(dirPath);
    expect(readdirSync).not.toHaveBeenCalled();
  });

  it("파일이 있으면 front matter와 slug를 반환한다", () => {
    existsSync.mockReturnValue(true);
    readdirSync.mockReturnValue(["one.mdx", "notes.txt"]);
    readFileSync.mockImplementation((filePath: string) => {
      if (String(filePath).endsWith("one.mdx")) {
        return "---\ntitle: One\n---\n# One";
      }
      return "plain";
    });
    mockedMatter.mockImplementation((source: string) => {
      if (source.includes("One")) {
        return { content: "# One", data: { title: "One" } };
      }
      return { content: "plain", data: { title: "Notes" } };
    });

    expect(loadMdxFiles("react")).toEqual([
      {
        slug: "one",
        frontMatter: { title: "One" },
        content: "# One",
      },
      {
        slug: "notes.txt",
        frontMatter: { title: "Notes" },
        content: "plain",
      },
    ]);
    expect(readFileSync).toHaveBeenCalledWith(
      path.join(dirPath, "one.mdx"),
      "utf-8",
    );
    expect(mockedMatter).toHaveBeenCalledWith("---\ntitle: One\n---\n# One");
  });
});

describe("getMdxFileCount", () => {
  it("mdx가 아닌 파일은 개수에서 제외한다", () => {
    readdirSync.mockReturnValue(["a.mdx", "b.MDX", "readme.md", "c.mdx"]);

    expect(getMdxFileCount("react")).toBe(2);
    expect(readdirSync).toHaveBeenCalledWith(
      path.join(process.cwd(), "src", "contents", "learn", "react"),
    );
  });

  it("디렉터리를 읽지 못하면 예외를 전파한다", () => {
    readdirSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });

    expect(() => getMdxFileCount("missing")).toThrow("ENOENT");
  });
});
