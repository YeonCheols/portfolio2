// 조회 중임을 동그란 표시로 알린다. 문구는 보이지 않게 두고 보조 기술에만 읽힌다
export const LoadingSpinner = ({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) => (
  <div
    role="status"
    aria-live="polite"
    data-testid="loading-spinner"
    className={className}
  >
    <span className="sr-only">{label}</span>
    <div
      aria-hidden="true"
      className="size-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600 motion-reduce:animate-none"
    />
  </div>
);
