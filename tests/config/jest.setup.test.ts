import "../../jest.setup";

describe("jest.setup", () => {
  it("ResizeObserver를 빈 구현으로 둔다", () => {
    const observer = new ResizeObserver(() => undefined);

    expect(() => observer.observe(document.body)).not.toThrow();
    expect(() => observer.unobserve(document.body)).not.toThrow();
    expect(() => observer.disconnect()).not.toThrow();
  });

  it("matchMedia는 일치하지 않는 미디어 쿼리를 반환한다", () => {
    const media = window.matchMedia("(min-width: 1024px)");

    expect(media.matches).toBe(false);
    expect(media.media).toBe("(min-width: 1024px)");
    expect(media.onchange).toBeNull();
    expect(media.addListener(() => undefined)).toBeUndefined();
    expect(media.removeListener(() => undefined)).toBeUndefined();
    expect(media.addEventListener("change", () => undefined)).toBeUndefined();
    expect(
      media.removeEventListener("change", () => undefined),
    ).toBeUndefined();
    expect(media.dispatchEvent(new Event("change"))).toBe(false);
  });
});
