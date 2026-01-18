"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

import { api } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { ApiResponse } from "@/types"

const RECENT_KEY = "solshare-recent-searches"
const MAX_RECENTS = 5

type SuggestResponse = {
  suggestions: string[]
}

export function SearchBar({ className }: { className?: string }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [recent, setRecent] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasApi = Boolean(process.env.NEXT_PUBLIC_API_URL)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_KEY)
      if (saved) {
        setRecent(JSON.parse(saved))
      }
    } catch {
      setRecent([])
    }
  }, [])

  useEffect(() => {
    if (!hasApi) return
    const trimmed = query.trim()
    if (!trimmed) {
      setSuggestions([])
      return
    }

    const handle = setTimeout(async () => {
      try {
        const { data } = await api.get<ApiResponse<SuggestResponse>>(
          "/search/suggest",
          { params: { q: trimmed } }
        )
        setSuggestions(data.data?.suggestions ?? [])
      } catch {
        setSuggestions([])
      }
    }, 300)

    return () => clearTimeout(handle)
  }, [hasApi, query])

  const allSuggestions = useMemo(() => {
    if (query.trim()) return suggestions
    return recent
  }, [query, recent, suggestions])

  const handleSubmit = (value?: string) => {
    const term = (value ?? query).trim()
    if (!term) return
    const next = [term, ...recent.filter((item) => item !== term)].slice(
      0,
      MAX_RECENTS
    )
    setRecent(next)
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    } catch {
      // Ignore storage errors.
    }
    setIsOpen(false)
    router.push(`/search?q=${encodeURIComponent(term)}`)
  }

  const handleBlur = () => {
    blurTimeout.current = setTimeout(() => setIsOpen(false), 120)
  }

  const handleFocus = () => {
    if (blurTimeout.current) {
      clearTimeout(blurTimeout.current)
    }
    setIsOpen(true)
  }

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search creators, posts, or drops (e.g. cozy workspaces)"
        className="h-10 pl-9"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            handleSubmit()
          }
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {isOpen && allSuggestions.length > 0 ? (
        <div className="absolute top-full z-20 mt-2 w-full rounded-xl border border-border/70 bg-background/95 p-2 shadow-lg">
          <p className="px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {query.trim() ? "Suggestions" : "Recent searches"}
          </p>
          <div className="space-y-1">
            {allSuggestions.map((item) => (
              <button
                key={item}
                type="button"
                className="flex w-full items-center rounded-lg px-2 py-2 text-left text-sm text-foreground transition hover:bg-muted/60"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSubmit(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
