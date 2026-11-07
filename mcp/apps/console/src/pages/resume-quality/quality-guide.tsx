import {
  metricInfo,
  metricLabel,
  metricDescription,
  outcomeTerms,
} from "./quality-glossary";

// 처음 보는 개발자도 이 화면의 숫자를 읽을 수 있도록 용어를 먼저 풀어 쓴다
export const QualityGuide = () => (
  <section
    aria-labelledby="quality-guide-title"
    className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5"
  >
    <h2 id="quality-guide-title" className="text-base font-bold text-slate-900">
      이 화면은 무엇인가요?
    </h2>
    <p className="mt-2 text-sm leading-relaxed text-slate-700">
      AI가 만든 이력서를 PDF로 바꾼 뒤, 7가지 기준으로 하나씩 검사한 결과입니다.
      검사 하나를 &lsquo;검사 건&rsquo;이라고 부르고, 검사 건마다 통과·실패·검토
      대기·측정 실패 중 하나로 판정합니다.
    </p>
    <ul
      aria-label="용어 설명"
      className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2"
    >
      {outcomeTerms.map((entry) => (
        <li key={entry.term} className="text-slate-700">
          <strong className="font-bold text-slate-900">{entry.term}</strong>
          <span className="ml-2 text-slate-600">{entry.meaning}</span>
        </li>
      ))}
    </ul>
  </section>
);

export const MetricGuide = () => (
  <section
    aria-labelledby="metric-guide-title"
    className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"
  >
    <h2 id="metric-guide-title" className="text-base font-bold text-slate-900">
      지표 설명
    </h2>
    <p className="mt-1 text-sm text-slate-600">
      각 지표는 PDF의 서로 다른 면을 검사합니다. 코드의 지표 ID도 함께
      적었습니다.
    </p>
    <ul aria-label="지표 목록" className="mt-4 grid gap-3 sm:grid-cols-2">
      {Object.keys(metricInfo).map((metricId) => (
        <li
          key={metricId}
          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
          <p className="text-sm font-bold text-slate-900">
            {metricLabel(metricId)}
            <code className="ml-2 font-mono text-xs font-normal text-slate-500">
              {metricId}
            </code>
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            {metricDescription(metricId)}
          </p>
        </li>
      ))}
    </ul>
  </section>
);
