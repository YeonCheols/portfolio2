import { expect, test } from "@playwright/test";

test("홈을 열면 소개 제목과 본문이 보인다", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.ok()).toBeTruthy();
  await expect(
    page.getByRole("heading", {
      name: "안녕하세요, 프론트엔드 개발자 성연철입니다",
    }),
  ).toBeVisible();
});
