import { NextRequest, NextResponse } from 'next/server'

const REPO = 'papagugunim/x-post-helper-web'
const FILE_PATH = 'data/feedback.json'
const BRANCH = 'main'

async function getFileSha(token: string): Promise<{ sha: string; content: string } | null> {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
  )
  if (!res.ok) return null
  const data = await res.json()
  return { sha: data.sha, content: Buffer.from(data.content, 'base64').toString('utf-8') }
}

export async function POST(req: NextRequest) {
  const token = process.env.GITHUB_TOKEN
  if (!token) return NextResponse.json({ error: '서버 오류' }, { status: 500 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
  }

  const { content, vote, created_at } = body as Record<string, unknown>

  if (typeof content !== 'string' || !content) {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
  }
  if (vote !== 'like' && vote !== 'dislike') {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
  }

  // race condition 대응: 409 충돌 시 최대 3회 재시도
  for (let attempt = 0; attempt < 3; attempt++) {
    const existing = await getFileSha(token)
    let entries: object[] = []
    if (existing) {
      try { entries = JSON.parse(existing.content).entries || [] } catch { entries = [] }
    }

    entries.push({
      content: content.slice(0, 200),
      vote,
      created_at: typeof created_at === 'string' ? created_at : null,
      voted_at: new Date().toISOString(),
    })

    const newContent = JSON.stringify({ entries }, null, 2)
    const encoded = Buffer.from(newContent).toString('base64')

    const putBody: Record<string, unknown> = {
      message: `feedback: ${vote}`,
      content: encoded,
      branch: BRANCH,
    }
    if (existing) putBody.sha = existing.sha

    const res = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(putBody),
      }
    )

    if (res.ok) return NextResponse.json({ ok: true })
    if (res.status === 409) continue // sha 충돌 → 재시도
    return NextResponse.json({ error: '저장 실패' }, { status: 500 })
  }

  return NextResponse.json({ error: '저장 실패 (충돌)' }, { status: 500 })
}
