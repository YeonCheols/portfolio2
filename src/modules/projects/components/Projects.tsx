import { motion } from "framer-motion";
import InfiniteScroll from "react-infinite-scroll-component";

import EmptyState from "@/common/components/elements/EmptyState";

import ProjectCard from "./ProjectCard";
import { ProjectResponse } from "@docs/api";

interface ProjectsComponentProps {
  projects: ProjectResponse[];
  loadMore: () => void;
  hasMore: boolean;
}

const Projects = ({ projects, loadMore, hasMore }: ProjectsComponentProps) => {
  const filteredProjects = projects.filter((project) => project?.isShow);

  if (filteredProjects.length === 0) {
    return <EmptyState message="No Data" />;
  }

  return (
    <InfiniteScroll
      dataLength={filteredProjects.length}
      next={loadMore}
      hasMore={hasMore}
      loader={<h4>Loading...</h4>}
      style={{ overflow: "hidden" }}
    >
      <div className="grid gap-5 px-1 pt-2 sm:grid-cols-2">
        {filteredProjects.map((project, index) => (
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
