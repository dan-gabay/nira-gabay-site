// Google Analytics 4 Events Tracking

declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config?: Record<string, any>
    ) => void;
  }
}

export const trackEvent = (
  eventName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventParams?: Record<string, any>
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
  }
};

// Conversion Events
export const trackWhatsAppClick = (source: string) => {
  trackEvent('contact_whatsapp', {
    event_category: 'Contact',
    event_label: source,
    value: 1,
  });
};

export const trackPhoneClick = (source: string) => {
  trackEvent('contact_phone', {
    event_category: 'Contact',
    event_label: source,
    value: 1,
  });
};

export const trackContactFormSubmit = (formType: string) => {
  trackEvent('contact_form_submit', {
    event_category: 'Lead',
    event_label: formType,
    value: 5,
  });
};

export const trackCommentSubmit = (articleId: string) => {
  trackEvent('comment_submit', {
    event_category: 'Engagement',
    event_label: articleId,
    value: 3,
  });
};

export const trackArticleRead = (articleId: string, articleTitle: string) => {
  trackEvent('article_read', {
    event_category: 'Content',
    event_label: articleTitle,
    article_id: articleId,
    value: 2,
  });
};

export const trackArticleLike = (articleId: string, articleTitle: string) => {
  trackEvent('article_like', {
    event_category: 'Engagement',
    event_label: articleTitle,
    article_id: articleId,
    value: 1,
  });
};

export const trackArticleShare = (
  platform: string,
  articleId: string,
  articleTitle: string
) => {
  trackEvent('share', {
    event_category: 'Social',
    method: platform,
    content_type: 'article',
    item_id: articleId,
    event_label: articleTitle,
    value: 2,
  });
};

export const trackBookingIntent = (source: string) => {
  trackEvent('booking_intent', {
    event_category: 'Lead',
    event_label: source,
    value: 10,
  });
};

// Navigation & Engagement Events
export const trackPageNavigation = (pageName: string, fromPage: string) => {
  trackEvent('navigation_click', {
    event_category: 'Navigation',
    event_label: pageName,
    from_page: fromPage,
  });
};

export const trackArticleScrollDepth = (depth: number, articleId: string) => {
  trackEvent(`scroll_depth_${depth}`, {
    event_category: 'Engagement',
    event_label: articleId,
    scroll_percentage: depth,
  });
};

export const trackTagClick = (tagName: string, articleId?: string) => {
  trackEvent('tag_click', {
    event_category: 'Navigation',
    event_label: tagName,
    article_id: articleId,
  });
};

export const trackInternalLinkClick = (linkUrl: string, linkText: string) => {
  trackEvent('internal_link_click', {
    event_category: 'Navigation',
    event_label: linkText,
    link_url: linkUrl,
  });
};

export const trackServiceInterest = (serviceName: string) => {
  trackEvent('service_interest', {
    event_category: 'Interest',
    event_label: serviceName,
    value: 2,
  });
};
