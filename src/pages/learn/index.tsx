import { NextPage } from "next";
import { NextSeo } from "next-seo";

import LearnModule from "@/features/learn";
import { LEARN_CONTENTS } from "@/shared/config/learn";
import Container from "@/shared/ui/Container";
import PageHeading from "@/shared/ui/PageHeading";

const PAGE_TITLE = "learn";
const PAGE_DESCRIPTION = `It's not a course, it's my personal learning notes. But if you are interested, let's learn together.`;

const LearnPage: NextPage = () => {
  const filteredContents =
    LEARN_CONTENTS.filter((content) => content.is_show) || [];

  return (
    <>
      <NextSeo title={`연철s - ${PAGE_TITLE}`} />
      <Container data-aos="fade-up">
        <PageHeading title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
        <LearnModule contents={filteredContents} />
      </Container>
    </>
  );
};

export default LearnPage;
