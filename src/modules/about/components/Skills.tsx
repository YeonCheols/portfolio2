import styled from "@emotion/styled";
import { memo, ReactNode, useEffect, useMemo, useState } from "react";

import InfiniteLoopSlider from "@/common/components/elements/InfiniteLoopSlider";
import { STACKS } from "@/common/constant/stacks";
import { fetcher } from "@/services/fetcher";
import useSWR from "swr";
import Skeleton from "react-loading-skeleton";
import ProductCardSkeleton from "@/common/components/skeleton/ProductCardSkeleton";

const Tag = memo(({ icon, title }: { icon: ReactNode; title: string }) => (
  <div className="mr-3 flex w-max items-center gap-2 rounded-full border border-neutral-300 bg-neutral-50 px-5 py-2 text-[15px] shadow-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50">
    {icon}
    <span>{title}</span>
  </div>
));

const Skills = () => {
  const { data: stacksData, isLoading } = useSWR("/api/stacks", fetcher);

  const [shuffledSkills, setShuffledSkills] = useState<
    Array<[string, ReactNode]>
  >([]);

  const stacksIcons = useMemo(() => {
    if (!stacksData?.data) return [];

    return stacksData.data.reduce(
      (acc: { [key: string]: ReactNode }, stack: any) => {
        acc[stack.name] = STACKS[stack.name];
        return acc;
      },
      {},
    );
  }, [stacksData]);

  useEffect(() => {
    const skillsArray = Object.entries(stacksIcons) as [string, ReactNode][];
    const shuffledArray = [...skillsArray].sort(() => Math.random() - 0.5);
    setShuffledSkills(shuffledArray);
  }, [stacksIcons]);

  const sliders = useMemo(
    () =>
      Array.from({ length: 3 }, (_, index) => {
        const sliderSkills = [...shuffledSkills].sort(
          () => Math.random() - 0.5,
        );
        return (
          <InfiniteLoopSlider key={index} isReverse={index === 1}>
            {sliderSkills.map(([title, icon], index) => (
              <Tag key={index} icon={icon} title={title} />
            ))}
          </InfiniteLoopSlider>
        );
      }),
    [shuffledSkills],
  );

  if (isLoading) {
    return <ProductCardSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div className="flex w-full">
        <div className="relative flex w-full flex-col justify-start gap-y-4 overflow-hidden py-2">
          {sliders}
          <StyledFade className="fade hidden dark:flex" />
        </div>
      </div>
    </div>
  );
};

export default Skills;

const StyledFade = styled.div`
  pointer-events: none;
  background: linear-gradient(
    90deg,
    #121212,
    transparent 20%,
    transparent 80%,
    #121212
  );
  position: absolute;
  inset: 0;
`;

Tag.displayName = "Tag";
