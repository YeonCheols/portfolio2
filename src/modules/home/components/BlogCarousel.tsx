import { motion } from "framer-motion";
import { useMemo, useRef } from "react";
import { useDraggable } from "react-use-draggable-scroll";
import useSWR from "swr";

import BlogCardNewSkeleton from "@/common/components/skeleton/BlogCardNewSkeleton";
import { BlogItemProps } from "@/common/types/blog";
import BlogCardNew from "@/modules/blog/components/BlogCardNew";
import { fetcher } from "@/services/fetcher";
import EmptyState from "@/common/components/elements/EmptyState";

const BlogCarousel = () => {
  const { data, error, isLoading } = useSWR(
    `/api/blog?page=1&per_page=4`,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 0,
    }
  );

  const blogData: BlogItemProps[] = useMemo(() => {
    return data?.data?.posts || [];
  }, [data]);

  const ref =
    useRef<HTMLDivElement>() as React.MutableRefObject<HTMLInputElement>;
  const { events } = useDraggable(ref);

  const renderBlogCards = () => {
    if (isLoading) {
      return Array.from({ length: 3 }, (_, index) => (
        <BlogCardNewSkeleton key={index} />
      ));
    }

    return blogData.map((item, index) => (
      <motion.div
        key={index}
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -100 }}
        transition={{ duration: 0.5 }}
        className="min-w-[326px] gap-x-5"
      >
        <BlogCardNew {...item} />
      </motion.div>
    ));
  };

  const renderEmptyState = () => {
    if (error || blogData.length === 0) {
      return (
        <EmptyState
          className="w-full"
          message={error ? "오류가 발생했습니다" : "포스트가 없습니다"}
        />
      );
    }
  };

  return (
    <div
      className="flex gap-4 overflow-x-scroll p-1 scrollbar-hide"
      {...events}
      ref={ref}
    >
      {renderBlogCards()}
      {renderEmptyState()}
    </div>
  );
};

export default BlogCarousel;
