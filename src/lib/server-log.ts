// src/lib/server-log.ts — Sunucu tarafı sistem logu (API route'larından)
//
// İstemci writeSystemLog'u oturum gerektirir (Firestore kuralları). Oturumsuz
// olaylar (login/kayıt hatası) ve sunucu olayları (e-posta gönderimi) için bu
// helper admin SDK ile yazar. Admin yapılandırılmamışsa sessizce no-op olur
// (loglama hiçbir akışı kesmez).

import { getAdminApp, isAdminConfigured } from './firebase-admin'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

export interface ServerLogEntry {
  level: 'info' | 'warn' | 'error'
  event?: string
  source?: string
  message: string
  details?: any
  userEmail?: string | null
  userId?: string | null
}

export async function writeServerLog(entry: ServerLogEntry): Promise<void> {
  try {
    if (!isAdminConfigured()) return
    const db = getFirestore(getAdminApp()!)
    await db.collection('systemLogs').add({
      level:   entry.level,
      event:   entry.event ?? null,
      source:  entry.source ?? 'api',
      message: String(entry.message).slice(0, 500),
      details: entry.details
        ? (typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details)).slice(0, 2000)
        : null,
      userId:    entry.userId    ?? null,
      userEmail: entry.userEmail ?? null,
      createdAt: FieldValue.serverTimestamp(),
    })
  } catch {
    // log yazımı hiçbir isteği düşürmez
  }
}
