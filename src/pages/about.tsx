import { NextPage } from "next";
import { NextSeo } from "next-seo";

import Container from "@/common/components/elements/Container";
import PageHeading from "@/common/components/elements/PageHeading";
import About from "@/modules/about";

const PAGE_TITLE = "about";
const PAGE_DESCRIPTION = "연철s 포트폴리오 소개 페이지입니다!";

const AboutPage: NextPage = () => {
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
