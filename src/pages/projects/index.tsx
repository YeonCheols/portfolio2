import { GetServerSideProps, NextPage } from "next";
import { NextSeo } from "next-seo";
import { useState } from "react";

import prisma from "@/common/libs/prisma";

import Container from "@/common/components/elements/Container";
import PageHeading from "@/common/components/elements/PageHeading";
import { ProjectItemProps } from "@/common/types/projects";
import Projects from "@/modules/projects";

interface ProjectsPageProps {
  projects: ProjectItemProps[];
}

const PAGE_TITLE = "프로젝트";
const PAGE_DESCRIPTION =
  "제가 작업한 여러 프로젝트들, 개인 프로젝트와 오픈소스 프로젝트 모두를 포함합니다.";

const ProjectsPage: NextPage<ProjectsPageProps> = ({ projects }) => {
  const [visibleProjects, setVisibleProjects] = useState(6);

  const loadMore = () => setVisibleProjects((prev) => prev + 2);
  const hasMore = visibleProjects < projects.length;

  return (
    <>
      <NextSeo title={`연철s - ${PAGE_TITLE}`} />
      <Container data-aos="fade-up">
        <PageHeading title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
        <Projects
          projects={projects.slice(0, visibleProjects)}
          loadMore={loadMore}
          hasMore={hasMore}
        />
      </Container>
    </>
  );
};

export default ProjectsPage;

export const getServerSideProps: GetServerSideProps = async () => {
  const response = await prisma.projects.findMany({
    orderBy: [
      {
        is_featured: "desc",
      },
      {
        updated_at: "desc",
      },
    ],
  });

  return {
    props: {
      projects: JSON.parse(JSON.stringify(response)),
    },
  };
};
