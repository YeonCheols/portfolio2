import { GetServerSideProps, NextPage } from "next";
import { NextSeo } from "next-seo";

import BackButton from "@/common/components/elements/BackButton";
import Container from "@/common/components/elements/Container";
import PageHeading from "@/common/components/elements/PageHeading";
import axios from "axios";
import { ProjectResponse, TagResponse, TagSearchResponse } from "@docs/api";
import {
  ProjectPreview as ProjectPreviewDetail,
  getIconComponent,
} from "@yeoncheols/portfolio-core-ui";
import useSWR from "swr";
import { fetcher } from "@/services/fetcher";

interface ProjectsDetailPageProps {
  project: ProjectResponse;
}

const ProjectsDetailPage: NextPage<ProjectsDetailPageProps> = ({ project }) => {
  const PAGE_TITLE = project?.title;
  const PAGE_DESCRIPTION = project?.description;

  const canonicalUrl = `https://www.ycseng.com/projects/${project?.slug}`;

  const { data: stacksData } = useSWR<TagSearchResponse>(
    "/api/stacks",
    fetcher,
  );

  const StackIcons: Record<string, JSX.Element> =
    stacksData?.data.reduce(
      (acc: Record<string, JSX.Element>, item: TagResponse) => {
        const IconComponent = getIconComponent(item.icon);
        if (!IconComponent) {
          return acc;
        }
        acc[item.name] = (
          <IconComponent
            size={20}
            className={`${item.color}`}
            title={item.name}
          />
        );
        return acc;
      },
      {},
    ) || {};

  return (
    <>
      <NextSeo
        title={`연철s 프로젝트 - ${project?.title}`}
        description={project?.description}
        canonical={canonicalUrl}
        openGraph={{
          type: "article",
          article: {
            publishedTime: project?.updatedAt.toString(),
            modifiedTime: project?.updatedAt.toString(),
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
        <ProjectPreviewDetail data={project} stackIcons={StackIcons} />
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
