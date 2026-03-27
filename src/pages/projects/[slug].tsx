import { GetServerSideProps } from "next";
import { NextSeo } from "next-seo";
import dynamic from "next/dynamic";

import BackButton from "@/shared/ui/BackButton";
import Container from "@/shared/ui/Container";
import PageHeading from "@/shared/ui/PageHeading";
import { useStacks } from "@/common/hooks/useStacks";
import { ProjectResponse } from "@docs/api";
import axios from "axios";

// 동적 import로 외부 패키지 컴포넌트 로드
const ProjectPreviewDetail = dynamic(
  () =>
    import("@yeoncheols/portfolio-core-ui").then((mod) => mod.ProjectPreview),
  {
    ssr: false,
    loading: () => <div>Loading...</div>,
  },
);

interface ProjectsDetailPageProps {
  project: ProjectResponse;
}

const ProjectsDetailPage = ({ project }: ProjectsDetailPageProps) => {
  const PAGE_TITLE = project?.title;
  const PAGE_DESCRIPTION = project?.description;

  const canonicalUrl = `https://www.ycseng.com/projects/${project?.slug}`;

  const { StackIcons } = useStacks();

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

  try {
    const { data, status } = await axios.get(
      `${process.env.API_URL}/project/${params?.slug}`,
    );

    if (typeof data === "undefined" || status !== 200) {
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
  } catch (error) {
    return {
      redirect: {
        destination: "/404",
        permanent: false,
      },
    };
  }
};
