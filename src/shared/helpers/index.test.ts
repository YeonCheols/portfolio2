import {
  calculateReadingTime,
  formatBlogSlug,
  formatDate,
  formatExcerpt,
  groupContentByChapter,
  parseUrl,
  removeHtmlTags,
} from "@/shared/helpers";
import { MdxFileContentProps } from "@/shared/types/learn";

const content = (
  slug: string,
  chapterId?: number,
  chapterTitle?: string,
): MdxFileContentProps => ({
  slug,
  content: `${slug} 본문`,
  frontMatter: {
    id: 1,
    title: slug,
    category: "react",
    created_at: "2024-01-01",
    updated_at: "2024-01-02",
    is_playground: false,
    is_comment: false,
    chapter_id: chapterId,
    chapter_title: chapterTitle,
  },
});

describe("formatBlogSlug", () => {
  it("slug가 있으면 끝 다섯 글자를 잘라 반환한다", () => {
    expect(formatBlogSlug("my-post.mdx")).toBe("my-pos");
  });

  it("slug가 없으면 undefined를 반환한다", () => {
    expect(formatBlogSlug(undefined as unknown as string)).toBeUndefined();
  });
});

describe("formatDate", () => {
  it("날짜가 비어 있으면 빈 문자열을 반환한다", () => {
    expect(formatDate("")).toBe("");
  });

  it("날짜를 넘기면 자카르타 시간대의 기본 형식으로 반환한다", () => {
    expect(formatDate("2020-01-01T20:30:00.000Z")).toBe("January 02, 2020");
  });

  it("형식을 지정하면 그 패턴으로 반환한다", () => {
    expect(formatDate("2020-01-01T20:30:00.000Z", "yyyy/MM/dd HH:mm")).toBe(
      "2020/01/02 03:30",
    );
  });
});

describe("groupContentByChapter", () => {
  it("챕터 정보가 없으면 ungrouped로 묶는다", () => {
    const grouped = groupContentByChapter([content("intro")]);

    expect(grouped["0"]).toMatchObject({
      chapter_id: 0,
      chapter_title: "ungrouped",
    });
    expect(grouped["0"].contents).toHaveLength(1);
  });

  it("같은 챕터면 처음 제목을 유지하고 내용을 추가한다", () => {
    const grouped = groupContentByChapter([
      content("one", 2, "상태"),
      content("two", 2, "다른 제목"),
    ]);

    expect(grouped["2"].chapter_title).toBe("상태");
    expect(grouped["2"].contents.map((item) => item.slug)).toEqual([
      "one",
      "two",
    ]);
  });

  it("다른 챕터면 그룹을 나눠 반환한다", () => {
    const grouped = groupContentByChapter([
      content("one", 1, "첫째"),
      content("two", 3, "셋째"),
    ]);

    expect(Object.keys(grouped)).toEqual(["1", "3"]);
    expect(grouped["1"].contents).toHaveLength(1);
    expect(grouped["3"].chapter_title).toBe("셋째");
  });
});

describe("parseUrl", () => {
  it("경로를 나누면 세 번째와 네 번째 조각을 반환한다", () => {
    expect(parseUrl("/learn/react/hooks")).toEqual({
      parentSlug: "react",
      contentSlug: "hooks",
    });
  });

  it("조각이 부족하면 slug를 undefined로 반환한다", () => {
    expect(parseUrl("/learn")).toEqual({
      parentSlug: undefined,
      contentSlug: undefined,
    });
  });
});

describe("removeHtmlTags", () => {
  it("HTML이 있으면 태그 없는 텍스트를 반환한다", () => {
    expect(removeHtmlTags("<p>안녕 <strong>세계</strong></p>")).toBe(
      "안녕 세계",
    );
  });

  it("DOMParser가 없으면 HTML 원문을 반환한다", () => {
    const original = global.DOMParser;
    // @ts-expect-error 브라우저 분기를 재현한다
    delete global.DOMParser;

    expect(removeHtmlTags("<p>그대로</p>")).toBe("<p>그대로</p>");

    global.DOMParser = original;
  });
});

describe("formatExcerpt", () => {
  it("본문이 최대 길이 이하면 태그를 지운 원문을 반환한다", () => {
    expect(formatExcerpt("<p>짧은 문장</p>", 100)).toBe("짧은 문장");
  });

  it("본문이 최대 길이보다 길면 단어 경계에서 자르고 말줄임표를 붙인다", () => {
    expect(formatExcerpt("abcdef ghijk", 8)).toBe("abcdef...");
    expect(formatExcerpt("abcdefghijk", 5)).toBe("abcde...");
  });
});

describe("calculateReadingTime", () => {
  it("단어 수를 분당 읽기 속도로 나눠 올림한다", () => {
    expect(calculateReadingTime("one two three four five six", 5)).toBe(2);
    expect(calculateReadingTime("one two three four", 2)).toBe(2);
  });

  it("본문이 길면 발췌 길이만큼만 잘라 읽는 시간을 계산한다", () => {
    expect(calculateReadingTime("word ".repeat(30))).toBe(4);
  });
});
