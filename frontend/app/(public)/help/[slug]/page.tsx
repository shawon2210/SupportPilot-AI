import { ArticleList } from "./article-list";
import { notFound } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

async function getArticles(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/public/${slug}/articles`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as { id: string; name: string; source_type: string; updated_at: string | null }[];
  } catch {
    return null;
  }
}

export default async function HelpCenterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const articles = await getArticles(slug);
  if (!articles) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Help Center</h1>
      <p className="mt-2 text-muted-foreground">Browse our knowledge base articles.</p>
      <ArticleList slug={slug} initial={articles} />
    </div>
  );
}
