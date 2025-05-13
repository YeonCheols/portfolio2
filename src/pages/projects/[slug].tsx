import { GetServerSideProps, NextPage } from "next";
import { NextSeo } from "next-seo";

import BackButton from "@/common/components/elements/BackButton";
import Container from "@/common/components/elements/Container";
import PageHeading from "@/common/components/elements/PageHeading";
import prisma from "@/common/libs/prisma";
import { ProjectItemProps } from "@/common/types/projects";
import ProjectDetail from "@/modules/projects/components/ProjectDetail";
import axios from "axios";

interface ProjectsDetailPageProps {
  project: ProjectItemProps;
}

const ProjectsDetailPage: NextPage<ProjectsDetailPageProps> = ({ project }) => {
  const PAGE_TITLE = project?.title;
  const PAGE_DESCRIPTION = project?.description;

  const canonicalUrl = `https://ycseng.vercel.app/projects/${project?.slug}`;

  return (
    <>
      <NextSeo
        title={`연철s 프로젝트 - ${project?.title}`}
        description={project?.description}
        canonical={canonicalUrl}
        openGraph={{
          type: "article",
          article: {
            publishedTime: project?.updated_at.toString(),
            modifiedTime: project?.updated_at.toString(),
            authors: ["연철s"],
          },
          url: canonicalUrl,
          images: [
            {
              url: project?.image,
            },
          ],
          siteName: "연철s 블로그",
        }}
      />
      <Container data-aos="fade-up">
        <BackButton url="/projects" />
        <PageHeading title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
        <ProjectDetail {...project} />
      </Container>
    </>
  );
};

export default ProjectsDetailPage;

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  if (typeof params?.slug === "undefined") {
    return {
      redirect: {
        destination: "/404",
        permanent: false,
      },
    };
  }

  const { data, status } = await axios.get(
    `${process.env.API_URL}/project/${params?.slug}`,
  );

  if (!data || status !== 200) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }
  return {
    props: {
      project: JSON.parse(JSON.stringify(data)),
    },
  };
};
