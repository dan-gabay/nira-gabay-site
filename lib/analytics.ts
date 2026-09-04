// Google Analytics 4 Events Tracking
// Based on GA4 Best Practices and Recommended Events
//
// The handful of events that also matter to an ad platform additionally call
// into lib/conversions.ts. Everything else stays first-party.

import { reportContactConversion, reportLeadConversion } from './conversions';
import { usingGtm } from './tagging';
import {
  isTrackedEvent,
  pageTypeFor,
  entityFor,
  type SiteEventPayload,
} from './siteEvents';

declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config?: Record<string, any>
    ) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataLayer?: Record<string, any>[];
  }
}

// An anonymous per-visit id. Session storage, not local: it dies with the tab,
// so it separates one visit from another and cannot follow anyone around.
function sessionId(): string | null {
  try {
    const KEY = 'se_sid';
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null; // private mode, storage disabled - the event still sends
  }
}

/**
 * The campaign that started this session, remembered for the whole session.
 *
 * Two bugs this fixes. The utm parameters were read off the current URL on
 * every event, but they only exist on the landing URL - so a WhatsApp click
 * two pages later carried no campaign at all, and the dashboard credited the
 * visit but not the conversion it produced. And Google Ads auto-tagging sends
 * gclid rather than utm, so every paid visit read as organic.
 *
 * Captured once per session in sessionStorage, which is the right lifetime:
 * localStorage would let an ad click from last month claim today's organic
 * visit, and that is lead attribution, a different question, already handled
 * separately in lib/attribution.ts.
 *
 * The click id itself is never stored or sent - only which platform it came
 * from. It is a per-click identifier, and this table holds none.
 */
type SessionCampaign = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  click_kind: string | null;
};

const CAMPAIGN_KEY = 'site_session_campaign_v1';

function sessionCampaign(): SessionCampaign {
  const empty: SessionCampaign = {
    utm_source: null, utm_medium: null, utm_campaign: null,
    utm_term: null, utm_content: null, click_kind: null,
  };
  if (typeof window === 'undefined') return empty;

  try {
    const cached = sessionStorage.getItem(CAMPAIGN_KEY);
    if (cached) return JSON.parse(cached) as SessionCampaign;
  } catch {
    return empty; // storage unavailable - attribution is best effort
  }

  const q = new URLSearchParams(window.location.search);
  const clickKind =
    q.get('gclid') || q.get('wbraid') || q.get('gbraid') ? 'google'
    : q.get('fbclid') ? 'meta'
    : null;

  const captured: SessionCampaign = {
    utm_source: q.get('utm_source'),
    utm_medium: q.get('utm_medium'),
    utm_campaign: q.get('utm_campaign'),
    utm_term: q.get('utm_term'),
    utm_content: q.get('utm_content'),
    click_kind: clickKind,
  };

  try {
    sessionStorage.setItem(CAMPAIGN_KEY, JSON.stringify(captured));
  } catch {
    // ignore
  }
  return captured;
}


// Mirror the events worth keeping into our own store (lib/siteEvents.ts).
//
// sendBeacon is the point of this function. The WhatsApp and phone CTAs
// navigate away the instant they are clicked, and a fetch dies with the page.
// A beacon is handed to the browser and delivered regardless, which is why the
// conversions that matter most are the ones that actually arrive here.
function mirrorToStore(
  eventName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: Record<string, any>,
): void {
  if (typeof window === 'undefined' || !isTrackedEvent(eventName)) return;

  try {
    const path = window.location.pathname;
    const ref = document.referrer;

    const payload: SiteEventPayload = {
      event_name: eventName,
      path,
      page_type: pageTypeFor(path),
      entity: entityFor(path),
      source: params?.event_label ?? params?.source ?? null,
      session_id: sessionId(),
      referrer_host: ref ? new URL(ref).hostname : null,
      ...sessionCampaign(),
    };

    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
    } else {
      void fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      });
    }
  } catch {
    // Measurement must never break a CTA.
  }
}

// Under GTM every event goes to dataLayer and nowhere else. GTM defines
// window.gtag as a side effect of loading GA4, so calling both would send each
// event twice: once directly and once through the container's GA4 event tag.
export const trackEvent = (
  eventName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventParams?: Record<string, any>
) => {
  if (typeof window === 'undefined') return;

  // Our own store gets the event either way - it is independent of which ad
  // platform is loaded, and of whether one loaded at all.
  mirrorToStore(eventName, eventParams);

  if (usingGtm) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...eventParams });
    return;
  }

  window.gtag?.('event', eventName, eventParams);
};

// ===== USER PROPERTIES (GA4 Recommended) =====
// Set user properties for better segmentation
export const setUserProperty = (propertyName: string, value: string | number | boolean) => {
  if (typeof window === 'undefined') return;

  if (usingGtm) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'set_user_property', property: propertyName, value });
    return;
  }

  window.gtag?.('set', 'user_properties', { [propertyName]: value });
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

// generate_lead - a real therapy/parent-guidance inquiry (contact form).
// Do NOT fire this for newsletter signups - that's trackSignUp - or the
// lead KPI stops meaning "someone asked about therapy".
export const trackGenerateLead = (leadSource: string, value?: number) => {
  trackEvent('generate_lead', {
    currency: 'ILS',
    value: value || 100, // Estimated lead value
    lead_source: leadSource,
  });
};

// sign_up - GA4 recommended event for newsletter/mailing-list signups
export const trackSignUp = (source: string) => {
  trackEvent('sign_up', {
    method: 'newsletter',
    source: source,
  });
  reportLeadConversion(source);
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
  reportContactConversion('whatsapp');
};

export const trackPhoneClick = (source: string) => {
  trackEvent('contact_phone', {
    event_category: 'Contact',
    event_label: source,
    value: 1,
  });
  reportContactConversion('phone');
};

export const trackContactFormSubmit = (formType: string) => {
  trackEvent('contact_form_submit', {
    event_category: 'Lead',
    event_label: formType,
    value: 5,
  });
  reportContactConversion('form');
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

// Contact methods - each fires its own event NAME (contact_phone,
// contact_email, ...) because GA4 key events are designated per event name;
// a shared contact_method_click with a method param could never make "phone
// clicks" a conversion on its own.
export const trackContactMethodClick = (method: 'whatsapp' | 'phone' | 'email' | 'facebook', location: string) => {
  if (method === 'facebook') {
    trackSocialClick('facebook', location);
    return;
  }
  trackEvent(`contact_${method}`, {
    event_category: 'Contact',
    event_label: location,
    value: 5,
  });
  // This, not trackPhoneClick, is what the phone and email CTAs actually call.
  reportContactConversion(method);
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
