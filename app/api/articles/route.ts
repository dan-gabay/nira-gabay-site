// app/api/articles/route.ts
import { getArticles } from "@/lib/getArticles";

export const runtime = "nodejs";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");

    const { data } = await getArticles();

    if (slug) {
      const article = (data ?? []).find((a: any) => a.slug === slug) ?? null;
      if (!article) return jsonResponse({ error: { message: "Not found", code: "not_found" } }, 404);
      return jsonResponse({ data: article });
    }

    return jsonResponse({ data: data ?? [] });
  } catch (err: any) {
    console.error("GET /api/articles failed:", err);
    return jsonResponse({ error: { message: err?.message ?? String(err), code: "internal_error" } }, 500);
  }
}
