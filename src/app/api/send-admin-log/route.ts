import { NextRequest, NextResponse } from 'next/server'
import { sendAdminLog } from '@/lib/mailer'

export async function POST(req: NextRequest) {
  try {
    const { secret, subject, title, rows, level } = await req.json()
    if (secret !== process.env.INTERNAL_API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await sendAdminLog({ subject, title, rows, level })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[send-admin-log]', err?.message)
    return NextResponse.json({ error: 'Gönderilemedi' }, { status: 500 })
  }
}
