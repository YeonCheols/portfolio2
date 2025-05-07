import { NextPage } from "next";
import { NextSeo } from "next-seo";

import Container from "@/common/components/elements/Container";
import BlogListNew from "@/modules/blog";

const PAGE_TITLE = "Blog";

const BlogPage: NextPage = () => {
  return (
    <>
      <NextSeo title={`연철s - ${PAGE_TITLE}`} />
      <Container className="xl:!-mt-5" data-aos="fade-up">
        <BlogListNew />
      </Container>
    </>
  );
};

export default BlogPage;
