import { defineConfig } from 'vitest/config'

// Firestore/Storage güvenlik kuralı testleri — çalışan emulator gerektirir
// (firebase emulators:exec ile sarmalanır). Emulator paylaşıldığından dosyalar
// SIRAYLA çalışır (clearFirestore çakışmasını önlemek için).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
})
