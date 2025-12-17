// app/articles/page.tsx
import Link from "next/link";

export default async function ArticlesPage() {
  const res = await fetch("http://127.0.0.1:3000/api/articles", {
    cache: "no-store",
  });

  const json = await res.json();
  const articles = (json.data ?? []) as any[];

  return (
    <main style={{ padding: 24, direction: "rtl", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 16 }}>מאמרים</h1>

      <div style={{ display: "grid", gap: 12 }}>
        {articles.map((a) => (
          <Link
            key={a.id}
            href={`/articles/${a.slug}`}
            style={{
              display: "block",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 16,
              textDecoration: "none",
              color: "inherit",
              background: "white",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{a.title}</div>
            {a.excerpt ? (
              <div style={{ opacity: 0.85, lineHeight: 1.6 }}>{a.excerpt}</div>
            ) : null}
            <div style={{ marginTop: 10, opacity: 0.7, fontSize: 13 }}>slug: {a.slug}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
