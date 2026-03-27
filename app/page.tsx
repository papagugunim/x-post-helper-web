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
    <article
      className="group relative px-3 py-4 -mx-3 rounded-md transition-colors duration-100"
      style={{ '--hover-bg': 'var(--item-hover)' } as React.CSSProperties}
    >
      <style>{`article.group:hover { background: var(--item-hover); }`}</style>

      <div className="flex gap-3 items-start">
        {/* 번호 */}
        <span
          className="flex-shrink-0 mt-[3px] text-[11px] tabular-nums w-7 text-right"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {index}
        </span>

        {/* 콘텐츠 */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[15px] leading-[1.75] tracking-[-0.01em] break-keep"
            style={{ color: 'var(--text-primary)' }}
          >
            {content}
          </p>

          <div className="mt-2 flex items-center gap-3 flex-wrap">
            {createdAt && (
              <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                {formatMSK(createdAt)} MSK
              </span>
            )}
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] underline underline-offset-2 transition-opacity hover:opacity-70"
                style={{ color: 'var(--text-secondary)' }}
              >
                출처 보기
              </a>
            )}
            <button
              onClick={copy}
              className="ml-auto text-[12px] transition-all duration-150 opacity-0 group-hover:opacity-100 focus:opacity-100 rounded px-2 py-0.5"
              style={{
                color: copied ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: copied ? 'var(--item-hover)' : 'transparent',
              }}
            >
              {copied ? '복사됨 ✓' : '복사'}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

const PAGE_SIZE = 20

export default function Home() {
  const [data, setData] = useState<PostsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // 시스템 다크모드 자동 감지 + CSS 변수 적용
  useEffect(() => {
    const root = document.documentElement
    const applyTheme = (dark: boolean) => {
      root.classList.toggle('dark', dark)
      if (dark) {
        root.style.setProperty('--bg-page', '#191919')
        root.style.setProperty('--bg-header', 'rgba(25,25,25,0.92)')
        root.style.setProperty('--border', '#2F2F2F')
        root.style.setProperty('--text-primary', '#E3E2DF')
        root.style.setProperty('--text-secondary', '#787774')
        root.style.setProperty('--text-tertiary', '#4A4A47')
        root.style.setProperty('--item-hover', '#252525')
      } else {
        root.style.setProperty('--bg-page', '#F7F6F3')
        root.style.setProperty('--bg-header', 'rgba(247,246,243,0.92)')
        root.style.setProperty('--border', '#E9E9E7')
        root.style.setProperty('--text-primary', '#37352F')
        root.style.setProperty('--text-secondary', '#9B9A97')
        root.style.setProperty('--text-tertiary', '#C4C3C0')
        root.style.setProperty('--item-hover', '#EFEEEB')
      }
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    applyTheme(mq.matches)
    const handler = (e: MediaQueryListEvent) => applyTheme(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
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
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg-page, #F7F6F3)' }}
      >
        <div
          className="text-[13px]"
          style={{ color: 'var(--text-secondary, #9B9A97)' }}
        >
          불러오는 중...
        </div>
      </main>
    )
  }

  const visible = data.posts.slice(0, visibleCount)
  const hasMore = visibleCount < data.posts.length

  return (
    <main
      className="min-h-screen"
      style={{ background: 'var(--bg-page, #F7F6F3)' }}
    >
      {/* 헤더 */}
      <header
        className="sticky top-0 z-10 backdrop-blur-sm"
        style={{
          background: 'var(--bg-header, rgba(247,246,243,0.92))',
          borderBottom: '1px solid var(--border, #E9E9E7)',
        }}
      >
        <div className="max-w-2xl mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* 심플 아이콘 */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ color: 'var(--text-tertiary)' }}>
              <rect x="2" y="2" width="6" height="6" rx="1" fill="currentColor" opacity="0.5"/>
              <rect x="10" y="2" width="6" height="6" rx="1" fill="currentColor" opacity="0.3"/>
              <rect x="2" y="10" width="6" height="6" rx="1" fill="currentColor" opacity="0.3"/>
              <rect x="10" y="10" width="6" height="6" rx="1" fill="currentColor" opacity="0.5"/>
            </svg>
            <h1
              className="text-[14px] font-semibold tracking-[-0.02em]"
              style={{ color: 'var(--text-primary, #37352F)' }}
            >
              @hellogugunim
            </h1>
            <span
              className="text-[12px] tabular-nums"
              style={{ color: 'var(--text-tertiary, #C4C3C0)' }}
            >
              · {data.posts.length}
            </span>
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="text-[12px] px-3 py-1 rounded-md transition-colors duration-100 disabled:opacity-40"
            style={{
              color: 'var(--text-secondary, #9B9A97)',
              border: '1px solid var(--border, #E9E9E7)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--item-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            새로고침
          </button>
        </div>
      </header>

      {/* 피드 */}
      <div className="max-w-2xl mx-auto px-6 py-2">
        {data.posts.length === 0 ? (
          <div className="py-32 text-center">
            <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
              아직 생성된 포스팅이 없어요
            </p>
          </div>
        ) : (
          <>
            <div className="py-2">
              {visible.map((post, i) => (
                <PostItem key={i} index={i + 1} post={post} />
              ))}
            </div>
            <div ref={sentinelRef} className="py-10 text-center">
              {hasMore ? (
                <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                  불러오는 중...
                </span>
              ) : (
                <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                  총 {data.posts.length}개 · 끝
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
