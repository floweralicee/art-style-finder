import posthog from 'posthog-js';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/artchive';

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
  api_host: `${basePath}/ingest`,
  ui_host: 'https://us.posthog.com',
  defaults: '2026-01-30',
  capture_exceptions: true,
  debug: process.env.NODE_ENV === 'development',
});
