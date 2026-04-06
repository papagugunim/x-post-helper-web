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
  const rnewsItems = recent.length >= 5 ? recent.slice(0, 50) : items.slice(0, 50)

  // Google News RSS (한국어 러시아 뉴스)
  let googleItems = []
  try {
    const rssRes = await fetch('https://news.google.com/rss/search?q=러시아&hl=ko&gl=KR&ceid=KR:ko')
    if (rssRes.ok) {
      const xml = await rssRes.text()
      const entries = xml.match(/<item>[\s\S]*?<\/item>/g) || []
      googleItems = entries.slice(0, 30).map(item => {
        const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/))?.[1] || ''
        const link = (item.match(/<link>(.*?)<\/link>/) || [])[1] || ''
        const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || ''
        const source = (item.match(/<source[^>]*>(.*?)<\/source>/) || [])[1] || '한국 언론'
        return {
          title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
          link,
          topic: source,
          published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        }
      }).filter(i => i.title && i.link)
      console.log(`Google News: ${googleItems.length}개 로드됨`)
    }
  } catch (e) {
    console.warn('Google News RSS 실패:', e.message)
  }

  // 중복 링크 제거 후 합치기
  const allLinks = new Set(rnewsItems.map(i => i.link))
  const uniqueGoogle = googleItems.filter(i => !allLinks.has(i.link))
  return [...rnewsItems, ...uniqueGoogle]
}

async function generatePosts(news) {
  const apiKey = process.env.GH_TOKEN
  if (!apiKey) throw new Error('GH_TOKEN이 설정되지 않았습니다')

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

--- 실제 트윗 예시 (이 말투와 톤을 정확히 따라할 것) ---
예시1 (경제 분석):
"우랄 원유 가격이 연저점 50달러에서 95달러까지 올라왔음\n중동전쟁으로 호르무즈 해협이 막히면서, 거기 안 거치는 러시아 석유가 반사 이익 보는 중.\n유가 90달러 가면 550억 달러 추가 수입이라는 분석이 있음.\n이란전쟁이 역설적으로 러시아 전쟁 자금 채워주는 꼴이 됐음."

예시2 (훅 + 구조 분석):
"러시아 전쟁 끝나면, 실업자 겁나 생길듯\n-\n군수 생산 라인 확장 계속. 탄약·드론·장비 생산 공장 증설과 교대근무 확대가 이어짐.\n전시경제로 실업율이 3%대까지 떨어진 기이한 현상.\n전쟁 종료 후 이 인력을 민간 산업이 흡수할 수 있을지가 진짜 문제임."

예시3 (대비/아이러니):
"EU: '우리의 제재는 러시아를 궤멸시킬 것이다.'\n현실: 러시아 디젤 가격은 리터당 약 0.80유로인 반면 유럽은 리터당 약 2.20유로.\n제재가 러시아보다 유럽 에너지 비용을 더 올렸다는 분석도 있음."

예시4 (정치 + 개인 의견):
"내가 친러여서 그런지 모르겠지만, 솔직히 맞는 말 같음. (반박시 니말 맞음)\n푸틴: '우리는 유럽에 값싼 가스 공급했는데, 경제 감각 없는 정치인들이 경제에 개입했다.'\n에너지 전쟁의 승자가 누구인지는 5년 뒤에 판명날 것 같음."

예시5 (요약 리스트):
"오늘자 러시아 경제 정리\n유가: 90달러 돌파\n루블: 4주 연속 하락\n재정: 석유값 올랐는데도 적자\n물가: 중앙은행 기준금리 21% 유지\n결론: 전쟁 비용이 생각보다 훨씬 큼"

예시6 (현지 관찰 + 감성):
"현대 불곰국 주유소 기름가격 1달러가 채 안됨\n한국은 리터당 1,700원인데, 여기는 100루블 (약 1,400원)에 거의 꽉 채움.\n모스크바 살면서 그나마 기름값은 진짜 싸다는 거 인정."

예시7 (그럼 그렇지 스타일):
"그럼 그렇지...\n불곰국 중앙은행이 기준금리 21% 유지한다고 발표.\n물가 잡겠다고 올린 거지만, 기업들 대출 이자 부담이 장난 아님.\n전쟁 중에 고금리 유지하는 게 맞나 싶음."
---

페르소나 특징 (반드시 반영):
- 러시아를 "불곰국"으로 자연스럽게 표현 (모든 포스팅에 강제 X, 어울릴 때만)
- "그럼 그렇지...", "역시나" - 예상된 상황에 대한 반응
- "솔직히", "내가 보기엔", "모스크바에서 보면" - 현지인 시각 강조
- 한국/러시아 비교 (가격, 제도, 문화) - 독자 공감 유도
- "제발", "ㅠㅠ" - 진심 어린 감정 표현 (남발 금지)

포스팅 구조 (뉴스에 맞게 선택):
A. 강한 훅 한 줄 → 대시(-) → 팩트+수치+구조 분석 → 핵심 한 줄 정리
B. 주제 한 줄 → 수치 데이터 → 한/러 비교 → 의미 분석
C. 대비 구조 ("A라고 했지만, 현실은 B") → 현지 시각
D. "오늘자 [주제] 정리" → 항목별 콜론(:) 리스트 → 결론 한 줄

포스팅 스타일 규칙:
- 오직 한국어만 사용 (영어, 러시아어, 한자, 외국어 절대 사용 금지)
- 반드시 5줄 이상, 줄바꿈(\\n) 활용해서 리듬감 있게
- 전문적 분석이지만 말투는 구어체: "~셈", "~구먼", "~싶음", "솔직히", "희한하게", "~인 듯" 자연스럽게
- "ㅠㅠ", "ㄷㄷ", "후덜덜" 어울릴 때만 가끔. "ㅋㅋ"는 절대 사용 금지
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
    'https://models.inference.ai.azure.com/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 2000,
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
    throw new Error(`GitHub Models API error: ${res.status} - ${err}`)
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
  // 허용 약어: 경제/정치 전문용어 (GDP, IMF, EU, NATO, WTO, UN, KHL, RPL 등)
  const allowedAbbr = /^(GDP|GNP|IMF|EU|NATO|WTO|UN|KHL|RPL|UFC|UFC|KGB|FSB|CIA|USD|EUR|RUB|KRW|LNG|OPEC|SWIFT|G7|G20|BRI|CIS|SCO|CSTO)$/
  const foreignWord = /\b[a-zA-Z]{4,}\b/  // 4글자 이상 영어 단어만 체크 (3글자 약어 허용)
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
      // 영어 단어 체크: 4글자+ 단어 중 허용 약어가 아닌 것
      const englishWords = content.match(/\b[a-zA-Z]{4,}\b/g) || []
      if (englishWords.some(w => !allowedAbbr.test(w.toUpperCase()))) return false
      if (chineseChar.test(content)) return false // 한자 제거
      if (vietnamese.test(content)) return false  // 베트남어 제거
      return true
    })
}

