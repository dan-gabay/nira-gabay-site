// Google Analytics 4 Events Tracking
// Based on GA4 Best Practices and Recommended Events

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

// ===== USER PROPERTIES (GA4 Recommended) =====
// Set user properties for better segmentation
export const setUserProperty = (propertyName: string, value: string | number | boolean) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('set', 'user_properties', {
      [propertyName]: value
    });
  }
};

// Identify returning visitors
export const identifyVisitorType = () => {
  if (typeof window === 'undefined') return;
  
  const visitCount = parseInt(localStorage.getItem('visit_count') || '0') + 1;
  localStorage.setItem('visit_count', visitCount.toString());
  
  setUserProperty('visitor_type', visitCount === 1 ? 'new' : 'returning');
  setUserProperty('visit_count', visitCount);
  
  // Set engagement level based on visits
  if (visitCount >= 5) {
    setUserProperty('engagement_level', 'high');
  } else if (visitCount >= 2) {
    setUserProperty('engagement_level', 'medium');
  } else {
    setUserProperty('engagement_level', 'low');
  }
};

// Track user interests based on content viewed
export const trackUserInterest = (interest: string) => {
  if (typeof window === 'undefined') return;
  
  const interests = JSON.parse(localStorage.getItem('user_interests') || '[]');
  if (!interests.includes(interest)) {
    interests.push(interest);
    localStorage.setItem('user_interests', JSON.stringify(interests.slice(-5))); // Keep last 5
    setUserProperty('primary_interest', interests[interests.length - 1]);
  }
};

// ===== GA4 RECOMMENDED EVENTS =====

// generate_lead - When a user submits a form (contact, booking, etc.)
export const trackGenerateLead = (leadSource: string, value?: number) => {
  trackEvent('generate_lead', {
    currency: 'ILS',
    value: value || 100, // Estimated lead value
    lead_source: leadSource,
  });
};

// search - When a user performs a search
export const trackSearch = (searchTerm: string, resultsCount?: number) => {
  trackEvent('search', {
    search_term: searchTerm,
    results_count: resultsCount,
  });
};

// select_content - When user selects content (article, service, etc.)
export const trackSelectContent = (contentType: string, contentId: string, contentName?: string) => {
  trackEvent('select_content', {
    content_type: contentType,
    content_id: contentId,
    content_name: contentName,
  });
};

// view_item - When user views an item (article page view)
export const trackViewItem = (itemId: string, itemName: string, itemCategory: string) => {
  trackEvent('view_item', {
    items: [{
      item_id: itemId,
      item_name: itemName,
      item_category: itemCategory,
    }]
  });
};

