import { renderAdminConnectPage, renderAdminPage } from "@mcp/auth/adminPages";

describe("MCP 관리자 페이지", () => {
  it("GitHub OAuth 로그인 페이지를 렌더링하고 입력값을 이스케이프한다", () => {
    const page = renderAdminConnectPage(
      '<script>alert("bad")</script> & GitHub 계정으로 연결하세요.',
    );

    expect(page).toContain("AI 모델 설정");
    expect(page).toContain('action="/admin/ai-models/oauth/start"');
    expect(page).toContain("GitHub로 로그인");
    expect(page).not.toContain('name="email"');
    expect(page).not.toContain('name="password"');
    expect(page).toContain('href="/admin/ai-models/assets/admin.css"');
    expect(page).toContain("bg-[#f6f8fa]");
    expect(page).toContain("GitHub 계정으로 계속하기");
    expect(page).toContain(
      "&lt;script&gt;alert(&quot;bad&quot;)&lt;/script&gt; &amp; GitHub 계정으로 연결하세요.",
    );
  });

  it("개발·운영 환경 설정을 보여주는 관리 페이지를 렌더링한다", () => {
    const page = renderAdminPage();

    expect(page).toContain("AI 모델 설정");
    expect(page).toContain("개발 환경");
    expect(page).toContain("운영 환경");
    expect(page).toContain('action="/admin/ai-models/logout"');
    expect(page).toContain('href="/admin/ai-models/assets/admin.css"');
    expect(page).toContain("GitHub OAuth 인증 완료");
    expect(page).not.toContain("GitHub 인증 완료");
    expect(page).toContain('id="model-settings"');
    expect(page).toContain('src="/admin/ai-models/assets/admin-ai-models.js"');
    expect(page).toContain('id="setting-form"');
    expect(page).not.toContain("아직 연결되지 않았습니다.");
  });
});
