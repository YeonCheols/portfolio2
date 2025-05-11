import Link from "next/link";
import { BsArrowRightShort as ViewAllIcon } from "react-icons/bs";

import SectionHeading from "@/common/components/elements/SectionHeading";
import SectionSubHeading from "@/common/components/elements/SectionSubHeading";

import BlogCarousel from "./BlogCarousel";

const ProjectPreview = () => {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeading title="최신 글" className="ml-1" />
        <SectionSubHeading>
          <Link href="/blog">
            <div className="mt-1 flex cursor-pointer gap-1 text-sm text-neutral-700 transition-all duration-300 hover:gap-3 hover:text-neutral-700 dark:text-neutral-400 hover:dark:text-neutral-300">
              <div className="flex">
                최신 프로젝트
                <span className="ml-1 hidden sm:block">더보기 </span>
              </div>
              <ViewAllIcon size={22} />
            </div>
          </Link>
        </SectionSubHeading>
      </div>
      <BlogCarousel />
    </section>
  );
};

export default ProjectPreview;
