import styled from "@emotion/styled";
import { memo, ReactNode, useMemo } from "react";

import InfiniteLoopSlider from "@/common/components/elements/InfiniteLoopSlider";
import { StackIcon, StackType } from "@yeoncheols/portfolio-core-ui";
import { fetcher } from "@/services/fetcher";
import useSWR from "swr";
import { TagSearchResponse } from "@docs/api";
import Loading from "@/common/components/elements/Loading";

const Tag = memo(({ icon, title }: { icon: ReactNode; title: string }) => (
  <div className="mr-3 flex w-max items-center gap-2 rounded-full border border-neutral-300 bg-neutral-50 px-5 py-2 text-[15px] shadow-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50">
    {icon}
    <span>{title}</span>
  </div>
));

const Skills = () => {
  const { data: stacksData, isLoading } = useSWR<TagSearchResponse>(
    "/api/stacks",
    fetcher,
  );

  // API 데이터를 StackType 형태로 변환
  const skillsData = useMemo(() => {
    if (!stacksData?.data) return [];

    return stacksData.data.map(
      (stack) =>
        ({
          name: stack.name,
          icon: stack.icon,
          color: stack.color,
          id: stack.id,
        }) as StackType,
    );
  }, [stacksData]);

  // 3개의 슬라이더를 위한 데이터 준비
  const sliders = useMemo(() => {
    if (skillsData.length === 0) return [];

    return Array.from({ length: 3 }, (_, index) => {
      // 각 슬라이더마다 다른 순서로 스킬을 섞어서 배치
      const shuffledSkills = [...skillsData].sort(() => Math.random() - 0.5);

      return (
        <InfiniteLoopSlider key={index} isReverse={index === 1}>
          {shuffledSkills.map((skill, skillIndex) => (
            <Tag
              key={`${index}-${skillIndex}`}
              icon={
                <StackIcon
                  name={skill.name}
                  icon={skill.icon}
                  color={skill.color}
                  size={20}
                />
              }
              title={skill.name}
            />
          ))}
        </InfiniteLoopSlider>
      );
    });
  }, [skillsData]);

  if (isLoading) {
    return <Loading />;
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
