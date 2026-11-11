import fs from "fs";
import path from "path";

const compose = fs.readFileSync(
  path.join(__dirname, "../../docker-compose.yml"),
  "utf8",
);

describe("로컬 Docker 개발 서버", () => {
  it("소스 디렉터리를 마운트하고 변경 감지를 polling으로 활성화한다", () => {
    expect(compose).toContain("./src:/app/src:delegated");
    expect(compose).toContain("./public:/app/public:delegated");
    expect(compose).toContain("./docs:/app/docs:delegated");
    expect(compose).toContain("WATCHPACK_POLLING=true");
  });
});
