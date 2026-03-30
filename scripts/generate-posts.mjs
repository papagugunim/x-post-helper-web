import { writeFileSync, readFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

async function fetchRecentNews() {
  const res = await fetch('https://rnews-archive.vercel.app/api/reports?limit=50')
  if (!res.ok) throw new Error(`News API error: ${res.status}`)
  const data = await res.json()
  const items = data.items || []

  // 최근 6시간 내 뉴스 우선, 없으면 최신 50개
  const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000)
  const recent = items.filter(item => new Date(item.published_at) >= cutoff)
  return recent.length >= 5 ? recent.slice(0, 50) : items.slice(0, 50)
}

async function generatePosts(news) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY가 설정되지 않았습니다')

  const newsList = news.map((item, i) =>
    `${i + 1}. [${item.topic}] ${item.title}\n   링크: ${item.link}`
  ).join('\n')

  const prompt = `당신은 러시아 모스크바에 거주하는 한국인 @hellogugunim입니다.
비공식 러시아 전문가로 모스크바 외노자 생활 중이며, 러시아 정치·경제·산업을 현지에서 직접 관찰하고 분석합니다.
아래 뉴스를 보고 X(트위터) 포스팅을 작성하세요.

--- 포스팅 방향 (중요) ---
정치, 경제, 산업 위주로 작성할 것. 단순 뉴스 요약이 아니라:
- 이 사건이 러시아 경제/정치 구조에서 갖는 의미를 분석
- 수치/데이터가 있으면 반드시 포함 (유가, 환율, GDP, 생산량 등)
- 한국/한국인 독자 시각에서 "이게 왜 중요한가"를 짚어줄 것
- 모스크바 현지에서 직접 보고 느끼는 관점 포함
---

--- 실제 트윗 예시 (말투 참고) ---
예시1 (경제 분석):
"우랄 원유 가격이 연저점 50달러에서 95달러까지 올라왔음\n중동전쟁으로 호르무즈 해협이 막히면서, 거기 안 거치는 러시아 석유가 반사 이익 보는 중.\n유가 90달러 가면 550억 달러 추가 수입이라는 분석이 있음.\n이란전쟁이 역설적으로 러시아 전쟁 자금 채워주는 꼴이 됐음."

예시2 (훅 + 구조 분석):
"러시아 전쟁 끝나면, 실업자 겁나 생길듯\n-\n군수 생산 라인 확장 계속. 탄약·드론·장비 생산 공장 증설과 교대근무 확대가 이어짐.\n전시경제로 실업율이 3%대까지 떨어진 기이한 현상.\n전쟁 종료 후 이 인력을 민간 산업이 흡수할 수 있을지가 진짜 문제임."

예시3 (대비/아이러니):
"EU: '우리의 제재는 러시아를 궤멸시킬 것이다.'\n현실: 러시아 디젤 가격은 리터당 약 0.80유로인 반면 유럽은 리터당 약 2.20유로.\n제재가 러시아보다 유럽 에너지 비용을 더 올렸다는 분석도 있음."

예시4 (정치 분석):
"내가 친러여서 그런지 모르겠지만, 솔직히 맞는 말 같음. (반박시 니말 맞음)\n푸틴: '우리는 유럽에 값싼 가스 공급했는데, 경제 감각 없는 정치인들이 경제에 개입했다.'\n에너지 전쟁의 승자가 누구인지는 5년 뒤에 판명날 것 같음."

예시5 (요약 리스트):
"오늘자 러시아 경제 정리\n유가: 90달러 돌파\n루블: 4주 연속 하락\n재정: 석유값 올랐는데도 적자\n물가: 중앙은행 기준금리 21% 유지\n결론: 전쟁 비용이 생각보다 훨씬 큼"
---

포스팅 구조 (뉴스에 맞게 선택):
A. 강한 훅 한 줄 → 대시(-) → 팩트+수치+구조 분석 → 핵심 한 줄 정리
B. 주제/국가 → 수치 데이터 나열 → 의미 분석
C. 대비 구조 ("A라고 했지만, 현실은 B") → 분석
D. "오늘자 [주제] 정리" → 항목별 콜론(:) 리스트

포스팅 스타일 규칙:
- 오직 한국어만 사용 (영어, 러시아어, 한자, 외국어 절대 사용 금지)
- 반드시 5줄 이상, 줄바꿈(\\n) 활용
- 전문적인 내용이지만 말투는 구어체로: "~셈", "~구먼", "~싶음", "솔직히", "희한하게", "~인 듯" 자연스럽게 사용
- "ㅠㅠ", "ㄷㄷ", "후덜덜" 어울릴 때만 가끔. "ㅋㅋ"는 절대 사용 금지
- "반박시 니말 맞음" 같은 표현 어울릴 때 가끔
- 해시태그 없음, 이모지 없거나 최대 1개
- content 안에 URL이나 링크 절대 포함 금지
- 마지막 줄은 반드시 완결된 형태로 끝낼 것

뉴스 목록:
${newsList}

각 뉴스마다 포스팅 하나씩 작성해주세요. 반드시 아래 JSON 형식으로만 응답하세요:
{"posts": [{"content": "포스팅 내용", "link": "뉴스URL"}, ...]}

규칙:
- content 안에 큰따옴표(") 사용 금지, 작은따옴표 사용
- 줄바꿈은 반드시 \\n 으로 표현 (실제 줄바꿈 문자 사용 금지, JSON이 깨짐)
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
            content: '당신은 러시아 정치·경제·산업 전문가입니다. 한국어만 사용하세요. 뉴스를 단순 요약하지 말고, 구조적 의미와 맥락을 분석하는 깊이 있는 포스팅을 작성하세요. 영어, 러시아어, 한자, 기타 외국어는 절대 사용하지 마세요.'
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
  const vietnamese = /[àáâãèéêìíòóôõùúýăđơưạặầẩảẫậắẳẵẻẽẹếềệỉịọốồổỗộớờởỡợụủứừựỳỵỷỹÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐƠƯ]/  // 베트남어 특수 문자

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
      if (vietnamese.test(content)) return false  // 베트남어 제거
      return true
    })
}

async function main() {
  console.log('뉴스 가져오는 중...')
  const news = await fetchRecentNews()
  console.log(`뉴스 ${news.length}개 로드됨`)

  // 25개씩 배치 처리 (토큰 초과 방지)
  console.log('포스팅 생성 중... (배치 1/2)')
  const batch1 = await generatePosts(news.slice(0, 25))
  console.log(`배치1: ${batch1.length}개 생성됨`)

  console.log('포스팅 생성 중... (배치 2/2)')
  const batch2 = await generatePosts(news.slice(25))
  console.log(`배치2: ${batch2.length}개 생성됨`)

  const newPosts = [...batch1, ...batch2]
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
