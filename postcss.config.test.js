const postcss = require("./postcss.config");

describe("postcss.config", () => {
  it("tailwind와 autoprefixer 플러그인을 둔다", () => {
    expect(Object.keys(postcss.plugins)).toEqual([
      "tailwindcss",
      "autoprefixer",
    ]);
  });
});
