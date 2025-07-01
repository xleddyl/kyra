import svgLoader from 'vite-svg-loader'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
   app: {
      head: {
         meta: [
            {
               name: 'viewport',
               content: 'width=device-width, initial-scale=1',
            },
         ],
         link: [
            { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
            { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
            {
               rel: 'preconnect',
               href: 'https://fonts.gstatic.com',
               crossorigin: '',
            },
            {
               rel: 'stylesheet',
               href: 'https://fonts.googleapis.com/css2?family=Funnel+Display:wght@300..800&family=Funnel+Sans:ital,wght@0,300..800;1,300..800&display=swap',
            },
         ],
         noscript: [{ innerHTML: 'Javascript is required' }],
      },
   },

   css: ['~/assets/css/main.css'],

   runtimeConfig: {
      databaseUrl: '',
      public: {
         databaseUrl: '',
      },
   },

   hooks: {
      'webpack:config': (configs) => {
         configs.forEach((config) => {
            const svgRule = config.module.rules.find(
               (rule: { test: { test: (arg0: string) => any } }) => rule.test.test('.svg')
            )
            svgRule.test = /\.(png|jpe?g|gif|webp)$/
            config.module.rules.push({
               test: /\.svg$/,
               oneOf: [
                  {
                     resourceQuery: /inline/,
                     loader: 'file-loader',
                     query: {
                        name: 'static/image/[name].[hash:8].[ext]',
                     },
                  },
                  {
                     loader: 'vue-svg-loader',
                     options: {
                        // Optional svgo options
                        svgo: {
                           plugins: [{ removeViewBox: false }],
                        },
                     },
                  },
               ],
            })
         })
      },
   },

   vite: {
      vue: {
         script: {
            defineModel: true,
         },
      },
      esbuild: {
         drop: ['debugger'],
         pure: ['console.log', 'console.error', 'console.warn', 'console.debug', 'console.trace'],
      },
      plugins: [svgLoader({ svgoConfig: { plugins: ['prefixIds'] } })],
   },

   compatibilityDate: '2025-05-15',
   devtools: { enabled: true },
   telemetry: { enabled: false },
   build: {
      transpile: ['tslib', 'ag-grid-vue3'],
   },
})
