import * as fs from 'fs';
import * as path from 'path';
import kuromoji from 'kuromoji';
import { toHiragana } from 'wanakana';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

interface CityEntry {
  id: number;
  name: string;
  name_ja_kanji?: string;
  name_ja_hiragana?: string;
  state: string;
  country: string;
  coord: { lon: number; lat: number };
}

const DATA_DIR = path.join(__dirname, 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'city.list.jp.json');
const CHECKPOINT_FILE = path.join(DATA_DIR, '.checkpoint.json');

// ダイアクリティクス除去: Shingū → Shingu
const stripDiacritics = (str: string): string =>
  str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// TODO(human): OpenWeather Geocoding API を使って日本語名（漢字）を取得する関数を実装してください
// エンドポイント: https://api.openweathermap.org/geo/1.0/direct?q={name},JP&limit=5&appid={apiKey}
// レスポンス例: [{ "name": "Shingu", "country": "JP", "local_names": { "ja": "新宮市" } }]
// country === "JP" のものを探し local_names?.ja を返す。見つからなければ null を返す
async function fetchJapaneseName(name: string, apiKey: string): Promise<string | null> {
  // ここに実装
  return null;
}

function buildTokenizer(): Promise<kuromoji.Tokenizer<kuromoji.IpadicFeatures>> {
  return new Promise((resolve, reject) => {
    kuromoji
      .builder({ dicPath: path.join(__dirname, 'node_modules/kuromoji/dict') })
      .build((err, tokenizer) => {
        if (err) reject(err);
        else resolve(tokenizer);
      });
  });
}

// 漢字 → ひらがな（kuromoji で読みを取得 → wanakana でカタカナ→ひらがな変換）
function kanjiToHiragana(
  text: string,
  tokenizer: kuromoji.Tokenizer<kuromoji.IpadicFeatures>
): string {
  const tokens = tokenizer.tokenize(text);
  const katakana = tokens.map(t => t.reading ?? t.surface_form).join('');
  return toHiragana(katakana);
}

async function main() {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) throw new Error('OPENWEATHER_API_KEY が backend/.env に設定されていません');

  const cities: CityEntry[] = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
  const tokenizer = await buildTokenizer();

  // チェックポイントから再開（中断しても続きから処理できる）
  const checkpoint: Record<number, boolean> = fs.existsSync(CHECKPOINT_FILE)
    ? JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8'))
    : {};

  const result: CityEntry[] = [];

  for (let i = 0; i < cities.length; i++) {
    const city = cities[i];

    if (checkpoint[city.id]) {
      result.push(city);
      continue;
    }

    const name = stripDiacritics(city.name);
    const kanji = await fetchJapaneseName(city.name, apiKey);
    const hiragana = kanji ? kanjiToHiragana(kanji, tokenizer) : undefined;

    result.push({
      ...city,
      name,
      ...(kanji && { name_ja_kanji: kanji }),
      ...(hiragana && { name_ja_hiragana: hiragana }),
    });

    checkpoint[city.id] = true;

    // 50件ごとに保存（途中で止まっても進捗が消えない）
    if (i % 50 === 0) {
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
      fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint));
      console.log(`進捗: ${i + 1} / ${cities.length}`);
    }

    await sleep(1100); // OpenWeather 無料枠: 1リクエスト/秒
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  if (fs.existsSync(CHECKPOINT_FILE)) fs.unlinkSync(CHECKPOINT_FILE);
  console.log('完了！');
}

main().catch(console.error);
