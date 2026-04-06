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
  const d = new Date(iso)
  return d.toLocaleString('ko-KR', {
    timeZone: 'Europe/Moscow',
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function Avatar({ size = 36 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #1d6f42 0%, #2d5a27 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: size * 0.38,
        fontWeight: 700,
        color: '#fff',
        letterSpacing: '-0.02em',
      }}
    >
      H
    </div>
  )
}

function PostItem({ index, post }: { index: number; post: Post | string }) {
  const [copied, setCopied] = useState(false)
  const [vote, setVote] = useState<'like' | 'dislike' | null>(null)
  const [voting, setVoting] = useState(false)
  const content = typeof post === 'string' ? post : post.content
  const createdAt = typeof post === 'string' ? undefined : post.created_at
  const link = typeof post === 'string' ? undefined : (post as Post).link

  const copy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sendVote = async (v: 'like' | 'dislike') => {
    if (voting || vote === v) return
    const prev = vote
    setVote(v)
    setVoting(true)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, vote: v, created_at: createdAt }),
      })
    } catch {
      setVote(prev)
    }
    setVoting(false)
  }

  return (
    <article
      style={{
        borderBottom: '1px solid var(--border)',
        padding: '16px 16px 12px',
        display: 'flex',
        gap: '12px',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--card-hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* 아바타 */}
      <div style={{ paddingTop: 2 }}>
        <Avatar size={40} />
      </div>

      {/* 콘텐츠 영역 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 상단: 이름 + 핸들 + 날짜 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1 }}>
            구구엑스
          </span>
          {createdAt && (
            <>
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>·</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {formatMSK(createdAt)} MSK
              </span>
            </>
          )}
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto', opacity: 0.5 }}>
            #{index}
          </span>
        </div>

        {/* 본문 */}
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.7,
            color: 'var(--text-main)',
            whiteSpace: 'pre-line',
            wordBreak: 'keep-all',
            overflowWrap: 'break-word',
            margin: '0 0 12px',
          }}
        >
          {content}
        </p>

        {/* 하단 액션 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* 좋아요 */}
          <ActionButton
            onClick={() => sendVote('like')}
            disabled={voting}
            active={vote === 'like'}
            activeColor="#1d9bf0"
            activeBg="rgba(29,155,240,0.12)"
            hoverBg="rgba(29,155,240,0.08)"
            label="좋아"
            icon={<HeartIcon filled={vote === 'like'} />}
          />

          {/* 싫어요 */}
          <ActionButton
            onClick={() => sendVote('dislike')}
            disabled={voting}
            active={vote === 'dislike'}
            activeColor="#f4212e"
            activeBg="rgba(244,33,46,0.12)"
            hoverBg="rgba(244,33,46,0.08)"
            label="별로"
            icon={<DislikeIcon filled={vote === 'dislike'} />}
          />

          {/* 출처 */}
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginLeft: 4,
                fontSize: 13,
                color: 'var(--text-muted)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                padding: '4px 8px',
                borderRadius: 999,
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(29,155,240,0.08)'
                ;(e.currentTarget as HTMLElement).style.color = '#1d9bf0'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
              }}
            >
              <LinkIcon />
              출처
            </a>
          )}

          {/* 복사 */}
          <div style={{ marginLeft: 'auto' }}>
            <button
              onClick={copy}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 13,
                padding: '4px 10px',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
                background: copied ? 'rgba(29,155,240,0.15)' : 'transparent',
                color: copied ? '#1d9bf0' : 'var(--text-muted)',
              }}
              onMouseEnter={e => {
                if (!copied) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(29,155,240,0.08)'
                  ;(e.currentTarget as HTMLElement).style.color = '#1d9bf0'
                }
              }}
              onMouseLeave={e => {
                if (!copied) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
                }
              }}
              title="복사"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? '복사됨' : '복사'}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

function ActionButton({
  onClick, disabled, active, activeColor, activeBg, hoverBg, label, icon
}: {
  onClick: () => void
  disabled: boolean
  active: boolean
  activeColor: string
  activeBg: string
  hoverBg: string
  label: string
  icon: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 13,
        padding: '4px 8px',
        borderRadius: 999,
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.15s, color 0.15s',
        background: active ? activeBg : hovered ? hoverBg : 'transparent',
        color: active ? activeColor : hovered ? activeColor : 'var(--text-muted)',
      }}
    >
      {icon}
      {label}
    </button>
  )
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function DislikeIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10zM17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  )
}

const PAGE_SIZE = 20

