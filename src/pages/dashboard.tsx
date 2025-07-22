import { GetStaticProps, NextPage } from "next";
import { NextSeo } from "next-seo";
import { SWRConfig } from "swr";

import Container from "@/common/components/elements/Container";
import PageHeading from "@/common/components/elements/PageHeading";
import Dashboard from "@/modules/dashboard";
import { getGithubUser } from "@/services/github";

interface DashboardPageProps {
  fallback: {
    [key: string]: any;
  };
}

const PAGE_TITLE = "대시보드";
const PAGE_DESCRIPTION = "연철의 깃허브 대시보드에 오신 것을 환영합니다!";

const DashboardPage: NextPage<DashboardPageProps> = ({ fallback }) => {
  return (
    <SWRConfig value={{ fallback }}>
      <NextSeo title={`연철s - ${PAGE_TITLE}`} />
      <Container data-aos="fade-up">
        <PageHeading title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
        <Dashboard />
      </Container>
    </SWRConfig>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  let githubUserPersonal = null;

  try {
    githubUserPersonal = await getGithubUser("personal");
  } catch (error) {
    console.warn("GitHub API 호출 실패:", error);
    // NOTE: GitHub API 오류 시 빈 데이터로 fallback
    githubUserPersonal = { data: null };
  }

  return {
    props: {
      fallback: {
        "/api/github?type=personal": githubUserPersonal?.data,
      },
      revalidate: 1,
    },
  };
};

export default DashboardPage;
