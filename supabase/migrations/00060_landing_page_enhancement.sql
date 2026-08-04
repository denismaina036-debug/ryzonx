-- Landing page enhancement: broker compatibility, featured managers, live platform stats defaults.

UPDATE platform_settings
SET value = '{
  "sections": {
    "brokerCompatibility": true,
    "featuredPoolManagers": true
  },
  "settings": {
    "enableSectionAnimations": true,
    "brokerSliderAutoScroll": true,
    "featuredManagersAutoRotate": true
  },
  "copy": {
    "brokerCompatibility": {
      "badge": "Broker Compatibility",
      "title": "Trusted Brokerage Infrastructure",
      "description": "RyvonX partners with verified brokers to enable secure trade execution, transparent capital management, and a seamless trading experience.",
      "primaryPartnerLabel": "Primary Trading Partner"
    },
    "featuredPoolManagers": {
      "badge": "Top Performers",
      "title": "Featured Pool Managers",
      "description": "Top-ranked pool managers based on rating, capital under management, investor count, and trading consistency."
    },
    "statistics": {
      "badge": "Platform",
      "title": "Live Platform Statistics",
      "description": "Real-time metrics from the RyvonX marketplace — updated automatically."
    }
  },
  "statistics": [
    { "id": "s1", "title": "Verified Pool Managers", "mode": "automatic", "automaticKey": "verified_pool_managers", "icon": "Shield", "valueFormat": "number" },
    { "id": "s2", "title": "Capital Managed", "mode": "automatic", "automaticKey": "capital_managed", "icon": "Wallet", "valueFormat": "currency" },
    { "id": "s3", "title": "Active Investors", "mode": "automatic", "automaticKey": "active_investors", "icon": "Users", "valueFormat": "number" },
    { "id": "s4", "title": "Trading Pools", "mode": "automatic", "automaticKey": "trading_pools", "icon": "BarChart3", "valueFormat": "number" },
    { "id": "s5", "title": "Supported Brokers", "mode": "automatic", "automaticKey": "supported_brokers", "icon": "Landmark", "valueFormat": "number" },
    { "id": "s6", "title": "Countries", "mode": "automatic", "automaticKey": "countries", "icon": "Target", "valueFormat": "number" }
  ],
  "brokers": [
    { "id": "b1", "name": "Pepperstone", "logoUrl": "/images/brokers/pepperstone.svg", "sortOrder": 0, "isPrimary": true, "isEnabled": true },
    { "id": "b2", "name": "IC Markets", "logoUrl": "/images/brokers/icmarkets.svg", "sortOrder": 1, "isPrimary": false, "isEnabled": true },
    { "id": "b3", "name": "XM", "logoUrl": "/images/brokers/xm.svg", "sortOrder": 2, "isPrimary": false, "isEnabled": true },
    { "id": "b4", "name": "Exness", "logoUrl": "/images/brokers/exness.svg", "sortOrder": 3, "isPrimary": false, "isEnabled": true },
    { "id": "b5", "name": "FP Markets", "logoUrl": "/images/brokers/fpmarkets.svg", "sortOrder": 4, "isPrimary": false, "isEnabled": true },
    { "id": "b6", "name": "OANDA", "logoUrl": "/images/brokers/oanda.svg", "sortOrder": 5, "isPrimary": false, "isEnabled": true }
  ],
  "whyRyvonxFeatures": [
    { "id": "f1", "icon": "Shield", "title": "Verified Pool Managers", "description": "Every pool manager passes rigorous verification before managing investor capital." },
    { "id": "f2", "icon": "BarChart3", "title": "Transparent Trading", "description": "Every closed trade is published with full details for complete transparency." },
    { "id": "f3", "icon": "LineChart", "title": "Performance Tracking", "description": "Real-time pool performance, ROI metrics, and historical data at your fingertips." },
    { "id": "f4", "icon": "Landmark", "title": "Secure Marketplace", "description": "Bank-grade encryption, Row Level Security, and a trusted investment environment." }
  ]
}'::jsonb || COALESCE(value, '{}'::jsonb),
    updated_at = now()
WHERE key = 'landing_content';
