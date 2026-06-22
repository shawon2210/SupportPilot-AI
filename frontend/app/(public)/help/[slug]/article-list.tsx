"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Article {
  id: string;
  name: string;
  source_type: string;
  updated_at: string | null;
}

export function ArticleList({ slug, initial }: { slug: string; initial: Article[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return initial;
    const q = query.toLowerCase();
    return initial.filter((a) => a.name.toLowerCase().includes(q));
  }, [query, initial]);

  return (
    <div className="mt-8 space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search articles..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">
          {query ? "No articles match your search." : "No articles have been published yet."}
        </p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {filtered.map((article) => (
            <Link
              key={article.id}
              href={`/help/${slug}/${article.id}`}
              className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-accent"
            >
              <span className="text-sm font-medium">{article.name}</span>
              {article.updated_at && (
                <span className="text-xs text-muted-foreground">
                  {new Date(article.updated_at).toLocaleDateString()}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
