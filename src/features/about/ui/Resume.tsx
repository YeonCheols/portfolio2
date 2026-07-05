import { LuDownload as DownloadIcon } from "react-icons/lu";

const Resume = () => {
  // 1. Supabase URL 끝에 ?download= 쿼리를 추가하여 브라우저 강제 다운로드를 유도합니다.
  const RESUME_URL = "/download/성연철_경력기술서.pdf";

  return (
    <div className="space-y-5">
      {/* 2. next/link 대신 일반 <a> 태그와 download 속성을 사용합니다. */}
      <a
        href={RESUME_URL}
        download="ycseng_resume.pdf" // 다운로드 시 저장될 기본 파일명 지정 (선택 사항)
        className="flex w-fit items-center gap-2 rounded-lg border border-neutral-400 px-4 py-2.5 text-sm text-neutral-600 transition-all duration-300 hover:gap-3 hover:border-neutral-500 hover:text-neutral-700 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-400 hover:dark:border-neutral-300 hover:dark:text-neutral-300"
        data-umami-event="Download Resume"
      >
        <DownloadIcon />
        <span>이력서 다운로드</span>
      </a>
    </div>
  );
};

export default Resume;
