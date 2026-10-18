const sitemap = require("./next-sitemap.config");

describe("next-sitemap.config", () => {
  it("사이트 URL로 robots.txt를 만들게 둔다", () => {
    expect(sitemap.siteUrl).toBe("https://www.ycseng.com");
    expect(sitemap.generateRobotsTxt).toBe(true);
  });
});
