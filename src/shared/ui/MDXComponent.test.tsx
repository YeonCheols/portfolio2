import { render, screen } from "@testing-library/react";
import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

import MDXComponent from "@/shared/ui/MDXComponent";

jest.mock("remark-gfm", () => ({
  __esModule: true,
  default: function remarkGfm() {
    return undefined;
  },
}));

jest.mock("rehype-slug", () => ({
  __esModule: true,
  default: function rehypeSlug() {
    return undefined;
  },
}));

jest.mock("react-markdown", () => {
  const ReactRuntime = require("react") as typeof React;

  type MarkdownProps = {
    children?: string;
    components?: Record<string, React.ElementType>;
    remarkPlugins?: unknown[];
    rehypePlugins?: unknown[];
  };

  const splitCells = (row: string) =>
    row
      .split("|")
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0);

  const Markdown = ({
    children,
    components = {},
    remarkPlugins,
    rehypePlugins,
  }: MarkdownProps) => {
    Markdown.lastProps = { remarkPlugins, rehypePlugins };
    const source = String(children ?? "");
    if (!source.trim()) {
      return null;
    }

    if (source.startsWith("### ")) {
      return ReactRuntime.createElement(
        components.h3 ?? "h3",
        null,
        source.slice(4),
      );
    }

    if (source.startsWith("## ")) {
      return ReactRuntime.createElement(
        components.h2 ?? "h2",
        null,
        source.slice(3),
      );
    }

    if (source.startsWith("> ")) {
      return ReactRuntime.createElement(
        components.blockquote ?? "blockquote",
        null,
        source.slice(2),
      );
    }

    if (source.startsWith("- ")) {
      const items = source
        .split("\n")
        .filter((line) => line.startsWith("- "))
        .map((line) => line.slice(2));
      return ReactRuntime.createElement(
        components.ul ?? "ul",
        { ordered: false },
        items.map((item) =>
          ReactRuntime.createElement("li", { key: item }, item),
        ),
      );
    }

    if (source.startsWith("1. ")) {
      const items = source
        .split("\n")
        .filter((line) => /^\d+\. /.test(line))
        .map((line) => line.replace(/^\d+\. /, ""));
      return ReactRuntime.createElement(
        components.ol ?? "ol",
        { ordered: true },
        items.map((item) =>
          ReactRuntime.createElement("li", { key: item }, item),
        ),
      );
    }

    if (source.startsWith("|")) {
      const rows = source.split("\n").filter((line) => line.startsWith("|"));
      const headers = splitCells(rows[0] ?? "");
      const body = splitCells(rows[2] ?? "");
      return ReactRuntime.createElement(
        components.table ?? "table",
        null,
        ReactRuntime.createElement(
          "thead",
          null,
          ReactRuntime.createElement(
            "tr",
            null,
            headers.map((cell) =>
              ReactRuntime.createElement(
                components.th ?? "th",
                { key: cell, isHeader: true },
                cell,
              ),
            ),
          ),
        ),
        ReactRuntime.createElement(
          "tbody",
          null,
          ReactRuntime.createElement(
            "tr",
            null,
            body.map((cell) =>
              ReactRuntime.createElement(
                components.td ?? "td",
                { key: cell, isHeader: false },
                cell,
              ),
            ),
          ),
        ),
      );
    }

    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(source);
    if (link) {
      return ReactRuntime.createElement(
        components.p ?? "p",
        null,
        ReactRuntime.createElement(
          components.a ?? "a",
          { href: link[2] },
          link[1],
        ),
      );
    }

    const code = /^`([^`]+)`$/.exec(source);
    if (code) {
      return ReactRuntime.createElement(
        components.p ?? "p",
        null,
        ReactRuntime.createElement(
          components.code ?? "code",
          { inline: true },
          code[1],
        ),
      );
    }

    return ReactRuntime.createElement(components.p ?? "p", null, source);
  };

  Markdown.lastProps = {
    remarkPlugins: undefined as unknown[] | undefined,
    rehypePlugins: undefined as unknown[] | undefined,
  };

  return Markdown;
});

const markdownMock = ReactMarkdown as typeof ReactMarkdown & {
  lastProps: {
    remarkPlugins?: unknown[];
    rehypePlugins?: unknown[];
  };
};

describe("MDXComponent", () => {
  it("제목을 넘기면 제목을 보여 준다", () => {
    render(<MDXComponent>{"## 섹션 제목"}</MDXComponent>);

    expect(
      screen.getByRole("heading", { level: 2, name: "섹션 제목" }),
    ).toBeInTheDocument();
    expect(markdownMock.lastProps.remarkPlugins).toEqual([remarkGfm]);
    expect(markdownMock.lastProps.rehypePlugins).toEqual([rehypeSlug]);
  });

  it("소제목을 넘기면 소제목을 보여 준다", () => {
    render(<MDXComponent>{"### 소제목"}</MDXComponent>);

    expect(
      screen.getByRole("heading", { level: 3, name: "소제목" }),
    ).toBeInTheDocument();
  });

  it("본문을 넘기면 문단을 보여 준다", () => {
    render(<MDXComponent>{"본문입니다"}</MDXComponent>);

    expect(screen.getByText("본문입니다").tagName).toBe("DIV");
  });

  it("링크를 넘기면 링크를 보여 준다", () => {
    render(<MDXComponent>{"[문서](https://example.com/docs)"}</MDXComponent>);

    expect(screen.getByRole("link", { name: "문서" })).toHaveAttribute(
      "href",
      "https://example.com/docs",
    );
  });

  it("목록을 넘기면 항목을 보여 준다", () => {
    render(<MDXComponent>{"- 첫째\n- 둘째"}</MDXComponent>);

    const list = screen.getByRole("list");
    expect(list.tagName).toBe("UL");
    expect(list).not.toHaveAttribute("ordered");
    expect(screen.getByText("첫째")).toBeInTheDocument();
    expect(screen.getByText("둘째")).toBeInTheDocument();
  });

  it("순서 목록을 넘기면 순서 있는 목록을 보여 준다", () => {
    render(<MDXComponent>{"1. 하나\n2. 둘"}</MDXComponent>);

    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
    expect(list).not.toHaveAttribute("ordered");
    expect(screen.getByText("하나")).toBeInTheDocument();
  });

  it("인용을 넘기면 인용문을 보여 준다", () => {
    render(<MDXComponent>{"> 인용문"}</MDXComponent>);

    expect(screen.getByText("인용문").tagName).toBe("BLOCKQUOTE");
  });

  it("표를 넘기면 셀을 보여 준다", () => {
    render(
      <MDXComponent>
        {"| 이름 | 값 |\n| --- | --- |\n| 가 | 나 |"}
      </MDXComponent>,
    );

    const table = screen.getByRole("table");
    expect(table.parentElement?.tagName).toBe("DIV");
    expect(
      screen.getByRole("columnheader", { name: "이름" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "나" })).toBeInTheDocument();
  });

  it("인라인 코드를 넘기면 코드를 보여 준다", async () => {
    render(<MDXComponent>{"`const a = 1`"}</MDXComponent>);

    expect(await screen.findByText("const a = 1")).toBeInTheDocument();
  });

  it("내용이 비어 있으면 본문을 보여 주지 않는다", () => {
    render(<MDXComponent>{""}</MDXComponent>);

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
