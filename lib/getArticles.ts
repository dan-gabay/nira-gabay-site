export async function getArticles() {
  return {
    data: [
      {
        id: "1",
        title: "דוגמה",
        slug: "example",
        excerpt: "תוכן לדוגמה",
        content: `# כותרת
זה טקסט רגיל.

## תת־כותרת
- נקודה 1
- נקודה 2`,
      },
    ],
  };
}
