// src/lib/server-templates.ts — Şablonları sunucuda yükleme (O2)
//
// API route'ları şablonu Firestore REST ile ÇAĞIRANIN token'ıyla okur
// (emailTemplates okuma kuralı: giriş yapmış herkes; yazma: yönetici).
// Doküman yoksa veya okunamazsa koddaki varsayılan şablon kullanılır —
// şablon sistemi hiçbir e-posta akışını kıramaz.

import { getTemplateDef } from './email-templates'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

export interface LoadedTemplate {
  subject: string
  body: string
}

export async function loadEmailTemplate(id: string, idToken?: string | null): Promise<LoadedTemplate> {
  const def = getTemplateDef(id)
  const fallback: LoadedTemplate = {
    subject: def?.defaultSubject ?? '',
    body:    def?.defaultBody ?? '',
  }
  if (!PROJECT_ID || !idToken) return fallback
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/emailTemplates/${id}`,
      { headers: { Authorization: `Bearer ${idToken}` } }
    )
    if (!res.ok) return fallback
    const data = await res.json()
    const f = data?.fields ?? {}
    return {
      subject: f.subject?.stringValue || fallback.subject,
      body:    f.body?.stringValue    || fallback.body,
    }
  } catch {
    return fallback
  }
}
