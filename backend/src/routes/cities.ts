import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import type { CityEntry } from '../types/openWeather';

const router = Router();

const cityData: Record<string, CityEntry[]> = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/city.list.jp.grouped.json'), 'utf-8')
);

// GET /cities/:pref → 県内の都市一覧を番号付きで返す
router.get('/:pref', (req, res) => {
  const { pref } = req.params;
  const cities = cityData[decodeURIComponent(pref)];
  if (!cities) {
    res.status(404).json({ error: '都道府県が見つかりません' });
    return;
  }
  const numbered = cities.map((city, i) => ({ no: i + 1, id: city.id, name: city.name }));
  res.json({ pref, cities: numbered });
});

export default router;