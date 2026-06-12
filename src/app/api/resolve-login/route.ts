// src/app/api/resolve-login/route.ts — Username ile giriş çözümü
//
// Akış: {username, password} → sunucuda username→e-posta (admin) → şifreyi REST ile doğrula →
// yalnızca şifre DOĞRUYSA e-postayı döndür. Böylece username tahmini ile e-posta sızmaz.
// İstemci dönen e-posta ile normal signInWithEmailAndPassword yapar.

import { NextRequest, NextResponse } from 'next/server'
import { isAdminConfigured, getEmailByUsername } from '@/lib/firebase-admin'
import { isRateLimited, clientIp } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    if (!isAdminConfigured()) {
      return NextResponse.json(
        { error: 'Kullanıcı adı ile giriş şu an yapılandırılmadı. Lütfen e-postanla giriş yap.' },
        { status: 503 }
      )
    }

    const { username, password } = await req.json()
    if (!username || !password || typeof username !== 'string') {
      return NextResponse.json({ error: 'Kullanıcı adı ve şifre gerekli.' }, { status: 400 })
    }

    // Rate limit (O-2: kalıcı): username başına dakikada 6 + IP başına dakikada 20
    const key = username.toLowerCase()
    const [userLimited, ipLimited] = await Promise.all([
      isRateLimited(`login_u:${key}`, 6, 60_000),
      isRateLimited(`login_ip:${clientIp(req)}`, 20, 60_000),
    ])
    if (userLimited || ipLimited) {
      return NextResponse.json({ error: 'Çok fazla deneme. Biraz bekleyip tekrar dene.' }, { status: 429 })
    }

    const email = await getEmailByUsername(key)
    // Kullanıcı bulunamasa bile aynı genel hatayı dön (enumerasyon engeli)
    if (!email) {
      return NextResponse.json({ error: 'Kullanıcı adı veya şifre hatalı.' }, { status: 401 })
    }

    // Şifreyi Firebase Auth REST ile doğrula (public API key)
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    const verify = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    )
    if (!verify.ok) {
      return NextResponse.json({ error: 'Kullanıcı adı veya şifre hatalı.' }, { status: 401 })
    }

    // Şifre doğru → e-postayı döndür; istemci bununla giriş yapar
    return NextResponse.json({ email })
  } catch (err: any) {
    console.error('[resolve-login]', err?.message)
    return NextResponse.json({ error: 'Giriş çözümlenemedi.' }, { status: 500 })
  }
}
