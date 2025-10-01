import Link from "next/link";
import { BiFile as SubContentIcon } from "react-icons/bi";

import Card from "@/common/components/elements/Card";
import { Tooltip as CoreTooltip } from "@yeoncheols/portfolio-core-ui";
import cn from "@/common/libs/cn";
import { SubContentProps } from "@/common/types/learn";
import { useStacks } from "@/common/hooks/useStacks";

const LearnSubContentItem = ({
  contentSlug,
  subContentSlug,
  title,
  language,
  difficulty = "",
}: SubContentProps) => {
  const { StackIcons } = useStacks();

  return (
    <Link href={`/learn/${contentSlug}/${subContentSlug}`}>
      <Card
        className={cn(
          "flex w-full cursor-pointer flex-row items-center justify-between border border-neutral-300 px-5 py-4 dark:border-neutral-900 lg:hover:scale-[102%]",
        )}
      >
        <div className="flex items-center gap-3">
          <SubContentIcon size={18} className="hidden md:flex" />
          <h5 className=" font-[15px]">{title}</h5>
        </div>
        <div className="hidden items-center gap-5 md:flex">
          {difficulty && (
            <CoreTooltip title={`Difficulty: ${difficulty}`}>
              <div className="rounded-full bg-neutral-200 px-2 py-1 text-xs font-medium text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
                {difficulty}
              </div>
            </CoreTooltip>
          )}
          {language && (
            <CoreTooltip title={language}>{StackIcons[language]}</CoreTooltip>
          )}
        </div>
      </Card>
    </Link>
  );
};

export default LearnSubContentItem;
