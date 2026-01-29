"use client"

import { useEffect } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useInView } from "react-intersection-observer"

import { api } from "@/lib/api"
import type { ApiResponse } from "@/types"

interface UseInfiniteListOptions<TKey extends string> {
  queryKey: readonly unknown[]
  endpoint: string
  dataKey: TKey
  limit?: number
  enabled?: boolean
}

type PageData<TKey extends string, TItem> = {
  nextCursor: string | null
} & Record<TKey, TItem[]>

export function useInfiniteList<TItem, TKey extends string = string>({
  queryKey,
  endpoint,
  dataKey,
  limit = 20,
  enabled = true,
}: UseInfiniteListOptions<TKey>) {
  const { ref, inView } = useInView({ rootMargin: "300px" })

  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<ApiResponse<PageData<TKey, TItem>>>(
        endpoint,
        { params: { limit, cursor: pageParam } }
      )
      if (!data.data) {
        throw new Error("Data unavailable")
      }
      return data.data
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
  })

  useEffect(() => {
    if (inView && query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage()
    }
  }, [inView, query])

  return { ...query, loadMoreRef: ref }
}
