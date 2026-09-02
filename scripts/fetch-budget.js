import fs from 'fs';

const COUNTRIES = [
  { key: 'japan', page: 'Japan' },
  { key: 'vietnam', page: 'Vietnam' },
  { key: 'thailand', page: 'Thailand' },
  { key: 'taiwan', page: 'Taiwan' },
  { key: 'philippines', page: 'Philippines' },
];

// 이 단어들이 제목에 들어간 섹션들만 후보로 검토함
const CANDIDATE_KEYWORDS = ['cost', 'budget', 'money', 'buy', 'sleep'];

// 텍스트 안에 "가격처럼 생긴 표현"이 몇 번 나오는지 세는 함수
function countPricePatterns(text) {
  const matches = text.match(/[¥₫₱฿$€£]\s?\d|\d[,.]?\d*\s?(yen|dong|baht|peso|dollar|won|NT\$)/gi);
  return matches ? matches.length : 0;
}

async function fetchSectionText(page, sectionIndex) {
  const url = `https://en.wikivoyage.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&section=${sectionIndex}&prop=text&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  const html = data.parse.text['*'];
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function getBudgetText(page) {
  const sectionsUrl = `https://en.wikivoyage.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=sections&format=json`;
  const sectionsRes = await fetch(sectionsUrl);
  const sectionsData = await sectionsRes.json();
  const allSections = sectionsData.parse.sections;

  // 제목에 후보 키워드가 들어간 섹션들만 추려냄
  const candidates = allSections.filter((s) =>
    CANDIDATE_KEYWORDS.some((kw) => s.line.toLowerCase().includes(kw))
  );
  if (candidates.length === 0) return null;

  // 후보 섹션들을 하나씩 확인해서, 가격 표현이 제일 많은 걸 선택
  let bestText = null;
  let bestScore = -1;

  for (const section of candidates) {
    const text = await fetchSectionText(page, section.index);
    const score = countPricePatterns(text);
    if (score > bestScore) {
      bestScore = score;
      bestText = text;
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  // 가격 표현이 너무 적으면(3개 미만) 신뢰할 수 없다고 보고 비워둠
  if (bestScore < 3) return null;

  return bestText.slice(0, 1500);
}

async function main() {
  const result = {};
  for (const country of COUNTRIES) {
    console.log(`가져오는 중: ${country.page}`);
    try {
      const text = await getBudgetText(country.page);
      result[country.key] = {
        page: country.page,
        budgetText: text,
        updatedAt: new Date().toISOString(),
      };
    } catch (e) {
      console.error(`실패: ${country.page}`, e.message);
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/budget.json', JSON.stringify(result, null, 2));
  console.log('저장 완료: data/budget.json');
}

main();
