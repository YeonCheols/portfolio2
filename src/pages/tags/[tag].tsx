import { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import axios from "axios";

import Container from "@/common/components/elements/Container";
import PageHeading from "@/common/components/elements/PageHeading";
import { ProjectByTagResponse } from "@docs/api";
import Loading from "@/common/components/elements/Loading";

export default function TagPage({
  projects,
  params,
}: {
  projects: ProjectByTagResponse[];
  params: { tag: string };
}) {
  return (
    <>
      <Head>
        <title>#{params.tag} | YeonCheol&apos;s Portfolio</title>
        <meta
          name="description"
          content={`Project tagged with ${params.tag}`}
        />
      </Head>

      <Container>
        <PageHeading
          title={`#${params.tag}`}
          description={`Project tagged with ${params.tag}`}
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
              {projects.length} {projects.length === 1 ? "project" : "projects"}
            </span>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-600 dark:text-neutral-400">
              No projects found with tag &quot;{params.tag}&quot;
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {projects.map((project) => (
              <article
                key={project.id}
                className="rounded-lg border border-neutral-300 bg-white p-6 transition-all hover:border-neutral-400 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600"
              >
                <Link href={`/projects/${project.slug}`}>
                  <h2 className="mb-2 text-xl font-semibold text-neutral-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400">
                    {project.title}
                  </h2>
                </Link>

                <p className="mb-4 text-neutral-600 dark:text-neutral-400">
                  {project.description}
                </p>

                <div className="flex items-center justify-between">
                  {/* <div className="flex flex-wrap gap-2">
                    {project.projectTags &&
                      project.projectTags.map((projectTag) => (
                        <Link
                          key={projectTag}
                          href={`/tags/${projectTag}`}
                          className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600"
                        >
                          #{projectTag?.name}
                        </Link>
                      ))}
                  </div> */}

                  <time className="text-sm text-neutral-500 dark:text-neutral-500">
                    {new Date(project.updatedAt).toLocaleDateString()}
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
  if (!params?.tag) {
    return {
      notFound: true,
    };
  }

  try {
    const data = await axios.get<ProjectByTagResponse[]>(
      `${process.env.API_URL}/project/by-tag/${params?.tag}`,
    );

    return {
      props: {
        params,
        projects: data.data,
      },
    };
  } catch (error) {
    return {
      props: {
        projects: [],
        params,
      },
    };
  }
};
