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

```bash
npm install
```

### 2. Firebase projesi oluştur

1. [Firebase Console](https://console.firebase.google.com)'a git
2. Yeni proje oluştur: `openuni`
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

## Kanal Tipleri

| Tip | Renk | Kural |
|-----|------|-------|
| `announcement` | Amber | Sadece moderatör |
| `academic` | Yeşil | Tartışma açık |
| `archive` | Mor | Yalnızca dosya |
| `listing` | Kırmızı | İlan panosu |
| `suggestion` | Teal | Öneri kutusu |
| `social` | Mavi | Sohbet açık |

## E-posta Doğrulama

Kayıt için yalnızca `@ogr.gelisim.edu.tr` uzantılı e-posta kabul edilir.
