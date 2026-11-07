import { formatRate, type QualityTotals } from "./quality-stats";

type Tile = {
  label: string;
  value: string;
  count?: number;
  description: string;
  hint?: string;
  hero?: boolean;
};

export const QualityKpiRow = ({ totals }: { totals: QualityTotals }) => {
  const rate =
    totals.denominator > 0 ? totals.passed / totals.denominator : null;
  const declared: Tile[] = [
    {
      label: "통과율",
      value: formatRate(rate),
      description: "통과 건수 ÷ 전체 검사 건수",
      hint:
        totals.denominator > 0
          ? `통과 ${totals.passed}/${totals.denominator}건`
          : undefined,
      hero: true,
    },
    {
      label: "평가 기록",
      value: `${totals.records}건`,
      count: totals.records,
      description: "이번 페이지에 포함된 이력서 생성 기록 수",
    },
    {
      label: "검토 대기",
      value: `${totals.needsReview}건`,
      count: totals.needsReview,
      description: "자동으로 판정하지 못해 사람의 확인을 기다리는 검사 건수",
    },
    {
      label: "실패",
      value: `${totals.failed}건`,
      count: totals.failed,
      description: "기준을 지키지 못한 검사 건수",
    },
    {
      label: "차단 항목",
      value: `${totals.blocking}건`,
      count: totals.blocking,
      description: "있으면 PDF 변환이 거절되는 검사 건수",
    },
  ];
  // 통과율은 대표 수치라 맨 앞에 두고, 나머지 건수 타일은 높은 수치부터 보여준다
  const [hero, ...counts] = declared;
  const tiles = [
    hero,
    ...[...counts].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)),
  ];
  return (
    <section
      aria-label="핵심 지표"
      className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
    >
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className={`rounded-2xl border border-slate-200 bg-white p-4 ${tile.hero ? "sm:col-span-2 lg:col-span-1" : ""}`}
        >
          <p className="text-xs font-semibold text-slate-500">{tile.label}</p>
          <p
            className={`mt-1 font-bold tracking-tight text-slate-900 ${tile.hero ? "text-4xl" : "text-2xl"}`}
          >
            {tile.value}
          </p>
          {tile.hint && (
            <p className="mt-1 text-xs font-semibold text-slate-600">
              {tile.hint}
            </p>
          )}
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {tile.description}
          </p>
        </div>
      ))}
    </section>
  );
};
