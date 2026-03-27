import { NextPage } from "next";
import { NextSeo } from "next-seo";

import Home from "@/widgets/home";
import Container from "@/shared/ui/Container";

const HomePage: NextPage = () => {
  return (
    <>
      <NextSeo title="연철s - 포트폴리오" />
      <Container data-aos="fade-up">
        <Home />
      </Container>
    </>
  );
};

export default HomePage;
