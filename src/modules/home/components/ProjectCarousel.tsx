import { motion } from "framer-motion";
import { useMemo, useRef } from "react";
import { useDraggable } from "react-use-draggable-scroll";
import useSWR from "swr";
import { fetcher } from "@/services/fetcher";
import ProductCardSkeleton from "@/common/components/skeleton/ProductCardSkeleton";
import ProjectCard from "@/modules/projects/components/ProjectCard";
import EmptyState from "@/common/components/elements/EmptyState";
import { ProjectResponse, ProjectSearchResponse } from "docs/api";
import cn from "@/common/libs/cn";

const ProjectCarousel = () => {
  const { data, error, isLoading } = useSWR<{ data: ProjectSearchResponse }>(
    `/api/projects?page=1&size=4`,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 0,
    },
  );

  const projectData: ProjectResponse[] = useMemo(() => {
    return data?.data?.data || [];
  }, [data]);

  const ref =
    useRef<HTMLDivElement>() as React.MutableRefObject<HTMLInputElement>;
  const { events } = useDraggable(ref);

  const renderProjectCards = () => {
    if (isLoading) {
      return Array.from({ length: 4 }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ));
    }

    if (error || projectData.length === 0) {
      return (
        <EmptyState
          className="w-full"
          message={error ? "오류가 발생했습니다" : "포스트가 없습니다"}
        />
      );
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

  return (
    <div
      className={cn(
        "grid gap-5 px-1 pt-2 sm:grid-cols-2",
        !isLoading && projectData.length === 0 && "flex items-center",
      )}
      {...events}
      ref={ref}
    >
      {renderProjectCards()}
    </div>
  );
};

export default ProjectCarousel;
