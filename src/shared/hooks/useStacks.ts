import { getIconComponent } from "@yeoncheols/portfolio-core-ui";
import React from "react";
import useSWR from "swr";
import { TagResponse, TagSearchResponse } from "@docs/api";
import { fetcher } from "@/shared/api/fetcher";

export const useStacks = (iconSize: number = 20) => {
  const { data: stacksData, isLoading: isStacksLoading } =
    useSWR<TagSearchResponse>("/api/stacks", fetcher, {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    });

  const rawStackItems = stacksData?.data;
  const stackItems = Array.isArray(rawStackItems) ? rawStackItems : [];
  const StackIcons: Record<string, JSX.Element> = stackItems.reduce(
    (acc: Record<string, JSX.Element>, item: TagResponse) => {
      const IconComponent = getIconComponent(item.icon);
      if (!IconComponent) {
        return acc;
      }
      acc[item.name] = React.createElement(IconComponent, {
        size: iconSize,
        className: `${item.color}`,
        title: item.name,
      });
      return acc;
    },
    {},
  );

  return {
    stacksData,
    StackIcons,
    isStacksLoading,
  };
};
