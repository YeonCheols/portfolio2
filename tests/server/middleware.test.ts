jest.mock("next/server", () => ({
  NextResponse: {
    next: () => {
      const headers = new Map<string, string>();

      return {
        headers: {
          set: (key: string, value: string) => {
            headers.set(key, value);
          },
          get: (key: string) => headers.get(key) ?? null,
        },
      };
    },
  },
}));

import { middleware } from "../../middleware";

describe("middleware", () => {
  it("요청을 통과시키면서 CORS 헤더를 붙인다", () => {
    const response = middleware(undefined as never);

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
      "Content-Type, Authorization",
    );
  });
});
