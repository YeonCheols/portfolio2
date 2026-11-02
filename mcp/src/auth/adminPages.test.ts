import { renderAdminConnectPage, renderAdminPage } from "@mcp/auth/adminPages";

describe("MCP 관리자 페이지", () => {
  it("portfolio-api 관리자 로그인 페이지를 렌더링하고 입력값을 이스케이프한다", () => {
    const page = renderAdminConnectPage(
      '<script>alert("bad")</script> & 관리자 계정으로 연결하세요.',
    );

    expect(page).toContain("AI 모델 설정");
    expect(page).toContain('action="/admin/ai-models/login"');
    expect(page).toContain('name="email"');
    expect(page).toContain('name="password"');
    expect(page).toContain('href="/admin/ai-models/assets/admin.css"');
    expect(page).toContain("bg-slate-50");
    expect(page).toContain(
      "&lt;script&gt;alert(&quot;bad&quot;)&lt;/script&gt; &amp; 관리자 계정으로 연결하세요.",
    );
  });

  it("개발·운영 환경 설정을 보여주는 관리 페이지를 렌더링한다", () => {
    const page = renderAdminPage();

    expect(page).toContain("AI LLM 관리");
    expect(page).toContain("개발 환경");
    expect(page).toContain("운영 환경");
    expect(page).toContain('action="/admin/ai-models/logout"');
    expect(page).toContain('href="/admin/ai-models/assets/admin.css"');
    expect(page).toContain("portfolio-api 관리자 인증 완료");
    expect(page).not.toContain("GitHub 인증 완료");
    expect(page).toContain(
      "관리 화면의 설정 조회와 변경 조작은 아직 연결되지 않았습니다.",
    );
  });
});
