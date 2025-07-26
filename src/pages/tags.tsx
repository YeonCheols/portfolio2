import { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useMemo, useState } from "react";
import { NextSeo } from "next-seo";

import Container from "@/common/components/elements/Container";
import PageHeading from "@/common/components/elements/PageHeading";
import SectionHeading from "@/common/components/elements/SectionHeading";
import axios from "axios";
import { TagResponse } from "@docs/api";

interface TagsPageProps {
  tags: TagResponse[];
}

export default function TagsPage({ tags }: TagsPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "count">("name");

  const filteredTags = useMemo(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return [...tags]
      .filter((tag) => tag.name.toLowerCase().includes(lowercasedSearchTerm))
      .sort((a, b) => {
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        }
        return b.projectCount - a.projectCount;
      });
  }, [tags, searchTerm, sortBy]);

  return (
    <>
      <NextSeo title={`연철s - 태그모음`} />

      <Container>
        <PageHeading title="Tags" description="All tags by projects" />

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeading title={`All Tags (${tags.length})`} />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="search-tags" className="sr-only">
              Search tags
            </label>
            <input
              id="search-tags"
              type="text"
              placeholder="Search tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />

            <label htmlFor="sort-tags" className="sr-only">
              Sort by
            </label>
            <select
              id="sort-tags"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "name" | "count")}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            >
              <option value="name">Sort by Name</option>
              <option value="count">Sort by Count</option>
            </select>
          </div>
        </div>

        {filteredTags.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-600 dark:text-neutral-400">
              No tags found matching &quot;{searchTerm}&quot;
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {filteredTags.map((tag) => (
              <Link
                key={tag.name}
                href={`/tags/${tag.name}`}
                className="group inline-flex items-center gap-2 rounded-full bg-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition-all hover:bg-neutral-300 hover:scale-105 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                <div className="h-2 w-2 rounded-full bg-neutral-500 dark:bg-neutral-600"></div>
                <span>{tag.name}</span>
                <span className="text-neutral-500 dark:text-neutral-500">
                  ({tag.projectCount})
                </span>
              </Link>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    const { data } = await axios.get(`${process.env.API_URL}/tag`);

    return {
      props: {
        tags: data || [],
      },
    };
  } catch (error) {
    console.error("Error fetching tags:", error);
    return {
      props: {
        tags: [],
      },
    };
  }
};
