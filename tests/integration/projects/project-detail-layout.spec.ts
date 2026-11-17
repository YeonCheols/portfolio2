import { expect, test } from "@playwright/test";

test("프로젝트 상세는 모든 폭에서 메뉴 자리 없이 Back으로 시작한다", async ({
  page,
}) => {
  for (const width of [390, 768, 820, 821, 1023, 1024, 1180, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/projects/albamon-msa");

    const back = page.getByRole("link", { name: "Back", exact: true });
    await expect(back).toBeVisible();
    await expect(back).toHaveAttribute("href", "/");
    await expect(page.getByRole("banner")).toHaveCount(0);
    await expect(page.locator("#sidebar")).toHaveCount(0);
    await expect(
      page.getByRole("navigation", { name: "프로젝트 목차" }),
    ).toBeVisible();
    await expect
      .poll(async () => (await back.boundingBox())?.y)
      .toBeLessThanOrEqual(40);

    const geometry = await page.locator("main").evaluate((main) => ({
      width: main.getBoundingClientRect().width,
      parentWidth: main.parentElement!.getBoundingClientRect().width,
      overflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    }));
    expect(geometry.width).toBeCloseTo(geometry.parentWidth, 0);
    expect(geometry.width).toBeLessThanOrEqual(1152);
    expect(geometry.overflow).toBe(false);
  }
});
