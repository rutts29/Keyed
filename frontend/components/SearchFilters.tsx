"use client";

import { FileText, Hash, LayoutGrid, Users } from "lucide-react";

import { cn } from "@/lib/utils";

export type SearchFilter = "all" | "posts" | "creators" | "tags";

interface SearchFiltersProps {
  activeFilter: SearchFilter;
  onFilterChange: (filter: SearchFilter) => void;
  className?: string;
}

const filters: { value: SearchFilter; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All", icon: LayoutGrid },
  { value: "posts", label: "Posts", icon: FileText },
  { value: "creators", label: "Creators", icon: Users },
  { value: "tags", label: "Tags", icon: Hash },
];

export function SearchFilters({
  activeFilter,
  onFilterChange,
  className,
}: SearchFiltersProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {filters.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => onFilterChange(value)}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
            activeFilter === value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
