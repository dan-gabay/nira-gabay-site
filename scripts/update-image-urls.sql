-- עדכון כל ה-URLs של תמונות במאמרים מ-base44.app ל-Supabase
-- הרץ את זה ב-Supabase SQL Editor

-- בדיקה ראשונית - כמה מאמרים יש עם base44.app
SELECT id, title, image_url 
FROM articles 
WHERE image_url LIKE '%base44.app%';

-- עדכון התמונות (רק אם אתה רוצה לעדכן אוטומטית)
-- זה יחליף את base44.app ב-Supabase Storage URL
-- שים לב: זה דוגמה - תצטרך להתאים את ה-URL בהתאם למבנה שלך

UPDATE articles
SET image_url = REPLACE(
  image_url, 
  'https://base44.app/api/apps/6939893ccce1b9a0f8ccda5e/files/public/',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6939893ccce1b9a0f8ccda5e/'
)
WHERE image_url LIKE '%base44.app%';

-- בדיקה אחרי העדכון
SELECT id, title, image_url 
FROM articles 
WHERE image_url LIKE '%supabase%';
