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
  })
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
    <div className="bg-white dark:bg-[#16181c] border border-[#eff3f4] dark:border-[#2f3336] rounded-2xl p-4 hover:bg-[#f7f9f9] dark:hover:bg-[#1d2226] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-[#536471] dark:text-[#71767b]">#{index}</span>
          {createdAt && (
            <span className="text-[11px] text-[#536471] dark:text-[#71767b]">{formatMSK(createdAt)} MSK</span>
          )}
        </div>
        <button
          onClick={copy}
          className="text-[11px] text-[#536471] dark:text-[#71767b] hover:text-[#1d9bf0] dark:hover:text-[#1d9bf0] transition-colors px-2 py-0.5 rounded-full border border-transparent hover:border-[#1d9bf0]/30"
        >
          {copied ? '✓ 복사됨' : '복사'}
        </button>
      </div>
      <p className="text-[15px] leading-[1.6] text-[#0f1419] dark:text-[#e7e9ea]">{content}</p>
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
      <main className="min-h-screen bg-[#f7f9f9] dark:bg-[#000000] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#1d9bf0] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#536471] dark:text-[#71767b]">불러오는 중...</p>
        </div>
      </main>
    )
  }

  const visible = data.posts.slice(0, visibleCount)
  const hasMore = visibleCount < data.posts.length

  return (
    <main className="min-h-screen bg-[#f7f9f9] dark:bg-[#000000]">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-[#000000]/80 backdrop-blur-md border-b border-[#eff3f4] dark:border-[#2f3336]">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-bold text-[#0f1419] dark:text-[#e7e9ea]">🐦 X 포스팅 예시</h1>
            <p className="text-[12px] text-[#536471] dark:text-[#71767b]">@hellogugunim · 총 {data.posts.length}개</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="text-[13px] font-semibold text-[#1d9bf0] border border-[#1d9bf0] rounded-full px-4 py-1.5 hover:bg-[#1d9bf0]/10 transition-colors disabled:opacity-40"
          >
            새로고침
          </button>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-3">
        {data.posts.length === 0 ? (
          <div className="text-center py-20 text-[#536471] dark:text-[#71767b]">
            <p className="text-4xl mb-3">🕐</p>
            <p className="text-sm">아직 생성된 포스팅이 없어요</p>
          </div>
        ) : (
          <>
            <div className="space-y-[1px]">
              {visible.map((post, i) => (
                <PostCard key={i} index={i + 1} post={post} />
              ))}
            </div>
            <div ref={sentinelRef} className="py-6 text-center">
              {hasMore ? (
                <div className="w-5 h-5 border-2 border-[#1d9bf0] border-t-transparent rounded-full animate-spin mx-auto" />
              ) : (
                <p className="text-[12px] text-[#536471] dark:text-[#71767b]">전체 {data.posts.length}개 표시됨</p>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
