import { defineConfig } from '#q-app/wrappers'

export default defineConfig(() => {
  return {
    boot: ['fontawesome-pro', 'firebase'],

    css: ['app.scss'],

    extras: [
      'mdi-v7',
      'roboto-font',
    ],

    build: {
      target: {
        browser: ['es2022', 'firefox115', 'chrome115', 'safari14'],
        node: 'node20',
      },

      typescript: {
        strict: true,
        vueShim: true,
      },

      vueRouterMode: 'history',
      distDir: 'dist/spa',

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
      iconSet: 'fontawesome-v6',
      plugins: ['Notify', 'Loading', 'Dialog'],
    },

    animations: [],

    ssr: {
      prodPort: 3000,
      middlewares: ['render'],
      pwa: false,
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
