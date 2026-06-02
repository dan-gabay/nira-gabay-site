// Schema.org structured data for services
export const servicesSchema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "name": "נירה גבאי - פסיכותרפיה והדרכת הורים",
  "alternateName": "Nira Gabay - Psychotherapy and Parenting Counseling",
  "description": "קליניקה לפסיכותרפיה, הדרכת הורים, טיפול זוגי וטיפול קוגניטיבי התנהגותי (CBT). מלווה מתבגרים, מבוגרים וזוגות בדרכם להגשמה עצמית.",
  "url": "https://www.niragabay.com",
  "telephone": "+972-50-7936681",
  "email": "niraga1123@gmail.com",
  "image": "https://70wu4ifcxmk7qisg.public.blob.vercel-storage.com/hero-desktop.png",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "שואבה",
    "addressRegion": "ירושלים",
    "addressCountry": "IL"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "31.7907",
    "longitude": "35.0644"
  },
  "priceRange": "$$",
  "paymentAccepted": "מזומן, העברה בנקאית, אשראי",
  "areaServed": [
    {
      "@type": "City",
      "name": "שואבה"
    },
    {
      "@type": "City",
      "name": "ירושלים"
    },
    {
      "@type": "City",
      "name": "מבשרת ציון"
    },
    {
      "@type": "City",
      "name": "בית שמש"
    },
    {
      "@type": "City",
      "name": "מודיעין"
    }
  ],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "שירותי פסיכותרפיה",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "פסיכותרפיה",
          "description": "טיפול פסיכותרפי מקצועי למתבגרים ומבוגרים",
          "serviceType": "פסיכותרפיה"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "הדרכת הורים",
          "description": "כלים מעשיים להורות מיטבית, הבנת עולמם של הילדים ובניית קשר משפחתי בריא",
          "serviceType": "הדרכת הורים"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "טיפול זוגי",
          "description": "חיזוק הקשר הזוגי, שיפור התקשורת והתמודדות עם משברים מתוך הבנה ואמפתיה",
          "serviceType": "טיפול זוגי"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "טיפול קוגניטיבי התנהגותי (CBT)",
          "description": "גישה מעשית ומוכחת מדעית לטיפול בחרדות, דיכאון, פוביות ודפוסי חשיבה שליליים",
          "serviceType": "CBT"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "טיפול מיני",
          "description": "התמחות במיניות בריאה, ליווי זוגות ויחידים בנושאי אינטימיות וחיי מין",
          "serviceType": "טיפול מיני"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "טיפול במתבגרים",
          "description": "ליווי מקצועי ורגיש בתקופה מאתגרת של התבגרות, עם דגש על בניית ביטחון עצמי",
          "serviceType": "טיפול במתבגרים"
        }
      }
    ]
  }
};
