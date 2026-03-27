import { NextPage } from "next";
import { NextSeo } from "next-seo";
import React from "react";

import Playground from "@/features/playground";
import Container from "@/shared/ui/Container";

const PAGE_TITLE = "playground";

const playground: NextPage = () => {
  return (
    <>
      <NextSeo title={`연철s - ${PAGE_TITLE}`} />
      <Container className="!mt-0 pt-20 md:pt-0" data-aos="fade-up">
        <Playground id="playground" isHeading />
      </Container>
    </>
  );
};

export default playground;
