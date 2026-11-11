import { NextSeo } from "next-seo";

import { FEATURED_PROJECT, FeaturedProjectDetail } from "@/features/projects";
import BackButton from "@/shared/ui/BackButton";
import Container from "@/shared/ui/Container";
import PageHeading from "@/shared/ui/PageHeading";

const FeaturedProjectPage = () => (
  <>
    <NextSeo
      title={`연철s - ${FEATURED_PROJECT.title}`}
      description={FEATURED_PROJECT.summary}
      canonical="https://www.ycseng.com/projects/albamon-msa"
    />
    <Container data-aos="fade-up">
      <BackButton url="/" />
      <PageHeading
        title={FEATURED_PROJECT.title}
        description={FEATURED_PROJECT.summary}
      />
      <FeaturedProjectDetail />
    </Container>
  </>
);

export default FeaturedProjectPage;
