import { defineConfig } from 'vitest/config'
import path from 'path'

// Birim testler (saf fonksiyonlar — emulator gerektirmez)
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    testTimeout: 15000,
  },
})
