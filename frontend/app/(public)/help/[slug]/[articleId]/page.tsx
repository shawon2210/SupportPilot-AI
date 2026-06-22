import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Calendar } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface ArticleData {
  id: string;
  name: string;
  source_type: string;
  content: string;
  updated_at: string | null;
}

async function getArticle(slug: string, articleId: string): Promise<ArticleData | null> {
  try {
    const res = await fetch(`${API_BASE}/public/${slug}/articles/${articleId}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as ArticleData;
  } catch {
    return null;
  }
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string; articleId: string }>;
}) {
  const { slug, articleId } = await params;
  const article = await getArticle(slug, articleId);
  if (!article) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href={`/help/${slug}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to articles
      </Link>
      <article>
        <h1 className="text-3xl font-bold tracking-tight">{article.name}</h1>
        {article.updated_at && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Updated {new Date(article.updated_at).toLocaleDateString()}
          </div>
        )}
        <div className="prose prose-sm prose-neutral dark:prose-invert mt-8 max-w-none whitespace-pre-wrap">
          {article.content}
        </div>
      </article>
    </div>
  );
}
