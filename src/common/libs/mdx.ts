import fs from "fs";
import matter from "gray-matter";
import path from "path";
// import unified from "unified";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
interface MdxFileProps {
  slug: string;
  frontMatter: Record<string, unknown>;
  content: string;
}

var unified = require("unified");

export const loadMdxFiles = (slug: string): MdxFileProps[] => {
  const dirPath = path.join(process.cwd(), "src", "contents", "learn", slug);

  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const files = fs.readdirSync(dirPath);

  console.log("files : ", files);

  const contents = files.map((file) => {
    const filePath = path.join(dirPath, file);
    const source = fs.readFileSync(filePath, "utf-8");
    const { content, data } = matter(source);

    // const mdxCompiler = unified()
    //   .use(remarkParse)
    //   .use(remarkGfm as any)
    //   .use(remarkMdx);

    const mdxContent = content.toString();

    return {
      slug: file.replace(".mdx", ""),
      frontMatter: data,
      content: mdxContent,
    };
  });

  return contents;
};

export const getMdxFileCount = (slug: string) => {
  const dirPath = path.join(process.cwd(), "src", "contents", "learn", slug);
  const files = fs.readdirSync(dirPath);
  const mdxFiles = files.filter((file) => file.endsWith(".mdx"));
  return mdxFiles.length;
};
