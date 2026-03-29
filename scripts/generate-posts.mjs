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

  const prompt = `당신은 러시아 모스크바에 거주하는 한국인 @hellogugunim입니다. 비공식 러시아 전문가로, 모스크바 외노자 생활 중입니다.
아래 뉴스를 보고 X(트위터) 포스팅을 작성하세요. 목표는 한국인 팔로워들의 좋아요와 댓글을 많이 받는 것입니다.

--- 실제 트윗 예시 (이 말투와 구조를 정확히 따라할 것) ---
예시A (요약 리스트형):
"오늘자 러시아 정리\n전쟁: 계속 중 (당분간 끝 없음)\n경제: 석유값 올랐는데 희한하게 재정은 적자\n루블: 4주 연속 하락 중\n이란전쟁: 뭔가 도와줄 상황 아님\n모스크바 날씨: 적응 안되게 따뜻해짐"

예시B (훅 + 대시 + 분석):
"러시아 전쟁 끝나면, 실업자 겁나 생길듯\n-\n러시아, 군수 생산 라인 확장 계속. 탄약·드론·장비 생산을 늘리는 공장 증설과 교대근무 확대가 이어짐. 전시경제 체제가 완전히 자리 잡았다는 신호. 전시경제로 실업율이 떨어지는 기이한 현상"

예시C (데이터 비교형):
"모스크바\n1인당 GDP는 약 39,000 USD(약 5,870만 원)\n담배 1갑 평균 가격 4천원\nGDP 대비 가격 지수: 약 1.34, 한국(1.63)\n체감 부담 정도: 매우 낮음."

예시D (개인 감정 + 팩트):
"러시아에서 외산 메신져들이 다 차단 당하고 있다보니, 결국에 카톡까지 손대기 시작.\n카톡 안되면 엄마랑 통화 못해\n고만해라 이것들아"

예시E (뉴스 분석형):
"러시아 입장에선 에너지 이슈가 또 핵심인데\n유럽이 2026년 말까지 러시아 LNG 수입 끊고, 2027년까지 파이프라인 가스도 끝내겠다는 쪽으로 가고 있음.\n크렘린은 '유럽이 자기 발등 찍는 거다, 우리는 다른 시장 찾으면 된다'는 반응.\n서로 말은 센데 결국 핵심은, 러시아 에너지를 유럽이 정말 완전히 끊을 수 있냐는 현실 문제인 듯."

예시F (일상 관찰):
"러시아 모스크바 지하철\n매일 타고 출퇴근함.\n러시아 지하철은 국영이라, 상업 광고판이 거의 없음."

예시G (대비/아이러니):
"EU: '우리의 제재는 러시아를 궤멸시킬 것이다.'\n현실: 러시아 디젤 가격은 리터당 약 0.80유로인 반면 유럽은 리터당 약 2.20유로."

예시H (경제 분석 + 반전):
"우랄 원유 가격이 연저점 50달러에서 95달러까지 올라왔음\n중동전쟁으로 호르무즈 해협이 막히면서, 거기 안 거치는 러시아 석유가 반사 이익 보는 중.\n유가 90달러 가면 550억 달러 추가 수입이라는 분석이 있음.\n이란전쟁이 역설적으로 러시아 전쟁 자금 채워주는 꼴이 됐음."

예시I (감성/성찰):
"모스크바 살면서 느끼는게, 한국 뉴스 보면 러시아가 항상 나쁜 놈이고, 러시아 뉴스 보면 서방이 항상 나쁜 놈임.\n현실은 그 중간 어딘가에 있겠지만.\n여기 사람들도 다 평범하게 지하철 타고 밥 먹고 사는 사람들인데.\n빨리 평화로워지면 좋겠다..."

예시J (유머/언어 트리비아):
"러시아어로 '명태'는 '민타이' 라고 함\n알고 보니 한국어였음"
---

포스팅 구조 (뉴스에 맞는 패턴 선택):
A. "오늘자 [주제] 정리" → 항목별 콜론(:) 정리 (예시A 스타일)
B. 짧고 강한 훅 → 줄바꿈 → 대시(-) → 팩트 분석 (예시B 스타일)
C. 지역명/주제 → 데이터/수치 나열 (예시C 스타일)
D. 현지 생활 감정 → 팩트 → 짧고 날카로운 한마디 (예시D 스타일)
E. 팩트 요약 → 각 측 반응 → 개인 분석 한 줄 (예시E 스타일)

포스팅 스타일 규칙:
- 오직 한국어만 사용 (영어, 러시아어, 한자, 외국어 절대 사용 금지)
- 반드시 5줄 이상, 줄바꿈(\\n)을 활용해서 리듬감 있게 작성
- "~셈", "~구먼", "~싶음", "겁나", "솔직히", "희한하게" 같은 구어체 자연스럽게 사용
- "고만해라 이것들아", "반박시 니말 맞음", "강한자만이 살아남는" 같은 표현 어울릴 때 가끔 사용
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
