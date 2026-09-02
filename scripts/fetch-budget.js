import fs from 'fs';

const KOREA_CODE = 'KOR';

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

  const latestDate = rows.reduce((max, r) => (r.date > max ? r.date : max), rows[0].date);
  const latestRows = rows.filter((r) => r.date === latestDate);

  const koreaRow = latestRows.find((r) => r.iso_a3 === KOREA_CODE);
  const koreaPrice = parseFloat(koreaRow.dollar_price);

  // 이제 5개국이 아니라, 데이터에 있는 모든 나라를 저장 (검색 기능용)
  const result = {};
  for (const row of latestRows) {
    const price = parseFloat(row.dollar_price);
    if (!price || !koreaPrice) continue;

    const percentDiff = ((price - koreaPrice) / koreaPrice) * 100;

    result[row.iso_a3] = {
      isoCode: row.iso_a3,
      country: row.name,
      currencyCode: row.currency_code,
      bigMacPriceUSD: price,
      // 참고용 환율 (달러 대비 현지 통화, 반기별 갱신)
      referenceRateToUSD: parseFloat(row.dollar_ex),
      comparedToKoreaPercent: Math.round(percentDiff * 10) / 10,
      summary:
        percentDiff < 0
          ? `한국보다 약 ${Math.abs(Math.round(percentDiff))}% 저렴해요`
          : `한국보다 약 ${Math.round(percentDiff)}% 비싸요`,
      dataDate: latestDate,
    };
  }

  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(
    'data/budget.json',
    JSON.stringify({ updatedAt: new Date().toISOString(), countries: result }, null, 2)
  );
  console.log(`저장 완료: ${Object.keys(result).length}개국`);
}

main();
