import { supabaseServer } from "@/lib/supabaseServer";

function safeJsonParse<T>(value: any, fallback: T): T {
  try {
    if (typeof value !== "string") return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeTags(raw: any): string[] {
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  if (typeof raw === "string") {
    // יכול להיות JSON string: ["משפחה","זוגיות"]
    const parsed = safeJsonParse<any>(raw, null);
    if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    // או comma-separated
    if (raw.includes(",")) return raw.split(",").map(s => s.trim()).filter(Boolean);
    return raw ? [raw] : [];
  }
  return [];
}

function makeExcerpt(excerpt: any, content: any): string {
  const ex = typeof excerpt === "string" ? excerpt.trim() : "";
  if (ex) return ex;
  const c = typeof content === "string" ? content.trim() : "";
  if (!c) return "";
  return c.slice(0, 220) + (c.length > 220 ? "…" : "");
}

export async function getArticles() {
  const supabase = supabaseServer();

  // בוחרים * כדי שלא נהיה תלויים בדיוק בשמות עמודות
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .order("updated_date", { ascending: false })
    .order("created_date", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []).map((row: any) => {
    const tagsArr = normalizeTags(row.tags ?? row.tag_names ?? []);

    return {
      id: String(row.id ?? ""),
      title: String(row.title ?? ""),
      slug: String(row.slug ?? ""),
      content: row.content ?? null,
      excerpt: makeExcerpt(row.excerpt, row.content),
      image_url: row.image_url ?? null,
      reading_time: row.reading_time ?? null,
      likes_count: row.likes_count ?? 0,
      views_count: row.views_count ?? 0,
      tags: Array.isArray(row.tags) ? row.tags : (typeof row.tags === "string" ? row.tags : JSON.stringify(tagsArr)),
      is_published: row.is_published ?? true,
      created_date: row.created_date ?? row.created_at ?? null,
      updated_date: row.updated_date ?? row.updated_at ?? null,
      created_by: row.created_by ?? null,
      created_by_id: row.created_by_id ?? null,
      is_sample: row.is_sample ?? false,
      tag_names: Array.isArray(row.tag_names) ? row.tag_names : tagsArr,
    };
  });

  return { data: rows };
}
