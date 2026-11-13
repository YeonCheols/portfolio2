import { Tooltip as CoreTooltip } from "@yeoncheols/portfolio-core-ui";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HiOutlineArrowSmRight as ViewIcon } from "react-icons/hi";

import { ProjectResponse } from "docs/api";
import { useStacks } from "@/shared/hooks/useStacks";
import Card from "@/shared/ui/Card";
import Image from "@/shared/ui/Image";

const ProjectCard = ({
  title,
  slug,
  description,
  image,
  stacks,
}: ProjectResponse) => {
  const { StackIcons } = useStacks();

  const stacksArray: string[] = JSON.parse(stacks);
  const availableStacks = stacksArray.filter((stack) => StackIcons[stack]);
  const stackRowRef = useRef<HTMLDivElement>(null);
  const [visibleStackCount, setVisibleStackCount] = useState(0);

  useEffect(() => {
    const row = stackRowRef.current;
    if (!row) return;
    const updateCount = (width: number) => {
      setVisibleStackCount(Math.max(0, Math.floor((width + 8) / 28)));
    };
    updateCount(row.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => {
      updateCount(entry.contentRect.width);
    });
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  return (
    <Link href={`/projects/${slug}`}>
      <Card className="group relative flex h-[360px] cursor-pointer flex-col border border-neutral-200 hover:z-10 dark:border-neutral-900 lg:hover:scale-[102%]">
        <div className="relative shrink-0">
          {image.startsWith("https") && (
            <Image
              src={image}
              width={400}
              height={200}
              alt={title}
              className="h-48 rounded-t-xl object-cover object-left w-full"
            />
          )}
          <div className="absolute left-0 top-0 flex h-full w-full items-center justify-center gap-1 rounded-t-xl bg-black text-sm font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-80">
            <span>View Project</span>
            <ViewIcon size={20} />
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
          <div className="flex min-h-7 shrink-0 justify-between">
            <div className="max-h-7 overflow-hidden text-lg text-neutral-700 transition-all duration-300 dark:text-neutral-300 dark:group-hover:text-teal-400 lg:group-hover:text-teal-600">
              {title}
            </div>
          </div>
          <CoreTooltip title={description}>
            <p className="max-h-12 overflow-hidden text-sm leading-6 text-neutral-700 dark:text-neutral-400">
              {description}
            </p>
          </CoreTooltip>
          <div
            ref={stackRowRef}
            className="mt-auto flex shrink-0 items-center gap-2 pt-2"
          >
            {availableStacks.slice(0, visibleStackCount).map((stack) => {
              return (
                <div key={stack} className="h-5 w-5 shrink-0">
                  <CoreTooltip title={stack}>{StackIcons[stack]}</CoreTooltip>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default ProjectCard;
