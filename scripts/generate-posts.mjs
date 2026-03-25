import { writeFileSync, readFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

async function fetchRecentNews() {
  const res = await fetch('https://rnews-archive.vercel.app/api/reports')
  if (!res.ok) throw new Error(`News API error: ${res.status}`)
  const data = await res.json()
  const items = data.items || []

  // 최근 6시간 내 뉴스 우선, 없으면 최신 20개
  const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000)
  const recent = items.filter(item => new Date(item.published_at) >= cutoff)
  return recent.length >= 5 ? recent.slice(0, 20) : items.slice(0, 20)
}

async function generatePosts(news) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY가 설정되지 않았습니다')

  const newsList = news.map((item, i) =>
    `${i + 1}. [${item.topic}] ${item.title}\n   링크: ${item.link}`
  ).join('\n')

  const prompt = `당신은 러시아 모스크바에 사는 한국인 @hellogugunim입니다.
아래 뉴스들을 보고 X(트위터) 포스팅을 작성해주세요.

포스팅 스타일 규칙:
- 반드시 4문장 이상 10문장 이하로 작성 (짧으면 안 됨)
- 오직 한국어만 사용 (영어, 러시아어, 한자, 외국어 절대 사용 금지)
- 자연스러운 한국어 구어체
- 러시아 생활 한국인 시점으로 작성
- "에라이", "간지다", "실화냐", "ㄷㄷ", "아이고" 중 하나를 자연스럽게 활용
- 해시태그 없음, 이모지 최대 2개
- 뉴스 내용을 소화하고, 배경 설명 + 개인적인 반응/감상을 충분히 풀어쓸 것
- 모든 포스팅은 독립적인 하나의 트윗
- content 안에 URL이나 링크 절대 포함 금지

뉴스 목록:
${newsList}

각 뉴스마다 포스팅 하나씩 작성해주세요. 반드시 아래 JSON 형식으로만 응답하세요:
{"posts": [{"content": "포스팅 내용", "link": "뉴스URL"}, ...]}

규칙:
- content 안에 큰따옴표(") 사용 금지, 작은따옴표 사용
- content 안에 줄바꿈 금지, 문장은 공백으로 이어쓸 것
- JSON 외 다른 텍스트 절대 포함 금지`

  const res = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        response_format: { type: 'json_object' }
      })
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq API error: ${res.status} - ${err}`)
  }

  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content || ''

  // JSON 파싱 (json_object 모드이므로 항상 유효한 JSON)
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    // 혹시라도 파싱 실패 시 배열/객체 추출 시도
    const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (!match) throw new Error(`JSON 파싱 실패: ${raw.slice(0, 200)}`)
    parsed = JSON.parse(match[0])
  }
  const posts = Array.isArray(parsed) ? parsed : (parsed.posts || [])

  // content 안의 URL 및 "링크는 ..." 패턴 제거
  return posts.map(p => ({
    ...p,
    content: (typeof p === 'string' ? p : p.content)
      .replace(/링크는?\s*https?:\/\/\S+/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim()
  }))
}

async function main() {
  console.log('뉴스 가져오는 중...')
  const news = await fetchRecentNews()
  console.log(`뉴스 ${news.length}개 로드됨`)

  console.log('포스팅 생성 중...')
  const newPosts = await generatePosts(news)
  const now = new Date().toISOString()
  const stamped = newPosts.map(p => ({ ...p, created_at: now }))
  console.log(`포스팅 ${stamped.length}개 생성됨`)

  // 기존 포스팅 불러오기
  const postsPath = join(ROOT, 'data', 'posts.json')
  let existing = []
  try {
    const raw = readFileSync(postsPath, 'utf-8')
    const parsed = JSON.parse(raw)
    existing = parsed.posts || []
  } catch { /* 파일 없으면 빈 배열 */ }

  // 새 포스팅을 앞에 추가, 최대 500개 유지
  const all = [...stamped, ...existing].slice(0, 500)

  mkdirSync(join(ROOT, 'data'), { recursive: true })
  writeFileSync(postsPath, JSON.stringify({ generated_at: now, posts: all }, null, 2))
  console.log(`data/posts.json 저장 완료 (총 ${all.length}개)`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
