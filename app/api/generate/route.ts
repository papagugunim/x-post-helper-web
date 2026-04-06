import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // 간단한 비밀키 인증 (헤더 또는 바디로 전달)
  const adminSecret = process.env.ADMIN_SECRET
  if (adminSecret) {
    const authHeader = req.headers.get('x-admin-secret')
    const body = await req.json().catch(() => ({}))
    if (authHeader !== adminSecret && body?.secret !== adminSecret) {
      return NextResponse.json({ error: '인증 실패' }, { status: 401 })
    }
  }

  const token = process.env.GITHUB_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'GITHUB_TOKEN이 설정되지 않았습니다' }, { status: 500 })
  }

  const res = await fetch(
    'https://api.github.com/repos/papagugunim/x-post-helper-web/actions/workflows/update-posts.yml/dispatches',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    }
  )

  if (!res.ok) {
    return NextResponse.json({ error: '생성 요청 실패' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
