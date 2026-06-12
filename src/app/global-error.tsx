'use client'

// Kök layout dahil her şeyi saran en üst seviye hata sınırı.
// Bir render hatası tüm siteyi boş ekrana çevirmesin diye burada yakalanır.
export default function GlobalError({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="tr">
      <body style={{ margin: 0, background: '#0F1117', color: '#E2E8F0', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Bir şeyler ters gitti</h1>
            <p style={{ fontSize: 14, color: '#94A3B8', margin: '0 0 20px', lineHeight: 1.6 }}>
              Beklenmedik bir hata oluştu. Sayfayı yeniden deneyebilirsin.
            </p>
            <button onClick={() => reset()}
              style={{ background: '#4F7EF7', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Yeniden dene
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
