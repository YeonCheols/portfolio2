import Image from "next/image";
import Link from "next/link";

import { FEATURED_PROJECT } from "../model/featuredProject";

const FeaturedProjectDetail = () => (
  <article className="space-y-9">
    <Image
      src={FEATURED_PROJECT.thumbnail}
      alt="알바몬 서비스의 모듈형 전환을 표현한 MSA 썸네일"
      width={1752}
      height={897}
      sizes="(max-width: 1024px) 100vw, 900px"
      className="max-h-[32rem] w-full rounded-xl border border-neutral-200 object-cover dark:border-neutral-800"
      priority
    />

    <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
      <span>진행 기간 {FEATURED_PROJECT.period}</span>
      <span aria-hidden="true">·</span>
      <span>MSA</span>
      <span aria-hidden="true">·</span>
      <span>React</span>
      <a
        href={FEATURED_PROJECT.serviceUrl}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-teal-700 hover:text-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-500 dark:text-teal-400 dark:hover:text-teal-300"
      >
        알바몬 서비스 보기
      </a>
    </div>

    <section
      aria-labelledby="technology-stack-heading"
      className="space-y-3 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800 sm:p-6"
    >
      <h2
        id="technology-stack-heading"
        className="text-lg font-semibold text-neutral-800 dark:text-neutral-100"
      >
        기술 스택
      </h2>
      <ul aria-label="기술 스택" className="flex flex-wrap gap-2">
        {FEATURED_PROJECT.technologies.map((technology) => (
          <li
            key={technology}
            className="rounded-full bg-neutral-100 px-3 py-1.5 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
          >
            {technology}
          </li>
        ))}
      </ul>
    </section>

    <nav
      aria-label="프로젝트 목차"
      className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-800 sm:p-6"
    >
      <h2 className="mb-4 text-lg font-semibold text-neutral-800 dark:text-neutral-100">
        목차
      </h2>
      <ol className="grid gap-2 sm:grid-cols-2">
        {FEATURED_PROJECT.sections.map((section, index) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="flex items-start gap-3 rounded-lg px-3 py-2 text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-teal-300"
            >
              <span className="font-mono text-sm text-teal-700 dark:text-teal-400">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{section.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>

    <div className="space-y-10">
      {FEATURED_PROJECT.sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          aria-labelledby={`${section.id}-heading`}
          className="scroll-mt-24 space-y-4"
        >
          <h2
            id={`${section.id}-heading`}
            className="border-b border-dashed border-neutral-600 pb-3 text-xl font-medium text-neutral-800 dark:text-neutral-100"
          >
            {section.title}
          </h2>
          <div className="max-w-4xl space-y-4 text-base leading-8 text-neutral-700 dark:text-neutral-300">
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {"relatedLink" in section && (
              <p>
                {section.relatedLink.before}
                <Link
                  href={section.relatedLink.href}
                  className="font-medium text-teal-700 underline decoration-teal-500/50 underline-offset-4 hover:text-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-500 dark:text-teal-400 dark:hover:text-teal-300"
                >
                  {section.relatedLink.label}
                </Link>
                {section.relatedLink.after}
              </p>
            )}
          </div>
        </section>
      ))}
    </div>
  </article>
);

export default FeaturedProjectDetail;
