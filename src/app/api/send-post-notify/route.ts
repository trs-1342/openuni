import { NextRequest, NextResponse } from 'next/server'
import { sendPostNotification } from '@/lib/mailer'

export async function POST(req: NextRequest) {
  try {
    const { to, displayName, postTitle, postContent, postUrl, channelName, spaceName } = await req.json()
    if (!to || !postTitle || !postUrl) {
      return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 })
    }
    await sendPostNotification({ to, displayName, postTitle, postContent, postUrl, channelName, spaceName })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[send-post-notify]', err?.message)
    return NextResponse.json({ error: 'Gönderilemedi' }, { status: 500 })
  }
}
