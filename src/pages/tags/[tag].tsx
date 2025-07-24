import { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import axios from "axios";

import Container from "@/common/components/elements/Container";
import PageHeading from "@/common/components/elements/PageHeading";
import { ProjectByTagResponse } from "@docs/api";
import Loading from "@/common/components/elements/Loading";
import { motion } from "framer-motion";
import ProjectCard from "@/modules/projects/components/ProjectCard";

export default function TagPage({
  projects,
  params,
}: {
  projects: ProjectByTagResponse[];
  params: { tag: string };
}) {
  if (!projects) {
    return <Loading />;
  }

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
              <article key={project.id}>
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.5 }}
                  className="min-w-[326px] gap-x-5"
                >
                  <ProjectCard {...project} />
                </motion.div>
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
