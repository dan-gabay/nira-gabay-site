-- SQL לייבוא קישורים בין מאמרים לתגיות
-- הרץ את זה ב-Supabase SQL Editor

-- מאמר 1: "הקשיים שמביאים איתם החגים" - תגיות: חרדה, משפחה, זוגיות
INSERT INTO "public"."article_tags" ("article_id", "tag_id") VALUES
('69398ce3280a72fa93084a2a', '693c206864a4a78c261e9180'), -- חרדה
('69398ce3280a72fa93084a2a', '693c1baa0ba722053606471c'), -- משפחה  
('69398ce3280a72fa93084a2a', '693c1b24fc18bfd96c9ffaf5')  -- זוגיות
ON CONFLICT DO NOTHING;

-- מאמר 2: "משמעות המיקום במערך המשפחתי" - תגיות: משפחה, הורות, מתבגרים
INSERT INTO "public"."article_tags" ("article_id", "tag_id") VALUES
('69398ce3280a72fa93084a2b', '693c1baa0ba722053606471c'), -- משפחה
('69398ce3280a72fa93084a2b', '693c1b24fc18bfd96c9ffaf3'), -- הורות
('69398ce3280a72fa93084a2b', '693c1b24fc18bfd96c9ffaf4')  -- מתבגרים
ON CONFLICT DO NOTHING;

-- מאמר 3: "מה קורה למערכת היחסים הזוגית עם החזרה משרות המילואים?" - תגיות: משפחה, הורות, זוגיות, התמודדות
INSERT INTO "public"."article_tags" ("article_id", "tag_id") VALUES
('693def60c89ade254bab0726', '693c1baa0ba722053606471c'), -- משפחה
('693def60c89ade254bab0726', '693c1b24fc18bfd96c9ffaf3'), -- הורות
('693def60c89ade254bab0726', '693c1b24fc18bfd96c9ffaf5'), -- זוגיות
('693def60c89ade254bab0726', '693c2067be2d83d124f13950')  -- התמודדות
ON CONFLICT DO NOTHING;
