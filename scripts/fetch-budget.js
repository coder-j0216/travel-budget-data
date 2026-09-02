import fs from 'fs';

// 데이터를 가져올 5개 나라 (위키보야지 영문 페이지 이름 기준)
const COUNTRIES = [
  { key: 'japan', page: 'Japan' },
  { key: 'vietnam', page: 'Vietnam' },
  { key: 'thailand', page: 'Thailand' },
  { key: 'taiwan', page: 'Taiwan' },
  { key: 'philippines', page: 'Philippines' },
];

// 페이지 안에서 "Budget"이라는 이름의 섹션을 찾아 텍스트로 가져오는 함수
async function getBudgetText(page) {
  const sectionsUrl = `https://en.wikivoyage.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=sections&format=json`;
  const sectionsRes = await fetch(sectionsUrl);
  const sectionsData = await sectionsRes.json();

  const budgetSection = sectionsData.parse.sections.find((s) =>
    s.line.toLowerCase().includes('budget')
  );
  if (!budgetSection) return null;

  const textUrl = `https://en.wikivoyage.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&section=${budgetSection.index}&prop=text&format=json`;
  const textRes = await fetch(textUrl);
  const textData = await textRes.json();

  const html = textData.parse.text['*'];
  // HTML 태그를 제거해서 순수 텍스트만 남김
  const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return plainText.slice(0, 1500); // 너무 길면 1500자까지만 저장
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
    await new Promise((r) => setTimeout(r, 500)); // 서버 부담 줄이기용 딜레이
  }

  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/budget.json', JSON.stringify(result, null, 2));
  console.log('저장 완료: data/budget.json');
}

main();