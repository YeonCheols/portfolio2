import Image from "next/image";
import Link from "next/link";
import { HiOutlineArrowSmRight as ViewIcon } from "react-icons/hi";

import { FEATURED_PROJECT } from "../model/featuredProject";

const FeaturedProjectSection = () => (
  <section aria-labelledby="featured-project-heading" className="space-y-5">
    <div className="border-b border-dashed border-neutral-600 pb-3">
      <h2
        id="featured-project-heading"
        className="text-2xl font-medium dark:text-neutral-200"
      >
        대표 프로젝트
      </h2>
    </div>

    <article className="grid gap-5 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-all duration-300 hover:border-teal-600/50 dark:border-neutral-800 dark:bg-neutral-900/40 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:items-center sm:p-5">
      <Link
        href="/projects/albamon-msa"
        aria-label={`${FEATURED_PROJECT.title} 상세 보기`}
        className="group relative block aspect-[16/9] overflow-hidden rounded-lg"
      >
        <Image
          src={FEATURED_PROJECT.thumbnail}
          alt="알바몬 서비스의 모듈형 전환을 표현한 MSA 썸네일"
          fill
          sizes="(max-width: 640px) 100vw, 45vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          priority
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center gap-1 rounded-lg bg-black text-sm font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-80 group-focus-visible:opacity-80"
        >
          <span>View Project</span>
          <ViewIcon size={20} />
        </div>
      </Link>

      <div className="space-y-3">
        <p className="text-sm font-medium text-teal-700 dark:text-teal-400">
          진행 기간 {FEATURED_PROJECT.period} · MSA · React
        </p>
        <h3 className="text-xl font-semibold leading-snug text-neutral-800 dark:text-neutral-100">
          {FEATURED_PROJECT.title}
        </h3>
        <p className="leading-relaxed text-neutral-600 dark:text-neutral-400">
          {FEATURED_PROJECT.summary}
        </p>
        <Link
          href="/projects/albamon-msa"
          className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-teal-700 hover:text-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-500 dark:text-teal-400 dark:hover:text-teal-300"
        >
          상세 내용 보기 <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  </section>
);

export default FeaturedProjectSection;
