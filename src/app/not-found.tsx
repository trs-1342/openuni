// src/app/not-found.tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=JetBrains+Mono:wght@400;700&display=swap');

        .nf-root {
          min-height: 100dvh;
          background: #0F1117;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          font-family: 'Syne', sans-serif;
          padding: 2rem;
        }

        /* Arka plan grid */
        .nf-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(79,126,247,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(79,126,247,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          animation: gridDrift 20s linear infinite;
        }
        @keyframes gridDrift {
          0%   { transform: translate(0, 0); }
          100% { transform: translate(48px, 48px); }
        }

        /* Glow blobs */
        .nf-blob1 {
          position: absolute;
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(79,126,247,0.12) 0%, transparent 70%);
          top: -200px; left: -200px;
          animation: blobFloat 8s ease-in-out infinite;
          pointer-events: none;
        }
        .nf-blob2 {
          position: absolute;
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(155,109,255,0.1) 0%, transparent 70%);
          bottom: -100px; right: -100px;
          animation: blobFloat 10s ease-in-out infinite reverse;
          pointer-events: none;
        }
        @keyframes blobFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(30px, -30px) scale(1.05); }
        }

        /* Ana içerik */
        .nf-content {
          position: relative;
          z-index: 10;
          text-align: center;
          max-width: 600px;
          animation: contentIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes contentIn {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* 404 büyük yazı */
        .nf-number {
          font-size: clamp(120px, 22vw, 200px);
          font-weight: 800;
          line-height: 1;
          letter-spacing: -0.05em;
          background: linear-gradient(135deg, #4F7EF7 0%, #9B6DFF 50%, #4F7EF7 100%);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 4s ease infinite;
          position: relative;
          display: inline-block;
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50%       { background-position: 100% 50%; }
        }

        /* Glitch efekti */
        .nf-number::before,
        .nf-number::after {
          content: '404';
          position: absolute;
          top: 0; left: 0; right: 0;
          background: inherit;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .nf-number::before {
          animation: glitch1 3s infinite;
          clip-path: polygon(0 0, 100% 0, 100% 35%, 0 35%);
        }
        .nf-number::after {
          animation: glitch2 3s infinite;
          clip-path: polygon(0 65%, 100% 65%, 100% 100%, 0 100%);
        }
        @keyframes glitch1 {
          0%, 90%, 100% { transform: translate(0); opacity: 0; }
          92%            { transform: translate(-3px, 1px); opacity: 0.6; }
          94%            { transform: translate(3px, -1px); opacity: 0.6; }
          96%            { transform: translate(0); opacity: 0; }
        }
        @keyframes glitch2 {
          0%, 90%, 100% { transform: translate(0); opacity: 0; }
          93%            { transform: translate(3px, 2px); opacity: 0.5; }
          95%            { transform: translate(-3px, -1px); opacity: 0.5; }
          97%            { transform: translate(0); opacity: 0; }
        }

        /* Kod satırı */
        .nf-code {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem;
          color: rgba(79,126,247,0.6);
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin-bottom: 1rem;
          animation: contentIn 0.8s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .nf-title {
          font-size: clamp(1.25rem, 3vw, 1.75rem);
          font-weight: 700;
          color: #E8EAF0;
          margin: 0.75rem 0 0.5rem;
          animation: contentIn 0.8s 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .nf-desc {
          font-size: 0.9375rem;
          color: rgba(180,190,210,0.7);
          line-height: 1.6;
          margin-bottom: 2.5rem;
          animation: contentIn 0.8s 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        /* Divider çizgi */
        .nf-divider {
          width: 48px; height: 2px;
          background: linear-gradient(90deg, #4F7EF7, #9B6DFF);
          border-radius: 2px;
          margin: 1rem auto;
          animation: contentIn 0.8s 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        /* Butonlar */
        .nf-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
          flex-wrap: wrap;
          animation: contentIn 0.8s 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .nf-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.75rem;
          background: #4F7EF7;
          color: #fff;
          font-family: 'Syne', sans-serif;
          font-size: 0.875rem;
          font-weight: 700;
          border-radius: 12px;
          text-decoration: none;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 0 24px rgba(79,126,247,0.3);
        }
        .nf-btn-primary:hover {
          background: #6B93FF;
          transform: translateY(-2px);
          box-shadow: 0 0 36px rgba(79,126,247,0.5);
        }
        .nf-btn-primary:active { transform: scale(0.97); }

        .nf-btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: rgba(255,255,255,0.04);
          color: rgba(180,190,210,0.8);
          font-family: 'Syne', sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          border-radius: 12px;
          text-decoration: none;
          border: 1px solid rgba(255,255,255,0.08);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .nf-btn-ghost:hover {
          background: rgba(255,255,255,0.08);
          color: #E8EAF0;
          transform: translateY(-2px);
          border-color: rgba(79,126,247,0.3);
        }

        /* Floating particles */
        .nf-particles {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .nf-particle {
          position: absolute;
          width: 2px; height: 2px;
          background: #4F7EF7;
          border-radius: 50%;
          opacity: 0;
          animation: particleFloat var(--dur) var(--delay) ease-in-out infinite;
        }
        @keyframes particleFloat {
          0%   { opacity: 0; transform: translateY(100vh) scale(0); }
          10%  { opacity: 0.6; }
          90%  { opacity: 0.2; }
          100% { opacity: 0; transform: translateY(-20vh) scale(1.5); }
        }

        /* Alt bilgi */
        .nf-footer {
          position: absolute;
          bottom: 1.5rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.6875rem;
          color: rgba(255,255,255,0.15);
          letter-spacing: 0.1em;
          animation: contentIn 0.8s 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

      <div className="nf-root">
        {/* Arka plan */}
        <div className="nf-grid" />
        <div className="nf-blob1" />
        <div className="nf-blob2" />

        {/* Partiküller */}
        <div className="nf-particles">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="nf-particle"
              style={{
                left: `${8 + i * 8}%`,
                '--dur': `${6 + (i % 4) * 2}s`,
                '--delay': `${(i * 0.7) % 5}s`,
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* İçerik */}
        <div className="nf-content">
          <p className="nf-code">// error_code: 404 · page_not_found</p>

          <div className="nf-number">404</div>

          <div className="nf-divider" />

          <h1 className="nf-title">Sayfa Bulunamadı</h1>
          <p className="nf-desc">
            Aradığın sayfa taşınmış, silinmiş ya da hiç var olmamış olabilir.<br />
            Ana sayfaya dönüp tekrar deneyebilirsin.
          </p>

          <div className="nf-actions">
            <Link href="/dashboard" className="nf-btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
              </svg>
              Ana Sayfaya Dön
            </Link>
            <Link href="/dashboard/spaces" className="nf-btn-ghost">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              Topluluklar
            </Link>
          </div>
        </div>

        <p className="nf-footer">OpenUni · IGÜ Öğrenci Platformu</p>
      </div>
    </>
  )
}