export default function Home() {
  const [data, setData] = useState<PostsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
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
        root.style.setProperty('--bg', '#000000')
        root.style.setProperty('--bg-header', 'rgba(0,0,0,0.85)')
        root.style.setProperty('--border', '#2f3336')
        root.style.setProperty('--card-hover', 'rgba(255,255,255,0.03)')
        root.style.setProperty('--text-main', '#e7e9ea')
        root.style.setProperty('--text-sub', '#71767b')
        root.style.setProperty('--text-muted', '#536471')
        root.style.setProperty('--btn-bg', '#eff3f4')
        root.style.setProperty('--btn-text', '#0f1419')
        root.style.setProperty('--btn-hover', '#d7dbdc')
      } else {
        root.style.setProperty('--bg', '#ffffff')
        root.style.setProperty('--bg-header', 'rgba(255,255,255,0.85)')
        root.style.setProperty('--border', '#eff3f4')
        root.style.setProperty('--card-hover', 'rgba(0,0,0,0.02)')
        root.style.setProperty('--text-main', '#0f1419')
        root.style.setProperty('--text-sub', '#536471')
        root.style.setProperty('--text-muted', '#8b98a5')
        root.style.setProperty('--btn-bg', '#0f1419')
        root.style.setProperty('--btn-text', '#ffffff')
        root.style.setProperty('--btn-hover', '#272c30')
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
        setGenerateMsg('요청 완료! 1~2분 후 새로고침하세요.')
      } else {
        const err = await res.json()
        setGenerateMsg(`오류: ${err.error}`)
      }
    } catch {
      setGenerateMsg('요청 실패')
    }
    setGenerating(false)
    setTimeout(() => setGenerateMsg(''), 6000)
  }

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const load = async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const res = await fetch('/api/posts')
      if (!res.ok) throw new Error('failed')
      const json = await res.json()
      setData(json)
      setVisibleCount(PAGE_SIZE)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
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

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg, #000)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Avatar size={48} />
          <p style={{ fontSize: 14, color: 'var(--text-muted, #536471)' }}>불러오는 중...</p>
        </div>
      </main>
    )
  }

  if (loadError || !data) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg, #000)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <p style={{ fontSize: 14, color: 'var(--text-muted, #536471)' }}>불러오기 실패</p>
          <button onClick={load} style={{ fontSize: 13, padding: '6px 16px', borderRadius: 999, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', cursor: 'pointer' }}>
            다시 시도
          </button>
        </div>
      </main>
    )
  }

  const visible = data.posts.slice(0, visibleCount)
  const hasMore = visibleCount < data.posts.length

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg, #000)', maxWidth: 600, margin: '0 auto' }}>
      {/* 헤더 */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          background: 'var(--bg-header)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* 프로필 */}
          <Avatar size={34} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
              구구엑스
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1 }}>
              {data.posts.length}개 포스팅
            </div>
          </div>

          {/* 상태 메시지 */}
          {generateMsg && (
            <span style={{ fontSize: 12, color: 'var(--text-sub)', maxWidth: 140, textAlign: 'right', lineHeight: 1.3 }}>
              {generateMsg}
            </span>
          )}

          {/* 생성 버튼 */}
          <button
            onClick={generate}
            disabled={generating}
            style={{
              fontSize: 14,
              fontWeight: 700,
              padding: '6px 16px',
              borderRadius: 999,
              border: 'none',
              cursor: generating ? 'default' : 'pointer',
              opacity: generating ? 0.5 : 1,
              background: 'var(--btn-bg)',
              color: 'var(--btn-text)',
              transition: 'background 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (!generating) (e.currentTarget as HTMLElement).style.background = 'var(--btn-hover)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--btn-bg)' }}
          >
            {generating ? '요청 중...' : '지금 생성'}
          </button>
        </div>
      </header>

      {/* 피드 */}
      {data.posts.length === 0 ? (
        <div style={{ padding: '80px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>아직 생성된 포스팅이 없어요</p>
        </div>
      ) : (
        <>
          {visible.map((post, i) => {
            const p = typeof post === 'string' ? post : post
            const key = typeof p === 'string' ? `str-${i}` : ((p as Post).link || (p as Post).created_at || `post-${i}`)
            return <PostItem key={key} index={i + 1} post={p} />
          })}
          <div ref={sentinelRef} style={{ padding: '32px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {hasMore ? '불러오는 중...' : `전체 ${data.posts.length}개`}
            </p>
          </div>
        </>
      )}

      {/* 맨 위로 버튼 */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 50,
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '1px solid var(--border)',
            background: 'var(--bg-header)',
            backdropFilter: 'blur(12px)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-sub)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
            transition: 'background 0.15s',
          }}
          aria-label="맨 위로"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>
      )}
    </main>
  )
}
