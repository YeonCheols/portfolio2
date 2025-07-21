import { NextSeo } from "next-seo";
import { useMemo } from "react";
import useSWRInfinite from "swr/infinite";

import Container from "@/common/components/elements/Container";
import PageHeading from "@/common/components/elements/PageHeading";
import Projects from "@/modules/projects";
import { ProjectResponse, ProjectSearchResponse } from "@docs/api";
import { fetcher } from "@/services/fetcher";

interface ProjectsPageProps {
  projects: ProjectResponse[];
}

const PAGE_TITLE = "프로젝트";
const PAGE_DESCRIPTION =
  "제가 작업한 여러 프로젝트들, 개인 프로젝트와 오픈소스 프로젝트 모두를 포함합니다.";

const ProjectsPage = () => {
  const { data, error, isLoading, size, setSize, isValidating } =
    useSWRInfinite<{
      status: boolean;
      data: ProjectSearchResponse;
    }>(
      (index, previousPageData) => {
        // NOTE: 첫 페이지이거나 이전 페이지에 데이터가 없는경우
        if (index === 0) return `/api/projects?page=1&size=4`;

        if (
          !previousPageData ||
          !previousPageData.data ||
          previousPageData.data.data.length === 0
        ) {
          return null;
        }

        return `/api/projects?page=${index + 1}&size=4`;
      },
      fetcher,
      {
        revalidateOnFocus: false,
        refreshInterval: 0,
      },
    );

  const allProjects = useMemo(() => {
    if (!data) return [];
    return data.flatMap((page) => page.data.data || []);
  }, [data]);

  const totalProjects = data?.[0]?.data?.allTotal || 0;
  const hasMore = allProjects.length < totalProjects;

  const loadMore = () => {
    if (!isValidating && hasMore) {
      setSize(size + 1);
    }
  };

  return (
    <>
      <NextSeo title={`연철s - ${PAGE_TITLE}`} />
      <Container data-aos="fade-up">
        <PageHeading title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
        <Projects
          projects={allProjects}
          loadMore={loadMore}
          hasMore={hasMore}
          isLoading={isLoading || isValidating}
        />
      </Container>
    </>
  );
};

export default ProjectsPage;
