import { NextResponse } from 'next/server'

export async function POST() {
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
    const err = await res.text()
    return NextResponse.json({ error: `GitHub API 오류: ${res.status} - ${err}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
