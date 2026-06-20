import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname, '../backend'), '')

  function injectGlobalsPlugin() {
    return {
      name: 'inject-globals',
      transformIndexHtml(html) {
        const kakaoKey = env.VITE_KAKAO_MAP_KEY || ''
        return html.replace(
          '<head>',
          `<head>\n<script>window.KAKAO_MAP_APP_KEY = ${JSON.stringify(kakaoKey)};</script>`
        )
      },
    }
  }

  return {
    root: '.',
    plugins: [injectGlobalsPlugin()],
    server: {
      port: 5173,
      strictPort: false,
      open: '/main.html',
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html'),
          main: resolve(__dirname, 'main.html'),
          map: resolve(__dirname, 'map.html'),
          report: resolve(__dirname, 'report.html'),
          reviews: resolve(__dirname, 'reviews.html'),
          search_result: resolve(__dirname, 'search_result.html'),
        },
      },
    },
  }
})
