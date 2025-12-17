// src/lib/articles.ts
import { supabaseServer } from "@/lib/supabaseServer";

export type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  image_url: string | null;
  reading_time: number | null;
  likes_count: number | null;
  views_count: number | null;
  tags: string; // נשמר כטקסט (לרוב JSON-string)
  is_published: boolean | null;
  created_date: string | null;
  updated_date: string | null;
  created_by_id: string | null;
  created_by: string | null;
  is_sample: boolean | null;
};

const SELECT = `
  id,
  title,
  slug,
  content,
  excerpt,
  image_url,
  reading_time,
  likes_count,
  views_count,
  tags,
  is_published,
  created_date,
  updated_date,
  created_by_id,
  created_by,
  is_sample
` as const;

export async function getArticles() {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("articles")
    .select(SELECT)
    .eq("is_published", true)
    .order("updated_date", { ascending: false, nullsFirst: false })
    .order("created_date", { ascending: false, nullsFirst: false });

  if (error) throw error;

  return { data: (data ?? []) as ArticleRow[] };
}

export async function getArticleBySlug(slug: string) {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("articles")
    .select(SELECT)
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return { data: (data ?? null) as ArticleRow | null };
}
