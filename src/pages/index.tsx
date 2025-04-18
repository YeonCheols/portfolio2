import { NextPage } from "next";
import { NextSeo } from "next-seo";

import Container from "@/common/components/elements/Container";
import Home from "@/modules/home";

const HomePage: NextPage = () => {
  return (
    <>
      <NextSeo title="연철 - 포트폴리오" />
      <Container data-aos="fade-up">
        <Home />
      </Container>
    </>
  );
};

export default HomePage;
