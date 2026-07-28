-- Seed full landing page CMS defaults (merged with existing admin edits on deploy).

UPDATE platform_settings
SET value = '{
  "hero": {
    "badge": "Transparent Pool Trading Fund",
    "heading": "Where Great Traders Meet Smart Investors.",
    "subheading": "",
    "description": "RyvonX is a trusted marketplace where skilled traders earn the opportunity to manage investment pools, while investors discover and invest alongside verified trading professionals.",
    "primaryButtonText": "Join Pool",
    "primaryButtonLink": "/register?intent=join_pool",
    "secondaryButtonText": "Create Pool",
    "secondaryButtonLink": "/register?intent=create_pool",
    "backgroundImageUrl": "/images/hero-cover.png",
    "illustrationImageUrl": "",
    "videoUrl": "",
    "trustBanner": "",
    "showTrustTicker": true,
    "floatingStats": []
  },
  "sections": {
    "hero": true,
    "performance": true,
    "journal": true,
    "recentActivity": true,
    "statistics": true,
    "howItWorks": true,
    "whyRyvonx": true,
    "testimonials": true,
    "faq": true,
    "contact": true,
    "ctaBanner": false
  }
}'::jsonb || COALESCE(value, '{}'::jsonb),
    description = 'Public landing page CMS content (hero, stats, sections, footer, SEO)'
WHERE key = 'landing_content';
