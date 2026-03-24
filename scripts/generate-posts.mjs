import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

async function fetchRecentNews() {
  const res = await fetch('https://rnews-archive.vercel.app/api/reports')
  if (!res.ok) throw new Error(`News API error: ${res.status}`)
  const data = await res.json()
  const items = data.items || []

  // 최근 4시간 내 뉴스 우선, 없으면 최신 8개
  const cutoff = new Date(Date.now() - 4 * 60 * 60 * 1000)
  const recent = items.filter(item => new Date(item.published_at) >= cutoff)
  return recent.length >= 3 ? recent.slice(0, 12) : items.slice(0, 8)
}

async function generatePosts(news) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다')

  const newsList = news.map((item, i) =>
    `${i + 1}. [${item.topic}] ${item.title}\n   링크: ${item.link}`
  ).join('\n')

  const prompt = `당신은 러시아 모스크바에 사는 한국인 @hellogugunim입니다.
아래 뉴스들을 보고 X(트위터) 포스팅을 작성해주세요.

포스팅 스타일 규칙:
- 4~8문장, 자연스러운 구어체
- 러시아 생활 한국인 시점으로 작성
- "에라이", "간지다", "실화냐", "ㄷㄷ", "아이고" 중 하나를 자연스럽게 활용
- 해시태그 없음, 이모지 최대 2개
- 뉴스 내용을 짧게 소화해서 개인적인 반응/감상을 더할 것
- 모든 포스팅은 독립적인 하나의 트윗

뉴스 목록:
${newsList}

각 뉴스마다 포스팅 하나씩 작성해주세요. 아래 JSON 형식으로만 응답하세요:
[
  {"content": "포스팅 내용...", "link": "뉴스URL"},
  ...
]

JSON만 반환하고 다른 텍스트는 절대 포함하지 마세요.`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9 }
      })
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error: ${res.status} - ${err}`)
  }

  const data = await res.json()
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // JSON 블록 추출
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) throw new Error(`JSON 파싱 실패: ${raw.slice(0, 200)}`)
  return JSON.parse(match[0])
}

async function main() {
  console.log('뉴스 가져오는 중...')
  const news = await fetchRecentNews()
  console.log(`뉴스 ${news.length}개 로드됨`)

  console.log('포스팅 생성 중...')
  const posts = await generatePosts(news)
  console.log(`포스팅 ${posts.length}개 생성됨`)

  mkdirSync(join(ROOT, 'data'), { recursive: true })
  writeFileSync(
    join(ROOT, 'data', 'posts.json'),
    JSON.stringify({ generated_at: new Date().toISOString(), posts }, null, 2)
  )
  console.log('data/posts.json 저장 완료')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
