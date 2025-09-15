import { GetServerSideProps, NextPage } from "next";
import { NextSeo } from "next-seo";

import Container from "@/common/components/elements/Container";
import PageHeading from "@/common/components/elements/PageHeading";
import About from "@/modules/about";

const PAGE_TITLE = "about";
const PAGE_DESCRIPTION = "경력사항에 대한 내용을 확인할 수 있습니다.";

const AboutPage = ({ activeTab }: { activeTab: string }) => {
  return (
    <>
      <NextSeo title={`연철s- ${PAGE_TITLE}`} />
      <Container data-aos="fade-up">
        <PageHeading title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
        <About />
      </Container>
    </>
  );
};

export default AboutPage;

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  return {
    props: {
      activeTab: query.activeTab ?? "career",
    },
  };
};
