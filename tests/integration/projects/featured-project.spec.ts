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
