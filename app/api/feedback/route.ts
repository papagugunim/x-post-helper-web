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
  if (!token) return NextResponse.json({ error: 'GITHUB_TOKEN 없음' }, { status: 500 })

  const { content, vote, created_at } = await req.json()
  if (!content || !vote) return NextResponse.json({ error: '필수 파라미터 없음' }, { status: 400 })

  const existing = await getFileSha(token)
  let entries: object[] = []

  if (existing) {
    try { entries = JSON.parse(existing.content).entries || [] } catch { entries = [] }
  }

  entries.push({
    content: content.slice(0, 200),
    vote,
    created_at: created_at || null,
    voted_at: new Date().toISOString(),
  })

  const newContent = JSON.stringify({ entries }, null, 2)
  const encoded = Buffer.from(newContent).toString('base64')

  const body: Record<string, unknown> = {
    message: `feedback: ${vote}`,
    content: encoded,
    branch: BRANCH,
  }
  if (existing) body.sha = existing.sha

  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
