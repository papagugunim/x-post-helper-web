'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Post {
  content: string
  link?: string
  created_at?: string
}

interface PostsData {
  generated_at: string | null
  posts: Array<Post | string>
}

function formatMSK(iso: string | null | undefined) {
  if (!iso) return null
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Europe/Moscow',
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }) + ' MSK'
}

function PostCard({ index, post }: { index: number; post: Post | string }) {
  const [copied, setCopied] = useState(false)
  const content = typeof post === 'string' ? post : post.content
  const createdAt = typeof post === 'string' ? undefined : post.created_at

  const copy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="group relative bg-white border border-[#e8e8e0] rounded-xl p-4 hover:border-[#c8c8c0] transition-colors">
      <div className="absolute top-3 left-3 flex flex-col gap-0.5">
        <span className="text-[10px] text-[#ccc] font-mono">{index}</span>
        {createdAt && (
          <span className="text-[9px] text-[#ddd]">{formatMSK(createdAt)}</span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-[#1a1a1a] whitespace-pre-wrap pl-5 pr-8">{content}</p>
      <button
        onClick={copy}
        className="absolute top-2.5 right-2.5 text-[11px] text-[#aaa] hover:text-[#555] transition-colors px-2 py-0.5 rounded"
      >
        {copied ? '✓' : '복사'}
      </button>
    </div>
  )
}

const PAGE_SIZE = 20

export default function Home() {
  const [data, setData] = useState<PostsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/posts')
    const json = await res.json()
    setData(json)
    setVisibleCount(PAGE_SIZE)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const loadMore = useCallback(() => {
    if (!data) return
    setVisibleCount(prev => Math.min(prev + PAGE_SIZE, data.posts.length))
  }, [data])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore() },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  if (loading || !data) {
    return (
      <main className="min-h-screen bg-[#f5f5f0] flex items-center justify-center">
        <p className="text-sm text-[#999]">불러오는 중...</p>
      </main>
    )
  }

  const visible = data.posts.slice(0, visibleCount)
  const hasMore = visibleCount < data.posts.length

  return (
    <main className="min-h-screen bg-[#f5f5f0] text-[#1a1a1a]">
      <header className="sticky top-0 z-10 bg-[#f5f5f0]/90 backdrop-blur border-b border-[#e0e0d8]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold">🐦 X 포스팅 예시</h1>
            <p className="text-[11px] text-[#999]">@hellogugunim · 총 {data.posts.length}개</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="text-[11px] bg-white border border-[#e0e0d8] rounded-full px-3 py-1 hover:bg-[#f0f0e8] transition-colors disabled:opacity-50"
          >
            새로고침
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {data.posts.length === 0 ? (
          <div className="text-center py-20 text-[#bbb]">
            <p className="text-4xl mb-3">🕐</p>
            <p className="text-sm">아직 생성된 포스팅이 없어요</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {visible.map((post, i) => (
                <PostCard key={i} index={i + 1} post={post} />
              ))}
            </div>
            <div ref={sentinelRef} className="py-4 text-center">
              {hasMore ? (
                <p className="text-[11px] text-[#ccc]">스크롤하면 더 불러옵니다...</p>
              ) : (
                <p className="text-[11px] text-[#ccc]">전체 {data.posts.length}개 표시됨</p>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
