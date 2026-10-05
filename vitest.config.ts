import { defineConfig, mergeConfig } from 'vitest/config'
import { getTestingConfig } from '@quasar/app-vite/testing'

// Reusa la config de Quasar (alias @/, import.meta.env, plugin de Vue/Quasar).
export default defineConfig(async () =>
  mergeConfig(await getTestingConfig({ mode: 'spa', dev: true }), {
    test: {
      environment: 'happy-dom',
      include: ['test/**/*.test.ts'],
      restoreMocks: true,
    },
  }),
)
