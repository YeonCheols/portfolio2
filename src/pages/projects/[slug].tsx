import { GetServerSideProps, NextPage } from "next";
import { NextSeo } from "next-seo";
import axios from "axios";
// import dynamic from "next/dynamic";

// import BackButton from "@/common/components/elements/BackButton";
// import Container from "@/common/components/elements/Container";
// import PageHeading from "@/common/components/elements/PageHeading";
// import { useStacks } from "@/common/hooks/useStacks";
import { ProjectResponse } from "@docs/api";

// 동적 import로 외부 패키지 컴포넌트 로드
// const ProjectPreviewDetail = dynamic(
//   () =>
//     import("@yeoncheols/portfolio-core-ui").then((mod) => mod.ProjectPreview),
//   {
//     ssr: false,
//     loading: () => <div>Loading...</div>,
//   },
// );

interface ProjectsDetailPageProps {
  project: ProjectResponse;
}

const ProjectsDetailPage = ({ project }: ProjectsDetailPageProps) => {
  // const PAGE_TITLE = project?.title;
  // const PAGE_DESCRIPTION = project?.description;

  // const canonicalUrl = `https://www.ycseng.com/projects/${project?.slug}`;

  // const { StackIcons } = useStacks();

  return (
    <>
      {/* <NextSeo
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
      </Container> */}
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
};
