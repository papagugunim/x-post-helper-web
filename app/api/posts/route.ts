import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'

export function GET() {
  try {
    const filePath = join(process.cwd(), 'data', 'posts.json')
    const raw = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(raw)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ generated_at: null, posts: [] })
  }
}
