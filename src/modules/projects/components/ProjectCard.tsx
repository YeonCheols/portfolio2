import Link from "next/link";
import { AiFillPushpin as PinIcon } from "react-icons/ai";
import { HiOutlineArrowSmRight as ViewIcon } from "react-icons/hi";

import Card from "@/common/components/elements/Card";
import Image from "@/common/components/elements/Image";
import Tooltip from "@/common/components/elements/Tooltip";
import { STACKS } from "@/common/constant/stacks";
import { ProjectResponse } from "docs/api";

const ProjectCard = ({
  title,
  slug,
  description,
  image,
  stacks,
}: ProjectResponse) => {
  const stacksArray = JSON.parse(stacks);

  return (
    <Link href={`/projects/${slug}`}>
      <Card className="group relative cursor-pointer border border-neutral-200 dark:border-neutral-900 lg:hover:scale-[102%] h-[360px]">
        <div className="relative">
          {image.startsWith("https") && (
            <Image
              src={image}
              width={400}
              height={200}
              alt={title}
              className="h-48 rounded-t-xl object-cover object-left w-full"
            />
          )}
          <div className="absolute left-0 top-0 flex flex h-full w-full items-center justify-center gap-1 rounded-t-xl bg-black text-sm font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-80">
            <span>View Project</span>
            <ViewIcon size={20} />
          </div>
        </div>
        <div className="space-y-2 p-5">
          <div className="flex justify-between">
            <div className="cursor-pointer  text-lg text-neutral-700 transition-all duration-300 dark:text-neutral-300 dark:group-hover:text-teal-400 lg:group-hover:text-teal-600">
              {title}
            </div>
          </div>
          <p className="text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-400">
            {description}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {stacksArray?.map((stack: string, index: number) => (
              <div key={index}>
                <Tooltip title={stack}>{STACKS[stack]}</Tooltip>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default ProjectCard;
