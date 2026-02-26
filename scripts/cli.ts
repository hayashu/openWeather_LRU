import * as readline from 'readline';
 
const BASE_URL = 'http://localhost:3000';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ターミナル入力を Promise でラップ
function ask(question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  console.log('\n=== 天気予報 CLI ===\n');

  // Step 1: 地方を選択
  const { regions } = await fetch(`${BASE_URL}/prefectures`).then(r => r.json());
  console.log('地方を選択してください:');
  regions.forEach((r: { id: number; name: string }) => {
    console.log(`  ${r.id}: ${r.name}`);
  });

  const regionInput = await ask('\n番号を入力 > ');
  const { region, prefectures } = await fetch(`${BASE_URL}/prefectures/${regionInput.trim()}`).then(r => r.json());

  // Step 2: 都道府県を選択
  console.log(`\n【${region}】の都道府県:`);
  prefectures.forEach((pref: string, i: number) => {
    console.log(`  ${i + 1}: ${pref}`);
  });

  const prefInput = await ask('\n番号を入力 > ');
  const selectedPref = prefectures[parseInt(prefInput.trim()) - 1];

  // Step 3: 都市を選択
  const { cities } = await fetch(
    `${BASE_URL}/cities/${encodeURIComponent(selectedPref)}`
  ).then(r => r.json());

  console.log(`\n【${selectedPref}】の都市:`);
  cities.forEach((c: { no: number; name: string }) => {
    console.log(`  ${c.no}: ${c.name}`);
  });

  const cityInput = await ask('\n番号を入力 > ');
  const selectedCity = cities[parseInt(cityInput.trim()) - 1];

  // Step 4: 天気予報を取得
  console.log(`\n${selectedCity.name} の天気予報を取得中...`);
  const forecast = await fetch(`${BASE_URL}/forecast/${selectedCity.id}`).then(r => r.json());
  console.log('\n=== 天気予報 ===');
  // console.log(JSON.stringify(forecast, null, 2));
  rl.close();
}

main().catch(err => {
  console.error('エラー:', err.message);
  rl.close();
});