# OpenUni 🎓

İstanbul Gelişim Üniversitesi öğrencileri için kanal tabanlı topluluk platformu.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** Firebase Firestore
- **Auth:** Firebase Authentication
- **Storage:** Firebase Storage
- **State:** Zustand
- **Forms:** React Hook Form + Zod
- **Icons:** Lucide React
- **Fonts:** Syne (display) + Inter (body) + JetBrains Mono

## Kurulum

### 1. Bağımlılıkları kur

projeyi [indirin](https://codeload.github.com/trs-1342/openuni/zip/refs/heads/main)
projenin klasörüne girin ve komutu çalıştırın:

```bash
npm install
```

### 2. Firebase projesi oluştur

1. [Firebase Console](https://console.firebase.google.com)'a git
2. Yeni proje oluştur, örn: `openuni`
3. Authentication → Email/Password aktif et
4. Firestore Database oluştur
5. Storage aktif et

### 3. Environment variables

```bash
cp .env.example .env.local
# .env.local dosyasını Firebase config ile doldur
```

### 4. Geliştirme sunucusunu başlat

```bash
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışacak.
