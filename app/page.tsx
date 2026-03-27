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
    <article className="group py-5 border-b border-stone-200 dark:border-[#1e2128]">
      <div className="flex gap-5">
        <div className="flex-shrink-0 pt-[3px]">
          <span className="text-[11px] font-semibold tabular-nums text-amber-600/60 dark:text-amber-500/50 tracking-tight">
            {String(index).padStart(3, '0')}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] leading-[1.8] text-stone-800 dark:text-stone-200 tracking-[-0.01em] break-keep">
            {content}
          </p>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            {createdAt && (
              <span className="text-[11px] text-stone-400 dark:text-stone-600">
                {formatMSK(createdAt)} MSK
              </span>
            )}
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-medium text-amber-600/80 dark:text-amber-500/70 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
              >
                출처 →
              </a>
            )}
            <button
              onClick={copy}
              className={`ml-auto text-[11px] font-medium transition-all duration-200 ${
                copied
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-stone-400 dark:text-stone-600 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
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

  // 시스템 다크모드 자동 감지
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (e: MediaQueryListEvent | MediaQueryList) => {
      document.documentElement.classList.toggle('dark', e.matches)
    }
    apply(mq)
    mq.addEventListener('change', apply as (e: MediaQueryListEvent) => void)
    return () => mq.removeEventListener('change', apply as (e: MediaQueryListEvent) => void)
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
      <main className="min-h-screen bg-stone-50 dark:bg-[#0d0f14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-amber-500/60 dark:bg-amber-500/40"
                style={{ animation: `dotPulse 1.4s ease-in-out ${i * 0.18}s infinite` }}
              />
            ))}
          </div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 dark:text-stone-600">
            Loading
          </p>
        </div>
        <style>{`
          @keyframes dotPulse {
            0%, 80%, 100% { opacity: 0.2; transform: scale(0.75); }
            40% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </main>
    )
  }

  const visible = data.posts.slice(0, visibleCount)
  const hasMore = visibleCount < data.posts.length

  return (
    <>
      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.75); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <main className="min-h-screen bg-stone-50 dark:bg-[#0d0f14]">
        {/* 헤더 */}
        <header className="sticky top-0 z-10 bg-stone-50/90 dark:bg-[#0d0f14]/90 backdrop-blur-md border-b border-stone-200 dark:border-[#1e2128]">
          <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="block w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="text-[9px] tracking-[0.18em] font-semibold text-amber-600/80 dark:text-amber-500/70 uppercase">
                    Moscow Dispatch
                  </span>
                </div>
                <h1 className="text-[15px] font-bold tracking-[-0.02em] text-stone-800 dark:text-stone-100 leading-tight">
                  @hellogugunim
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[11px] text-stone-400 dark:text-stone-600 tabular-nums">
                {data.posts.length}개
              </span>
              <button
                onClick={load}
                disabled={loading}
                className="text-[11px] font-semibold text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 transition-colors disabled:opacity-40 tracking-wide"
              >
                새로고침
              </button>
            </div>
          </div>
        </header>

        {/* 피드 */}
        <div className="max-w-2xl mx-auto px-6">
          {data.posts.length === 0 ? (
            <div className="py-32 text-center">
              <p className="text-[13px] text-stone-400 dark:text-stone-600">
                아직 생성된 포스팅이 없어요
              </p>
            </div>
          ) : (
            <>
              <div className="border-t border-stone-200 dark:border-[#1e2128]">
                {visible.map((post, i) => (
                  <PostItem key={i} index={i + 1} post={post} />
                ))}
              </div>
              <div ref={sentinelRef} className="py-12 flex items-center justify-center">
                {hasMore ? (
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-1 h-1 rounded-full bg-amber-500/50"
                        style={{ animation: `dotPulse 1.4s ease-in-out ${i * 0.18}s infinite` }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 dark:text-stone-600">
                    End · {data.posts.length}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  )
}
