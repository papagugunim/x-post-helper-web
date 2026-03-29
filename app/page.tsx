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

function PostItem({ index, post }: { index: number; post: Post | string }) {
  const [copied, setCopied] = useState(false)
  const content = typeof post === 'string' ? post : post.content
  const createdAt = typeof post === 'string' ? undefined : post.created_at
  const link = typeof post === 'string' ? undefined : (post as Post).link

  const copy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative border border-[var(--border)] rounded-xl p-4 bg-[var(--card-bg)] hover:bg-[var(--card-hover)] transition-colors">
      {/* 복사 아이콘 - 우상단 */}
      <button
        onClick={copy}
        className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-md transition-all duration-150"
        style={{
          background: copied ? 'var(--copy-done-bg)' : 'transparent',
          color: copied ? 'var(--copy-done-text)' : 'var(--text-muted)',
        }}
        title="복사"
      >
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M4 4V3a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1h-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      {/* 상단: 번호 + 날짜 + 출처 */}
      <div className="flex items-center gap-2 mb-3 pr-8">
        <span className="text-[11px] font-bold text-[var(--text-muted)] tabular-nums">#{index}</span>
        {createdAt && (
          <span className="text-[11px] text-[var(--text-muted)]">{formatMSK(createdAt)} MSK</span>
        )}
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[var(--text-muted)] underline underline-offset-2 hover:text-[var(--text-sub)] transition-colors ml-auto"
          >
            출처
          </a>
        )}
      </div>

      {/* 본문 */}
      <p className="text-[15px] leading-[1.75] text-[var(--text-main)] break-keep whitespace-pre-line">
        {content}
      </p>
    </div>
  )
}

const PAGE_SIZE = 20

export default function Home() {
  const [data, setData] = useState<PostsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generateMsg, setGenerateMsg] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [showTop, setShowTop] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // 시스템 다크모드 자동 감지 + CSS 변수 주입
  useEffect(() => {
    const root = document.documentElement
    const apply = (dark: boolean) => {
      root.classList.toggle('dark', dark)
      if (dark) {
        root.style.setProperty('--bg', '#111111')
        root.style.setProperty('--bg-header', 'rgba(17,17,17,0.92)')
        root.style.setProperty('--border', '#2a2a2a')
        root.style.setProperty('--card-bg', '#1a1a1a')
        root.style.setProperty('--card-hover', '#1f1f1f')
        root.style.setProperty('--text-main', '#e8e8e8')
        root.style.setProperty('--text-sub', '#aaaaaa')
        root.style.setProperty('--text-muted', '#555555')
        root.style.setProperty('--copy-bg', '#222222')
        root.style.setProperty('--copy-border', '#333333')
        root.style.setProperty('--copy-text', '#cccccc')
        root.style.setProperty('--copy-done-bg', '#1a2e1a')
        root.style.setProperty('--copy-done-text', '#6bcf6b')
      } else {
        root.style.setProperty('--bg', '#f9f9f9')
        root.style.setProperty('--bg-header', 'rgba(249,249,249,0.92)')
        root.style.setProperty('--border', '#e5e5e5')
        root.style.setProperty('--card-bg', '#ffffff')
        root.style.setProperty('--card-hover', '#fafafa')
        root.style.setProperty('--text-main', '#1a1a1a')
        root.style.setProperty('--text-sub', '#555555')
        root.style.setProperty('--text-muted', '#aaaaaa')
        root.style.setProperty('--copy-bg', '#f4f4f4')
        root.style.setProperty('--copy-border', '#e5e5e5')
        root.style.setProperty('--copy-text', '#444444')
        root.style.setProperty('--copy-done-bg', '#f0faf0')
        root.style.setProperty('--copy-done-text', '#2d862d')
      }
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    apply(mq.matches)
    const handler = (e: MediaQueryListEvent) => apply(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const generate = async () => {
    setGenerating(true)
    setGenerateMsg('')
    try {
      const res = await fetch('/api/generate', { method: 'POST' })
      if (res.ok) {
        setGenerateMsg('생성 요청 완료! 약 1~2분 후 새로고침하세요.')
      } else {
        const err = await res.json()
        setGenerateMsg(`오류: ${err.error}`)
      }
    } catch {
      setGenerateMsg('요청 실패')
    }
    setGenerating(false)
    setTimeout(() => setGenerateMsg(''), 5000)
  }

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg, #f9f9f9)' }}>
        <p className="text-[13px]" style={{ color: 'var(--text-muted, #aaaaaa)' }}>불러오는 중...</p>
      </main>
    )
  }

  const visible = data.posts.slice(0, visibleCount)
  const hasMore = visibleCount < data.posts.length

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg, #f9f9f9)' }}>
      {/* 헤더 */}
      <header
        className="sticky top-0 z-10 backdrop-blur-sm"
        style={{ background: 'var(--bg-header)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-xl mx-auto px-4 h-12 flex items-center justify-between">
          <div>
            <span className="text-[14px] font-bold" style={{ color: 'var(--text-main)' }}>@hellogugunim</span>
            <span className="text-[12px] ml-2" style={{ color: 'var(--text-muted)' }}>{data.posts.length}개</span>
          </div>
          <div className="flex items-center gap-2">
            {generateMsg && (
              <span className="text-[11px]" style={{ color: 'var(--text-sub)' }}>{generateMsg}</span>
            )}
            <button
              onClick={generate}
              disabled={generating}
              className="text-[12px] px-3 py-1 rounded-lg font-medium transition-colors disabled:opacity-40"
              style={{ background: 'var(--copy-done-bg)', color: 'var(--copy-done-text)', border: '1px solid var(--border)' }}
            >
              {generating ? '요청 중...' : '지금 생성'}
            </button>
          </div>
        </div>
      </header>

      {/* 피드 */}
      <div className="max-w-xl mx-auto px-4 py-4 space-y-3">
        {data.posts.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>아직 생성된 포스팅이 없어요</p>
          </div>
        ) : (
          <>
            {visible.map((post, i) => (
              <PostItem key={i} index={i + 1} post={post} />
            ))}
            <div ref={sentinelRef} className="py-8 text-center">
              {hasMore ? (
                <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>불러오는 중...</p>
              ) : (
                <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>전체 {data.posts.length}개</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* 맨 위로 버튼 */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all"
          style={{ background: 'var(--copy-bg)', border: '1px solid var(--border)', color: 'var(--text-sub)' }}
          aria-label="맨 위로"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 12V4M4 8l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </main>
  )
}
