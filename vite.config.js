import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { APP_NAME } from './src/config.js';

function spaFallbackMiddleware() {
  return (req, _res, next) => {
    const url = (req.url || '').split('?')[0];
    if (
      url === '/' ||
      url.startsWith('/@') ||
      url.startsWith('/node_modules') ||
      url.startsWith('/assets') ||
      /\.\w+$/.test(url)
    ) {
      return next();
    }
    req.url = '/';
    next();
  };
}

/** Set VITE_SITE_URL=https://your.domain at build time for absolute OG / Twitter images. */
function siteUrlMetaPlugin() {
  const siteUrl = (process.env.VITE_SITE_URL || '').replace(/\/$/, '');
  return {
    name: 'zavolan-site-url-meta',
    transformIndexHtml(html) {
      if (!siteUrl) return html;
      return html
        .replace(
          /<meta property="og:locale" content="sr_RS">/,
          `<meta property="og:locale" content="sr_RS">\n  <meta property="og:url" content="${siteUrl}/">`,
        )
        .replace(
          /<meta property="og:image" content="\/og-image\.png">/,
          `<meta property="og:image" content="${siteUrl}/og-image.png">`,
        )
        .replace(
          /<meta name="twitter:image" content="\/og-image\.png">/,
          `<meta name="twitter:image" content="${siteUrl}/og-image.png">`,
        );
    },
  };
}

export default defineConfig(({ mode }) => {
  const enablePwa = mode !== 'test';

  return {
  base: '/',
  publicDir: 'public',
  plugins: [
    siteUrlMetaPlugin(),
    {
      name: 'spa-fallback',
      configureServer(server) {
        server.middlewares.use(spaFallbackMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use(spaFallbackMiddleware());
      },
    },
    ...(enablePwa
      ? [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: [
              'favicon.svg',
              'logo.svg',
              'data.json',
              'og-image.png',
              'theme-boot.js',
              'critical-shell.css',
            ],
            workbox: {
              globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,json,woff2}'],
              globIgnores: ['**/database/podoblast*.json'],
              maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
            },
            manifest: {
              name: `${APP_NAME} — priprema za vozački ispit`,
              short_name: APP_NAME,
              description: 'Vežbanje pitanja teorijskog ispita iz bezbednosti saobraćaja.',
              start_url: '/',
              scope: '/',
              display: 'standalone',
              background_color: '#212121',
              theme_color: '#212121',
              categories: ['education', 'utilities'],
              icons: [
                {
                  src: 'pwa-192.png',
                  sizes: '192x192',
                  type: 'image/png',
                  purpose: 'any',
                },
                {
                  src: 'pwa-512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'any',
                },
                {
                  src: 'pwa-512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'maskable',
                },
                {
                  src: 'logo.svg',
                  sizes: 'any',
                  type: 'image/svg+xml',
                  purpose: 'any',
                },
              ],
            },
          }),
        ]
      : []),
  ],
};
});
