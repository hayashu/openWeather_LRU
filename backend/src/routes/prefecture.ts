import { Router } from 'express';
import { REGIONS } from '../data/regions';

const router = Router();

// 地方名の配列（番号 = インデックス+1）
const regionNames = Object.keys(REGIONS);

// GET /prefectures → 番号付き地方一覧
router.get('/', (_req, res) => {
  const regions = regionNames.map((name, i) => ({ id: i + 1, name }));
  res.json({ regions });
});

// GET /prefectures/:id → 指定地方の県一覧
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id < 1 || id > regionNames.length) {
    res.status(404).json({ error: '地方が見つかりません' });
    return;
  }
  const region = regionNames[id - 1];
  res.json({ id, region, prefectures: REGIONS[region] });
});

export default router;