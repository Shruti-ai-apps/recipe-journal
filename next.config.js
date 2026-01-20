const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      // Cache Supabase API calls with network-first strategy
      // Exclude auth endpoints to avoid caching session/token responses.
      urlPattern: /^https:\/\/.*\.supabase\.co\/(?!auth\/v1\/).*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        networkTimeoutSeconds: 10,
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      // Cache images with cache-first strategy
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      // Cache static resources with stale-while-revalidate
      urlPattern: /\.(?:js|css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources',
      },
    },
    {
      // Cache Google Fonts
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Allow images from external domains (for recipe images)
  images: {
    // In production, require an allowlist to avoid proxying arbitrary third-party URLs.
    // Configure with `IMAGE_REMOTE_HOSTNAMES`, e.g.:
    // IMAGE_REMOTE_HOSTNAMES="images.unsplash.com,*.allrecipes.com"
    remotePatterns:
      process.env.NODE_ENV !== 'production'
        ? [
            {
              protocol: 'https',
              hostname: '**',
            },
          ]
        : (process.env.IMAGE_REMOTE_HOSTNAMES || '')
            .split(',')
            .map((h) => h.trim())
            .filter(Boolean)
            .map((hostname) => ({
              protocol: 'https',
              hostname,
            })),
  },

  // Disable x-powered-by header for security
  poweredByHeader: false,

  // Silence optional native dependency warnings from `ws` (used by `@google/genai` in Node runtime).
  // These modules are optional and `ws` has a JS fallback.
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      bufferutil: false,
      'utf-8-validate': false,
    };
    return config;
  },
};

module.exports = withPWA(nextConfig);
