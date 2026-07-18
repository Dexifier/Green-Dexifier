'use client';

import Script from 'next/script';

// Plausible Analytics — cookieless, no personal data, GDPR-compliant.
// This keeps the "No cookies — EVER" promise in our marketing honest.
// To activate: create a Plausible account (or self-host) and set
// NEXT_PUBLIC_PLAUSIBLE_DOMAIN / NEXT_PUBLIC_PLAUSIBLE_SRC.
export default function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const src =
    process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ?? 'https://plausible.io/js/script.js';

  if (!domain) return null;

  return <Script defer data-domain={domain} src={src} strategy="afterInteractive" />;
}
