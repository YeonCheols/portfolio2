import { NavigationProgress } from "../ui/navigation-progress";

type LoginPageProps = {
  error: string | null;
  // 로그인 전에 가려던 화면 경로. 허용 여부는 서버가 다시 검증한다
  next?: string | null;
};

const githubMark =
  "M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.1c-3.1.67-3.76-1.32-3.76-1.32-.5-1.29-1.23-1.63-1.23-1.63-1.01-.7.08-.69.08-.69 1.12.08 1.71 1.15 1.71 1.15.99 1.7 2.6 1.21 3.23.92.1-.72.39-1.21.7-1.49-2.47-.28-5.07-1.24-5.07-5.5 0-1.22.44-2.21 1.15-2.99-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.06 1.14a10.65 10.65 0 0 1 5.57 0c2.12-1.44 3.06-1.14 3.06-1.14.61 1.54.23 2.68.11 2.96.72.78 1.15 1.77 1.15 2.99 0 4.27-2.6 5.21-5.08 5.48.4.34.76 1.02.76 2.06v3.12c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z";

export const LoginPage = ({ error, next }: LoginPageProps) => (
  <div className="min-h-screen bg-[#f6f8fa] font-sans text-[#1f2328]">
    <NavigationProgress />
    <header className="mx-auto flex max-w-5xl justify-center px-4 pb-6 pt-12">
      <a
        className="flex items-center gap-3 text-lg font-semibold tracking-tight"
        href="/admin/ai-models/connect"
        aria-label="Portfolio MCP 로그인"
      >
        <svg
          aria-hidden="true"
          className="size-9 text-[#1f2328]"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d={githubMark} />
        </svg>
        <span>PORTFOLIO MCP</span>
      </a>
    </header>
    <main className="mx-auto w-full max-w-[340px] px-4 pb-12 pt-3">
      <h1 className="mb-5 text-center text-2xl font-light tracking-tight">
        MCP 관리자 로그인
      </h1>
      <section className="rounded-md border border-[#d1d9e0] bg-white p-5 shadow-sm">
        <p className="mb-4 text-sm font-semibold">GitHub 계정으로 계속하기</p>
        <form
          action={`/admin/ai-models/oauth/start${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          method="post"
        >
          <button
            type="submit"
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-[#1f2328] bg-[#1f2328] px-4 text-sm font-semibold text-white hover:bg-[#32383f] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:ring-offset-2"
          >
            <svg
              aria-hidden="true"
              className="size-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d={githubMark} />
            </svg>
            GitHub로 로그인
          </button>
        </form>
        <p className="mt-4 text-xs leading-5 text-[#59636e]">
          운영 DB에 GitHub 계정이 연결된 사용자만 관리자 화면에 접근할 수
          있습니다.
        </p>
        {error === "login_failed" && (
          <p
            role="alert"
            className="mt-4 border-t border-[#d8dee4] pt-4 text-sm text-[#cf222e]"
          >
            로그인에 실패했습니다. 계정 정보를 확인해 주세요.
          </p>
        )}
      </section>
      <p className="mt-5 text-center text-xs leading-5 text-[#59636e]">
        로그인하면 portfolio-api에서 계정 연결과 접근 권한을 확인합니다.
      </p>
    </main>
  </div>
);
