import { defineConfig } from '#q-app'

export default defineConfig((ctx) => {
  return {
    boot: ['chunk-recovery', 'fontawesome-pro', 'firebase', 'meta-pixel'],

    css: ['app.scss'],

    extras: ['roboto-font'],

    build: {
      // app-vite 3 solo expone al cliente variables con este prefijo (default: QCLI_).
      // Nuestro .env y los scripts usan VITE_*; ninguna es secreta (config pública de Firebase).
      env: {
        clientPrefix: 'VITE_',
      },

      target: {
        browser: ['es2022', 'firefox115', 'chrome115', 'safari14'],
        node: 'node20',
      },

      typescript: {
        strict: true,
        vueShim: true,
      },

      vueRouterMode: 'history',
      // Solo SPA: Firebase Hosting publica dist/spa; SSR usa su default (dist/ssr).
      ...(ctx.mode.spa ? { distDir: 'dist/spa' } : {}),

      vitePlugins: [
        [
          'vite-plugin-checker',
          {
            vueTsc: true,
            eslint: {
              lintCommand: 'eslint -c ./eslint.config.js "./src*/**/*.{ts,js,mjs,cjs,vue}"',
              useFlatConfig: true,
            },
          },
          { server: false },
        ],
      ],
    },

    devServer: {
      host: '0.0.0.0',
      open: true,
    },

    framework: {
      config: {
        brand: {
          primary: '#000000',
          secondary: '#d19793',
          accent: '#e9e3ca',
          positive: '#25d366',
          dark: '#000000',
        },
      },
      lang: 'es',
      iconSet: 'fontawesome-v6',
      plugins: ['Notify', 'Loading', 'Dialog', 'Meta'],
    },

    animations: [],

    ssr: {
      prodPort: 3000,
      middlewares: ['render'],
      pwa: false,
    },

    ssg: {
      pwa: false,
      error404HtmlFilename: '404.html',
      // El admin necesita sesión: se sirve como SPA (csr.html), no se pre-renderiza.
      clientSideRenderingRoutes: ['/admin/**'],
    },

    pwa: {
      workboxMode: 'GenerateSW',
    },

    cordova: {},
    capacitor: { hideSplashscreen: true },
    electron: {
      preloadScripts: ['electron-preload'],
      inspectPort: 5858,
      bundler: 'packager',
      packager: {},
      builder: { appId: 'klugstore' },
    },
    bex: { extraScripts: [] },
  }
})
