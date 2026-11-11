import { expect, test } from "@playwright/test";

test("대표 프로젝트는 직접 열 수 있고 기존 프로젝트 역할 절로 이동한다", async ({
  page,
}) => {
  const response = await page.goto("/projects/albamon-msa", {
    waitUntil: "domcontentloaded",
  });

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(
    "연철s - 알바몬 서비스 MSA 전환 및 React 마이그레이션",
  );
  await expect(
    page.getByRole("heading", {
      name: "알바몬 서비스 MSA 전환 및 React 마이그레이션",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/외주 개발자를 포함해 약 100명의 개발자가 참여/),
  ).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://www.ycseng.com/projects/albamon-msa",
  );

  await page
    .getByRole("link", { name: "기존 알바몬 프로젝트 상세의 역할 소개" })
    .click();

  await expect(page.locator('[id="41-역할-비즈니스-관점"]')).toBeVisible();
});

test("모바일과 데스크톱 화면에서 가로 넘침이 없다", async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/projects/albamon-msa", {
      waitUntil: "domcontentloaded",
    });

    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.clientWidth,
      contentWidth: document.documentElement.scrollWidth,
    }));

    expect(dimensions.contentWidth).toBeLessThanOrEqual(
      dimensions.documentWidth,
    );
  }
});

test("목차 링크를 키보드로 이동하고 실행할 수 있다", async ({ page }) => {
  await page.goto("/projects/albamon-msa", {
    waitUntil: "domcontentloaded",
  });

  const toc = page.getByRole("navigation", { name: "프로젝트 목차" });
  const firstLink = toc.getByRole("link").nth(0);
  const secondLink = toc.getByRole("link").nth(1);

  await firstLink.focus();
  await page.keyboard.press("Tab");
  await expect(secondLink).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/#workflows$/);
  await expect(
    page.getByRole("heading", {
      name: "이력서와 지원자 흐름을 React로 옮기다",
    }),
  ).toBeVisible();
});
