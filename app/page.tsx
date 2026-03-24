'use client'

import { useState } from 'react'

interface Post {
  content: string
  link?: string
}

interface PostsData {
  generated_at: string | null
  posts: Array<Post | string>
}

function formatMSK(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Europe/Moscow',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }) + ' MSK'
}

function PostCard({ index, post }: { index: number; post: Post | string }) {
  const [copied, setCopied] = useState(false)
  const content = typeof post === 'string' ? post : post.content
  const link = typeof post === 'string' ? undefined : post.link

  const copy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="group relative bg-white border border-[#e8e8e0] rounded-xl p-4 hover:border-[#c8c8c0] transition-colors">
      <span className="absolute top-3 left-3 text-[10px] text-[#ccc] font-mono">{index}</span>
      <p className="text-sm leading-relaxed text-[#1a1a1a] whitespace-pre-wrap pl-5 pr-8">{content}</p>
      <div className="flex items-center gap-2 mt-2 pl-5">
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[#aaa] hover:text-[#555] transition-colors underline underline-offset-2 truncate max-w-[200px]"
          >
            기사 링크
          </a>
        )}
      </div>
      <button
        onClick={copy}
        className="absolute top-2.5 right-2.5 text-[11px] text-[#aaa] hover:text-[#555] transition-colors px-2 py-0.5 rounded"
      >
        {copied ? '✓' : '복사'}
      </button>
    </div>
  )
}

export default function Home() {
  const [data, setData] = useState<PostsData | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/posts')
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#f5f5f0] flex items-center justify-center">
        <div className="text-center">
          <p className="text-3xl mb-4">🐦</p>
          <h1 className="text-base font-semibold text-[#1a1a1a] mb-1">X 포스팅 예시</h1>
          <p className="text-xs text-[#999] mb-6">@hellogugunim</p>
          <button
            onClick={load}
            disabled={loading}
            className="bg-[#1a1a1a] text-white text-sm px-5 py-2.5 rounded-full hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            {loading ? '불러오는 중...' : '포스팅 예시 보기'}
          </button>
        </div>
      </main>
    )
  }

  const timeLabel = formatMSK(data.generated_at)

  return (
    <main className="min-h-screen bg-[#f5f5f0] text-[#1a1a1a]">
      <header className="sticky top-0 z-10 bg-[#f5f5f0]/90 backdrop-blur border-b border-[#e0e0d8]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold">🐦 X 포스팅 예시</h1>
            <p className="text-[11px] text-[#999]">@hellogugunim</p>
          </div>
          <div className="flex items-center gap-2">
            {timeLabel && (
              <span className="text-[11px] text-[#999]">{timeLabel}</span>
            )}
            <button
              onClick={load}
              disabled={loading}
              className="text-[11px] bg-white border border-[#e0e0d8] rounded-full px-3 py-1 hover:bg-[#f0f0e8] transition-colors disabled:opacity-50"
            >
              {loading ? '...' : '새로고침'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {data.posts.length === 0 ? (
          <div className="text-center py-20 text-[#bbb]">
            <p className="text-4xl mb-3">🕐</p>
            <p className="text-sm">아직 생성된 포스팅이 없어요</p>
            <p className="text-xs mt-1">매일 오전 7시에 새 예시가 업데이트돼요</p>
          </div>
        ) : (
          <>
            <p className="text-[11px] text-[#bbb] mb-3">{data.posts.length}개</p>
            <div className="space-y-2">
              {data.posts.map((post, i) => (
                <PostCard key={i} index={i + 1} post={post} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
