// src/app/api/log-event/route.ts — Oturumsuz olay loglama (O1)
//
// Yalnızca dar bir olay allowlist'i kabul edilir (login/kayıt hatası gibi,
// oturum henüz yokken oluşan olaylar). Spam'e karşı IP başına rate limit.
// Yazma admin SDK iledir; admin yapılandırılmamışsa sessizce kabul edilir (no-op).

import { NextRequest, NextResponse } from 'next/server'
import { writeServerLog } from '@/lib/server-log'
import { isRateLimited, clientIp } from '@/lib/rate-limit'

// Oturumsuz yazılabilecek olaylar (seviyeleri sabit — istemci seviye seçemez)
const ALLOWED_EVENTS: Record<string, 'warn' | 'error'> = {
  'auth.login_error':    'warn',
  'auth.register_error': 'error',
}

export async function POST(req: NextRequest) {
  try {
    // O-2/O-10: kalıcı rate limit — IP başına dakikada 5 + global dakikada 60 (flood tavanı)
    const [ipLimited, globalLimited] = await Promise.all([
      isRateLimited(`logevent_ip:${clientIp(req)}`, 5, 60_000),
      isRateLimited('logevent_global', 60, 60_000),
    ])
    if (ipLimited || globalLimited) return NextResponse.json({ ok: true })  // sessizce yut

    const { event, message, details } = await req.json()
    const level = ALLOWED_EVENTS[String(event)]
    if (!level || typeof message !== 'string') {
      return NextResponse.json({ error: 'Geçersiz olay.' }, { status: 400 })
    }

    await writeServerLog({
      level, event, source: 'auth',
      message: message.slice(0, 300),
      details: typeof details === 'object' && details ? details : null,
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })  // loglama hiçbir akışı bozmaz
  }
}
