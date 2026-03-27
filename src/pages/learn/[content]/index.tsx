import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { useRouter } from "next/router";
import { NextSeo } from "next-seo";

import BackButton from "@/shared/ui/BackButton";
import Container from "@/shared/ui/Container";
import Loading from "@/shared/ui/Loading";
import PageHeading from "@/shared/ui/PageHeading";
import { LEARN_CONTENTS } from "@/shared/config/learn";
import { loadMdxFiles } from "@/shared/lib/mdx";
import { ContentProps, MdxFileContentProps } from "@/shared/types/learn";
import ContentList from "@/features/learn/ui/ContentList";

interface ContentPageProps {
  content: ContentProps | null;
  subContents: MdxFileContentProps[];
}

const LearnContentPage: NextPage<ContentPageProps> = ({
  content,
  subContents,
}) => {
  const router = useRouter();

  if (router.isFallback) {
    return <Loading />;
  }

  if (!content) {
    return null;
  }

  const { title, description } = content;

  const sortedSubContents = subContents.sort(
    (a, b) => a.frontMatter.id - b.frontMatter.id,
  );

  const canonicalUrl = `https://www.ycseng.com/${content?.slug}`;

  return (
    <>
      <NextSeo
        title={`연철s - Learn ${title}`}
        description={description}
        canonical={canonicalUrl}
        openGraph={{
          url: canonicalUrl,
          images: [
            {
              url: content?.image,
            },
          ],
          siteName: "Yeon Cheol",
        }}
      />
      <Container data-aos="fade-up">
        <BackButton url="/learn" />
        <PageHeading title={title} description={description} />
        <ContentList
          sortedSubContents={sortedSubContents}
          content={content}
          title={title}
        />
      </Container>
    </>
  );
};

export default LearnContentPage;

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = LEARN_CONTENTS.map((content) => ({
    params: { content: content.slug },
  }));

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const contentSlug = params?.content as string;

  const content =
    LEARN_CONTENTS.find((item) => item?.slug === contentSlug) || null;

  if (!content) {
    return {
      redirect: {
        destination: "/404",
        permanent: false,
      },
    };
  }

  const subContentList = loadMdxFiles(content?.slug);

  return {
    props: {
      content,
      subContents: subContentList,
    },
  };
};
