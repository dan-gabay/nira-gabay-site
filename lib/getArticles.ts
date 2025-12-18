import { supabaseServer } from './supabaseServer';

export async function getArticles() {
  const supabase = supabaseServer();
  
  const { data, error } = await supabase
    .from('articles')
    .select(`
      id,
      title,
      slug,
      excerpt,
      content,
      image_url,
      reading_time,
      likes_count,
      views_count,
      created_date,
      is_published,
      article_tags(
        tags(
          name
        )
      )
    `)
    .eq('is_published', true)
    .order('created_date', { ascending: false });

  if (error) {
    console.error('Error fetching articles:', error);
    return { data: [] };
  }

  // Transform the data to include tag names
  const articles = (data || []).map((article: any) => ({
    ...article,
    tag_names: (article.article_tags || []).map((at: any) => at.tags?.name).filter(Boolean)
  }));

  return { data: articles };
}