// share - GA4 recommended share event
export const trackShare = (method: string, contentType: string, itemId: string) => {
  trackEvent('share', {
    method: method,
    content_type: contentType,
    item_id: itemId,
  });
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

// Exit Intent
export const trackExitIntent = (pageUrl: string) => {
  trackEvent('exit_intent', {
    event_category: 'Engagement',
    event_label: pageUrl,
    value: 3,
  });
};

// Copy Contact Info
export const trackCopyContact = (contactType: 'phone' | 'email', value: string) => {
  trackEvent('copy_contact_info', {
    event_category: 'Lead',
    event_label: contactType,
    contact_value: value,
    value: 4,
  });
};

// Time Milestones
export const trackTimeMilestone = (minutes: number, pageUrl: string) => {
  trackEvent(`time_on_site_${minutes}min`, {
    event_category: 'Engagement',
    event_label: pageUrl,
    minutes: minutes,
  });
};

// Social Media Clicks
export const trackSocialClick = (platform: 'facebook' | 'whatsapp' | 'instagram', source: string) => {
  trackEvent('social_media_click', {
    event_category: 'Social',
    event_label: platform,
    source: source,
  });
};

// Hero CTA
export const trackHeroCTA = (action: string) => {
  trackEvent('hero_cta_click', {
    event_category: 'Conversion',
    event_label: action,
    value: 5,
  });
};

// Returning Visitor
export const trackReturningVisitor = (visitCount: number) => {
  trackEvent('returning_visitor', {
    event_category: 'User',
    event_label: `visit_${visitCount}`,
    visit_count: visitCount,
  });
};

// Article Completion (100% + time)
export const trackArticleCompletion = (articleId: string, readTime: number) => {
  trackEvent('article_completed', {
    event_category: 'Engagement',
    event_label: articleId,
    read_time_seconds: readTime,
    value: 3,
  });
};

// ===== NEW COMPREHENSIVE TRACKING =====

// Header Navigation
export const trackHeaderNavClick = (pageName: string) => {
  trackEvent('header_nav_click', {
    event_category: 'Navigation',
    event_label: pageName,
  });
};

export const trackHeaderLogoClick = () => {
  trackEvent('header_logo_click', {
    event_category: 'Navigation',
    event_label: 'logo',
  });
};

export const trackMobileMenuToggle = (action: 'open' | 'close') => {
  trackEvent('mobile_menu_toggle', {
    event_category: 'Navigation',
    event_label: action,
  });
};

// Footer
export const trackFooterLinkClick = (linkName: string) => {
  trackEvent('footer_link_click', {
    event_category: 'Navigation',
    event_label: linkName,
  });
};

// CTA Buttons
export const trackCTAClick = (ctaName: string, location: string) => {
  trackEvent('cta_click', {
    event_category: 'Conversion',
    event_label: ctaName,
    location: location,
    value: 5,
  });
};

// Article Page
export const trackArticleCardClick = (articleTitle: string, articleSlug: string, location?: string) => {
  trackEvent('article_card_click', {
    event_category: 'Content',
    event_label: articleTitle,
    article_slug: articleSlug,
    location: location || 'articles_page',
  });
};

export const trackArticleFilterChange = (filterType: 'tag' | 'search', value: string) => {
  trackEvent('article_filter', {
    event_category: 'Navigation',
    event_label: filterType,
    filter_value: value,
  });
};

export const trackBreadcrumbClick = (breadcrumbName: string) => {
  trackEvent('breadcrumb_click', {
    event_category: 'Navigation',
    event_label: breadcrumbName,
  });
};

// Contact Page
export const trackContactMethodClick = (method: 'whatsapp' | 'phone' | 'email' | 'facebook', location: string) => {
  trackEvent('contact_method_click', {
    event_category: 'Contact',
    event_label: method,
    location: location,
    value: 5,
  });
};

// About Page
export const trackAboutSectionView = (sectionName: string) => {
  trackEvent('about_section_view', {
    event_category: 'Content',
    event_label: sectionName,
  });
};

// Share buttons (already have trackArticleShare but adding more specific)
export const trackShareButtonClick = (platform: string, contentType: string, contentId: string) => {
  trackEvent('share_click', {
    event_category: 'Social',
    event_label: platform,
    content_type: contentType,
    content_id: contentId,
    value: 2,
  });
};

// Read more / View all buttons
export const trackReadMoreClick = (context: string, title?: string, location?: string) => {
  trackEvent('read_more_click', {
    event_category: 'Engagement',
    event_label: context,
    title: title,
    location: location,
  });
};

// Form interactions
export const trackFormStart = (formName: string) => {
  trackEvent('form_start', {
    event_category: 'Form',
    event_label: formName,
  });
};

export const trackFormFieldFocus = (formName: string, fieldName: string) => {
  trackEvent('form_field_focus', {
    event_category: 'Form',
    event_label: `${formName}_${fieldName}`,
  });
};

// Scroll to section
export const trackScrollToSection = (sectionName: string) => {
  trackEvent('scroll_to_section', {
    event_category: 'Navigation',
    event_label: sectionName,
  });
};

// ===== ADVANCED ENGAGEMENT TRACKING =====

// Scroll depth tracking with percentage thresholds
export const trackScrollDepth = (percentage: number, pageType: string, pageId?: string) => {
  // Only track at specific thresholds: 25%, 50%, 75%, 90%, 100%
  const thresholds = [25, 50, 75, 90, 100];
  if (!thresholds.includes(percentage)) return;
  
  trackEvent('scroll', {
    percent_scrolled: percentage,
    page_type: pageType,
    page_id: pageId,
  });
};

// Time on page engagement
export const trackEngagementTime = (seconds: number, pageType: string, pageId?: string) => {
  // Track at specific time milestones
  const milestones = [30, 60, 120, 180, 300]; // 30s, 1m, 2m, 3m, 5m
  if (!milestones.includes(seconds)) return;
  
  trackEvent('engagement_time', {
    engagement_time_seconds: seconds,
    page_type: pageType,
    page_id: pageId,
  });
};

// Outbound link clicks
export const trackOutboundLink = (url: string, linkText: string) => {
  trackEvent('click', {
    event_category: 'outbound',
    link_url: url,
    link_text: linkText,
    outbound: true,
  });
};

// File downloads (if applicable in future)
export const trackFileDownload = (fileName: string, fileType: string) => {
  trackEvent('file_download', {
    file_name: fileName,
    file_extension: fileType,
  });
};

// Video engagement (if videos are added)
export const trackVideoEngagement = (action: 'play' | 'pause' | 'complete', videoTitle: string, percentWatched?: number) => {
  trackEvent(`video_${action}`, {
    video_title: videoTitle,
    video_percent: percentWatched,
  });
};

// Error tracking
export const trackError = (errorType: string, errorMessage: string, pageUrl: string) => {
  trackEvent('exception', {
    description: errorMessage,
    error_type: errorType,
    page_url: pageUrl,
    fatal: false,
  });
};

// Page performance tracking
export const trackPagePerformance = (loadTime: number, pageType: string) => {
  trackEvent('page_timing', {
    page_load_time: loadTime,
    page_type: pageType,
    timing_category: 'Page Load',
  });
};

// ===== FUNNEL TRACKING FOR THERAPIST WEBSITE =====

// Funnel stages: Awareness → Interest → Consideration → Intent → Conversion
export const trackFunnelStage = (stage: 'awareness' | 'interest' | 'consideration' | 'intent' | 'conversion', details?: string) => {
  const stageValues: Record<string, number> = {
    'awareness': 1,
    'interest': 2,
    'consideration': 3,
    'intent': 5,
    'conversion': 10,
  };
  
  trackEvent('funnel_progress', {
    funnel_stage: stage,
    stage_details: details,
    value: stageValues[stage],
  });
};

// Track micro-conversions
export const trackMicroConversion = (action: string, source: string) => {
  trackEvent('micro_conversion', {
    conversion_action: action,
    conversion_source: source,
    value: 1,
  });
  
  // Also track user interest
  trackUserInterest(action);
};

// Related content click (important for content strategy)
export const trackRelatedContentClick = (fromArticle: string, toArticle: string, position: number) => {
  trackEvent('related_content_click', {
    from_article: fromArticle,
    to_article: toArticle,
    position: position,
    content_type: 'article',
  });
};

// Accessibility menu usage
export const trackAccessibilityUsage = (feature: string, enabled: boolean) => {
  trackEvent('accessibility_feature', {
    feature_name: feature,
    feature_enabled: enabled,
  });
};

// Print article (shows high intent)
export const trackPrintArticle = (articleId: string, articleTitle: string) => {
  trackEvent('print', {
    item_id: articleId,
    item_name: articleTitle,
    content_type: 'article',
    value: 3,
  });
};

// Copy text (indicates content value)
export const trackCopyText = (pageType: string, pageId?: string) => {
  trackEvent('copy_text', {
    page_type: pageType,
    page_id: pageId,
  });
};