async function main() {
  console.log('뉴스 가져오는 중...')
  const news = await fetchRecentNews()
  console.log(`뉴스 ${news.length}개 로드됨`)

  // 기존 포스팅 불러오기 (중복 체크용)
  const postsPath = join(ROOT, 'data', 'posts.json')
  let existing = []
  try {
    const raw = readFileSync(postsPath, 'utf-8')
    const parsed = JSON.parse(raw)
    existing = parsed.posts || []
  } catch { /* 파일 없으면 빈 배열 */ }

  // 이미 포스팅된 링크 추출
  const existingLinks = new Set(
    existing.map(p => (typeof p === 'string' ? '' : p.link)).filter(Boolean)
  )

  // 신규 뉴스만 필터링 (이미 처리된 링크 제외), 최대 15개
  const freshNews = news.filter(n => n.link && !existingLinks.has(n.link)).slice(0, 9)
  console.log(`신규 뉴스 ${freshNews.length}개 (중복 ${news.length - freshNews.length}개 이상 제외)`)

  if (freshNews.length === 0) {
    console.log('신규 뉴스 없음, 종료')
    return
  }

  // 3개씩 배치 처리 (TPM 6000 한도 내 처리)
  const batches = []
  for (let i = 0; i < freshNews.length; i += 3) {
    batches.push(freshNews.slice(i, i + 3))
  }

  const generateWithRetry = async (news, maxRetries = 5) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await generatePosts(news)
      } catch (e) {
        if (e.message.includes('429') && attempt < maxRetries - 1) {
          const waitMatch = e.message.match(/try again in (\d+\.?\d*)s/)
          const waitSecs = waitMatch ? Math.ceil(parseFloat(waitMatch[1])) + 3 : 65
          console.log(`Rate limited. ${waitSecs}초 대기 후 재시도...`)
          await new Promise(r => setTimeout(r, waitSecs * 1000))
        } else {
          throw e
        }
      }
    }
  }

  let newPosts = []
  for (let i = 0; i < batches.length; i++) {
    console.log(`포스팅 생성 중... (배치 ${i + 1}/${batches.length})`)
    const result = await generateWithRetry(batches[i])
    console.log(`배치${i + 1}: ${result.length}개 생성됨`)
    newPosts = [...newPosts, ...result]
  }

  const now = new Date().toISOString()
  const stamped = newPosts.map(p => ({ ...p, created_at: now }))
  console.log(`포스팅 ${stamped.length}개 생성됨`)

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
