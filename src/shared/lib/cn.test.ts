import cn from "@/shared/lib/cn";

describe("cn", () => {
  it("falsy 값은 클래스 문자열에서 뺀다", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });

  it("같은 Tailwind 유틸은 마지막 값만 남긴다", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
