import fs from 'fs';

// 우리가 다루는 5개국의 ISO 국가코드 (CSV 안의 iso_a3 값과 일치해야 함)
const COUNTRIES = {
  japan: 'JPN',
  vietnam: 'VNM',
  thailand: 'THA',
  taiwan: 'TWN',
  philippines: 'PHL',
};
const KOREA_CODE = 'KOR';

// 아주 간단한 CSV 파싱 함수 (쉼표로 나누기만 하면 되는 단순한 구조라 별도 라이브러리 없이 처리)
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const values = line.split(',');
    const row = {};
    headers.forEach((h, i) => (row[h] = values[i]));
    return row;
  });
}

async function main() {
  const url =
    'https://raw.githubusercontent.com/TheEconomist/big-mac-data/master/output-data/big-mac-raw-index.csv';
  const res = await fetch(url);
  const csvText = await res.text();
  const rows = parseCSV(csvText);

  // 가장 최신 날짜만 골라내기
  const latestDate = rows.reduce((max, r) => (r.date > max ? r.date : max), rows[0].date);
  const latestRows = rows.filter((r) => r.date === latestDate);

  const koreaRow = latestRows.find((r) => r.iso_a3 === KOREA_CODE);
  const koreaPrice = parseFloat(koreaRow.dollar_price);

  const result = {};
  for (const [key, isoCode] of Object.entries(COUNTRIES)) {
    const row = latestRows.find((r) => r.iso_a3 === isoCode);
    if (!row) continue;

    const price = parseFloat(row.dollar_price);
    // 한국보다 몇 % 저렴한지(음수) 혹은 비싼지(양수) 계산
    const percentDiff = ((price - koreaPrice) / koreaPrice) * 100;

    result[key] = {
      country: row.name,
      bigMacPriceUSD: price,
      comparedToKoreaPercent: Math.round(percentDiff * 10) / 10, // 소수점 1자리까지
      summary:
        percentDiff < 0
          ? `한국보다 약 ${Math.abs(Math.round(percentDiff))}% 저렴해요`
          : `한국보다 약 ${Math.round(percentDiff)}% 비싸요`,
      dataDate: latestDate,
      updatedAt: new Date().toISOString(),
    };
  }

  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/budget.json', JSON.stringify(result, null, 2));
  console.log('저장 완료: data/budget.json');
  console.log(result);
}

main();
