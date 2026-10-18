const tailwind = require("./tailwind.config");

describe("tailwind.config", () => {
  it("클래스 다크 모드와 소스 경로와 색을 둔다", () => {
    expect(tailwind.darkMode).toBe("class");
    expect(tailwind.content).toEqual(["./src/**/*.{js,ts,jsx,tsx}"]);
    expect(tailwind.theme.extend.colors.dark).toBe("#121212");
    expect(tailwind.theme.extend.colors.light).toBe("#fafafa");
  });

  it("손 흔들기와 루프 애니메이션을 둔다", () => {
    expect(tailwind.theme.extend.keyframes.wave["10%"]).toEqual({
      transform: "rotate(14deg)",
    });
    expect(tailwind.theme.extend.keyframes.loop["100%"]).toEqual({
      transform: "translateX(-50%)",
    });
    expect(tailwind.theme.extend.animation["waving-hand"]).toBe(
      "wave 2s linear infinite",
    );
    expect(tailwind.theme.extend.animation["looping-tag"]).toBe(
      "loop 100s linear infinite",
    );
    expect(tailwind.plugins).toHaveLength(1);
  });
});
