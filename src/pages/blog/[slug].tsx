import axios from "axios";
import { GetServerSideProps, NextPage } from "next";
import dynamic from "next/dynamic";
import { NextSeo } from "next-seo";
import { useEffect } from "react";

import { getBlogDetail } from "@/features/blog/api/blog";
import BlogDetail from "@/features/blog/ui/BlogDetail";
import { formatExcerpt } from "@/shared/helpers";
import { BlogDetailProps } from "@/shared/types/blog";
import BackButton from "@/shared/ui/BackButton";
import Container from "@/shared/ui/Container";

const GiscusComment = dynamic(() => import("@/features/blog/ui/GiscusComment"));

interface BlogDetailPageProps {
  blog: {
    data: BlogDetailProps;
  };
}

const BlogDetailPage: NextPage<BlogDetailPageProps> = ({ blog }) => {
  const blogData = blog?.data || {};

  const slug = `blog/${blogData?.slug}?id=${blogData?.id}`;
  const canonicalUrl = `https://www.ycseng.com/${slug}`;
  const description = formatExcerpt(blogData?.excerpt?.rendered);

  const incrementViews = async () => {
    await axios.post(`/api/views?&slug=${blogData?.slug}`);
  };

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      incrementViews();
    }
  }, []);

  return (
    <>
      <NextSeo
        title={`연철s 블로그 - ${blogData?.title?.rendered}`}
        description={description}
        canonical={canonicalUrl}
        openGraph={{
          type: "article",
          article: {
            publishedTime: blogData?.date,
            modifiedTime: blogData?.date,
            authors: ["Yeon Cheol", "연철s"],
          },
          url: canonicalUrl,
          images: [
            {
              url: blogData?.featured_image_url,
            },
          ],
          siteName: "연철s 블로그",
        }}
      />
      <Container data-aos="fade-up">
        <BackButton url="/blog" />
        <BlogDetail {...blogData} />
        <section id="comments">
          <GiscusComment isEnableReaction={false} />
        </section>
      </Container>
    </>
  );
};

export default BlogDetailPage;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const blogId = context.query?.id as string;

  if (!blogId) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  const response = await getBlogDetail(parseInt(blogId));

  if (response?.status === 404) {
    return {
      redirect: {
        destination: "/404",
        permanent: false,
      },
    };
  }

  return {
    props: {
      blog: response,
    },
  };
};
