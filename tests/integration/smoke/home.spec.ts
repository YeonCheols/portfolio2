import { expect, test } from "@playwright/test";

test("홈을 열면 소개 제목과 본문이 보인다", async ({ page }) => {
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });

  expect(response?.ok()).toBeTruthy();
  await expect(page.locator("body")).not.toContainText("Something went wrong");
  await expect(page.locator("h1")).toContainText(
    "안녕하세요, 프론트엔드 개발자 성연철입니다",
  );
  await expect(page.locator("body")).toContainText(
    "누구나 자유롭게 개발을 이어갈 수 있는 환경을 좋아합니다",
  );
});
