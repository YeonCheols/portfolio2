import { motion } from "framer-motion";
import InfiniteScroll from "react-infinite-scroll-component";

import EmptyState from "@/common/components/elements/EmptyState";

import ProjectCard from "./ProjectCard";
import { ProjectResponse } from "@docs/api";
import ProductCardSkeleton from "@/common/components/skeleton/ProductCardSkeleton";

interface ProjectsComponentProps {
  projects: ProjectResponse[];
  loadMore: () => void;
  hasMore: boolean;
  isLoading?: boolean;
}

const ProjectSkeleton = () => {
  return (
    <div className={"grid gap-5 px-1 pt-2 sm:grid-cols-2"}>
      {Array.from({ length: 4 }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
};

const Projects = ({
  projects,
  loadMore,
  hasMore,
  isLoading = false,
}: ProjectsComponentProps) => {
  if (isLoading) {
    return <ProjectSkeleton />;
  }
  if (!isLoading && projects.length === 0) {
    return <EmptyState className="w-full" message="프로젝트가 없습니다" />;
  }

  return (
    <InfiniteScroll
      dataLength={projects.length}
      next={loadMore}
      hasMore={hasMore}
      loader={<ProjectSkeleton />}
      style={{ overflow: "hidden" }}
    >
      <div className="grid gap-5 px-1 pt-2 sm:grid-cols-2">
        {projects.map((project, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <ProjectCard {...project} />
          </motion.div>
        ))}
      </div>
    </InfiniteScroll>
  );
};

export default Projects;
