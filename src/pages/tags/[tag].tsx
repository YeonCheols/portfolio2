import { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import axios from "axios";

import Container from "@/common/components/elements/Container";
import PageHeading from "@/common/components/elements/PageHeading";

interface BlogPost {
  id: string;
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  tags: string[];
}

interface TagPageProps {
  tag: string;
  posts: BlogPost[];
  allTags: { name: string; count: number }[];
}

export default function TagPage({ tag, posts, allTags }: TagPageProps) {
  const tagInfo = allTags.find((t) => t.name === tag);

  return (
    <>
      <Head>
        <title>#{tag} | YeonCheol&apos;s Portfolio</title>
        <meta name="description" content={`Posts tagged with ${tag}`} />
      </Head>

      <Container>
        <PageHeading
          title={`#${tag}`}
          description={`Posts tagged with ${tag}`}
        />

        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <Link
              href="/tags"
              className="hover:text-neutral-900 dark:hover:text-white"
            >
              ← Back to all tags
            </Link>
            <span>•</span>
            <span>
              {posts.length} {posts.length === 1 ? "post" : "posts"}
            </span>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-600 dark:text-neutral-400">
              No posts found with tag &quot;{tag}&quot;
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <article
                key={post.id}
                className="rounded-lg border border-neutral-300 bg-white p-6 transition-all hover:border-neutral-400 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600"
              >
                <Link href={`/blog/${post.slug}`}>
                  <h2 className="mb-2 text-xl font-semibold text-neutral-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400">
                    {post.title}
                  </h2>
                </Link>

                <p className="mb-4 text-neutral-600 dark:text-neutral-400">
                  {post.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((postTag) => (
                      <Link
                        key={postTag}
                        href={`/tags/${postTag}`}
                        className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600"
                      >
                        #{postTag}
                      </Link>
                    ))}
                  </div>

                  <time className="text-sm text-neutral-500 dark:text-neutral-500">
                    {new Date(post.publishedAt).toLocaleDateString()}
                  </time>
                </div>
              </article>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  try {
    const tag = params?.tag as string;

    // Fetch all tags directly from external API
    const { data: allTags } = await axios.get(`${process.env.API_URL}/tag`);

    // Fetch posts with this tag (you may need to adjust this based on your API)
    const { data: posts } = await axios.get(
      `${process.env.API_URL}/blog?tag=${encodeURIComponent(tag)}`,
    );

    return {
      props: {
        tag,
        posts: posts || [],
        allTags: allTags || [],
      },
    };
  } catch (error) {
    console.error("Error fetching tag data:", error);
    return {
      props: {
        tag: params?.tag || "",
        posts: [],
        allTags: [],
      },
    };
  }
};
