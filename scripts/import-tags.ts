/**
 * סקריפט לייבוא תגיות מהשדה tags (JSON) לטבלאות tags ו-article_tags
 * מריץ פעם אחת כדי למגר את הנתונים
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// טען את משתני הסביבה מ-.env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ חסרים משתני סביבה! וודא ש-.env.local קיים ומכיל:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importTags() {
  console.log('🚀 מתחיל ייבוא תגיות...\n');

  // 1. שלוף את כל המאמרים
  const { data: articles, error: articlesError } = await supabase
    .from('articles')
    .select('id, title, tags');

  if (articlesError) {
    console.error('❌ שגיאה בשליפת מאמרים:', articlesError);
    return;
  }

  console.log(`✅ נמצאו ${articles?.length || 0} מאמרים\n`);

  // 2. אסוף את כל התגיות הייחודיות
  const allTags = new Set<string>();
  
  articles?.forEach((article) => {
    if (article.tags && Array.isArray(article.tags)) {
      article.tags.forEach((tag: string) => allTags.add(tag));
    }
  });

  console.log(`📝 נמצאו ${allTags.size} תגיות ייחודיות:`, Array.from(allTags).join(', '));
  console.log();

  // 3. הכנס את התגיות לטבלת tags (אם הן לא קיימות)
  const tagsMap = new Map<string, string>();

  for (const tagName of allTags) {
    // בדוק אם התגית כבר קיימת
    const { data: existingTag } = await supabase
      .from('tags')
      .select('id, name')
      .eq('name', tagName)
      .single();

    if (existingTag) {
      tagsMap.set(tagName, existingTag.id);
      console.log(`✓ התגית "${tagName}" כבר קיימת (${existingTag.id})`);
    } else {
      // צור תגית חדשה
      const { data: newTag, error: tagError } = await supabase
        .from('tags')
        .insert({ name: tagName })
        .select()
        .single();

      if (tagError) {
        console.error(`❌ שגיאה ביצירת תגית "${tagName}":`, tagError);
      } else {
        tagsMap.set(tagName, newTag.id);
        console.log(`✅ נוצרה תגית חדשה: "${tagName}" (${newTag.id})`);
      }
    }
  }

  console.log('\n📊 מתחיל קישור תגיות למאמרים...\n');

  // 4. קשר כל מאמר לתגיות שלו דרך article_tags
  for (const article of articles || []) {
    if (!article.tags || !Array.isArray(article.tags)) {
      continue;
    }

    console.log(`\n📄 מעבד מאמר: "${article.title}"`);

    // מחק קישורים קיימים (למקרה שזה לא הריצה הראשונה)
    await supabase
      .from('article_tags')
      .delete()
      .eq('article_id', article.id);

    // צור קישורים חדשים
    for (const tagName of article.tags) {
      const tagId = tagsMap.get(tagName);
      
      if (!tagId) {
        console.error(`  ❌ לא נמצא ID עבור תגית "${tagName}"`);
        continue;
      }

      const { error: linkError } = await supabase
        .from('article_tags')
        .insert({
          article_id: article.id,
          tag_id: tagId
        });

      if (linkError) {
        console.error(`  ❌ שגיאה בקישור תגית "${tagName}":`, linkError);
      } else {
        console.log(`  ✅ קושר תגית: "${tagName}"`);
      }
    }
  }

  console.log('\n\n🎉 ייבוא התגיות הושלם בהצלחה!');
}

// הרץ את הסקריפט
importTags().catch(console.error);
