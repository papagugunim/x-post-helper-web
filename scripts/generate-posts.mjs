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

--- 실제 말투 예시 (이 스타일 그대로 따라할 것) ---
예시1: "러시아 국회에서 3세 미만 자녀를 둔 여성 고용 시 수습 기간 설정을 금지하는 법률을 채택했다. 노동자의 나라. 로시아."
예시2: "오늘 러시아 인터넷 여론 한 줄 평: 밖에선 에너지 돈줄 다시 챙기고, 안에선 인터넷 밸브 더 잠그는 중. 수입 방어는 아시아로, 통제 강화는 국내 플랫폼으로. 지금 러시아 뉴스의 두 축이 거의 이 조합으로 굴러감."
예시3: "노바텍이 베트남 바이어와 LNG 공급 예비합의를 맺었다고 오늘 공개했음. 몇 년 끌던 협상이 이번에 진전된 거라서, 러시아 입장에선 유럽 대신 아시아 장기 계약 카드가 하나 더 생긴 셈."
예시4: "무기 산업은 풀가동인데 일반 제조업은 슬슬 힘들어지는 신호. 전쟁 경제의 왜곡된 구조가 보이는 것 같음. 총 만드는 회사는 야근, 트랙터 만드는 회사는 조기 퇴근. 이게 맞나 싶음."
예시5: "러시아 인터넷 통제 계속 강화 중. 브이피엔 써서 겨우겨우 살고 있음. 한국인을 가장 열받게 하는 게 인터넷이 잘 안 되는 건데, 큰일났다 진짜 ㅠㅠ"
---

포스팅 스타일 규칙:
- 오직 한국어만 사용 (영어, 러시아어, 한자, 외국어 절대 사용 금지)
- 뉴스 팩트를 먼저 간결하게 요약한 뒤, 짧은 코멘트/감상을 붙이는 구조
- 포스팅 하나당 3~6문장, 반드시 완전한 문장으로 마무리할 것 (문장이 중간에 끊기면 절대 안됨)
- "~셈", "~구먼", "~굴러감", "~못 박음", "~인 듯", "~싶음" 같은 담백한 서술어 사용
- "아이고", "에라이", "실화냐", "ㄷㄷ" 등은 어울릴 때만 가끔 사용 (강제 금지)
- 해시태그 없음, 이모지 없거나 최대 1개
- 분석적이고 담백한 톤, 과장하지 말 것
- content 안에 URL이나 링크 절대 포함 금지
- 마지막 문장은 반드시 마침표나 "~임", "~셈", "~됨" 등 완결된 형태로 끝낼 것

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
        max_tokens: 4096,
        messages: [
          {
            role: 'system',
            content: '당신은 한국어만 사용하는 어시스턴트입니다. 영어, 러시아어, 한자, 기타 외국어는 절대 사용하지 마세요. 모든 응답은 순수한 한국어로만 작성하세요.'
          },
          { role: 'user', content: prompt }
        ],
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

  // content 정제 및 외국어 포함 포스팅 필터링
  const cyrillic = /[а-яёА-ЯЁ]/
  const foreignWord = /\b[a-zA-Z]{3,}\b/  // 3글자 이상 영어 단어 1개라도
  const chineseChar = /[\u4e00-\u9fff]/    // 한자

  return posts
    .map(p => ({
      ...p,
      content: (typeof p === 'string' ? p : p.content)
        .replace(/링크는?\s*https?:\/\/\S+/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .trim()
    }))
    .filter(p => {
      const content = p.content || ''
      if (cyrillic.test(content)) return false    // 러시아어 제거
      if (foreignWord.test(content)) return false // 영어 단어 제거
      if (chineseChar.test(content)) return false // 한자 제거
      return true
    })
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
