import seo from "../../next-seo.config";

describe("next-seo.config", () => {
  it("사이트 제목과 정규 URL과 오픈그래프 이미지를 둔다", () => {
    expect(seo.defaultTitle).toBe("연철s - 포트폴리오");
    expect(seo.canonical).toBe("https://www.ycseng.com");
    expect(seo.description).toContain("알기 쉬운 코드");
    expect(seo.openGraph.site_name).toBe("www.ycseng.com");
    expect(seo.openGraph.type).toBe("website");
    expect(seo.openGraph.images.map((image) => image.width)).toEqual([
      800, 1200, 1600,
    ]);
    expect(seo.openGraph.images[0].alt).toBe("연철s - 포트폴리오");
  });
});
