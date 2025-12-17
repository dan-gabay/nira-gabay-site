// app/articles/[slug]/page.tsx
type Props = { params: { slug: string } };

export default async function ArticlePage({ params }: Props) {
  const slug = params.slug;

  const res = await fetch(`http://127.0.0.1:3000/api/articles?slug=${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });

  const json = await res.json();
  const article = json.data;

  if (!article) {
    return (
      <main style={{ padding: 24, direction: "rtl", maxWidth: 900, margin: "0 auto" }}>
        <h1>לא נמצא</h1>
        <p>אין מאמר עם slug: {slug}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, direction: "rtl", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>{article.title}</h1>
      {article.excerpt ? (
        <p style={{ opacity: 0.85, lineHeight: 1.7, marginTop: 0 }}>{article.excerpt}</p>
      ) : null}

      <div style={{ opacity: 0.7, fontSize: 13, marginBottom: 16 }}>
        slug: {article.slug}
      </div>

      <pre style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{article.content}</pre>
    </main>
  );
}
