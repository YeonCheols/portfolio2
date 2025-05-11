import { motion } from "framer-motion";
import { useMemo, useRef } from "react";
import { useDraggable } from "react-use-draggable-scroll";
import useSWR from "swr";

import { fetcher } from "@/services/fetcher";

import ProductCardSkeleton from "@/common/components/skeleton/ProductCardSkeleton";
import ProjectCard from "@/modules/projects/components/ProjectCard";
import EmptyState from "@/common/components/elements/EmptyState";
import { ProjectItemProps } from "@/common/types/projects";

const ProjectCarousel = () => {
  const { data, error, isLoading } = useSWR(
    `/api/projects?page=1&size=5`,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 0,
    },
  );

  const projectData: ProjectItemProps[] = useMemo(() => {
    return data?.data || [];
  }, [data]);

  const ref =
    useRef<HTMLDivElement>() as React.MutableRefObject<HTMLInputElement>;
  const { events } = useDraggable(ref);

  const renderProjectCards = () => {
    if (isLoading) {
      return Array.from({ length: 3 }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ));
    }

    return projectData.map((item, index) => (
      <motion.div
        key={index}
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -100 }}
        transition={{ duration: 0.5 }}
        className="min-w-[326px] gap-x-5"
      >
        <ProjectCard {...item} />
      </motion.div>
    ));
  };

  const renderEmptyState = () => {
    if (error || projectData.length === 0) {
      return (
        <EmptyState
          className="w-full"
          message={error ? "오류가 발생했습니다" : "포스트가 없습니다"}
        />
      );
    }
  };

  return (
    <div className="grid gap-5 px-1 pt-2 sm:grid-cols-2" {...events} ref={ref}>
      {renderProjectCards()}
      {renderEmptyState()}
    </div>
  );
};

export default ProjectCarousel;
