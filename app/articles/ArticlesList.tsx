"use client";

import { useEffect, useState } from "react";

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
};

export default function ArticlesList() {
  const [data, setData] = useState<Article[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/articles", { cache: "no-store" });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json = await res.json();
        setData(json.data ?? []);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      }
    })();
  }, []);

  if (error) return <div style={{ color: "crimson" }}>שגיאה: {error}</div>;
  if (!data.length) return <div>טוען…</div>;

  return (
    <ul>
      {data.map((a) => (
        <li key={a.id} style={{ marginBottom: 12 }}>
  <a href={`/articles/${a.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
    <div style={{ fontWeight: 700 }}>{a.title}</div>
    {a.excerpt ? <div style={{ opacity: 0.8 }}>{a.excerpt}</div> : null}
    <div style={{ fontSize: 12, opacity: 0.7 }}>{a.slug}</div>
  </a>
</li>

      ))}
    </ul>
  );
}
