import fs from "fs";
import path from "path";

describe("image workflow", () => {
  it("PR용 Image 워크플로가 없다", () => {
    expect(
      fs.existsSync(path.join(__dirname, ".github/workflows/image.yml")),
    ).toBe(false);
  });
});
