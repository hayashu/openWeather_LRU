import * as fs from 'fs';
import * as path from 'path';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

interface CityEntry {
  id: number;
  name: string;
  state: string;
  country: string;
  coord: { lon: number; lat: number };
}

type GroupedCities = { [prefecture: string]: CityEntry[] };

const dataDir = path.join(__dirname, 'data');
const cities: CityEntry[] = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'city.list.jp.json'), 'utf-8')
);
const geojson: FeatureCollection<Polygon | MultiPolygon> = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'japan.geojson'), 'utf-8')
);


// TODO(human): ここに処理を実装してください
// 1. grouped を空オブジェクトで初期化
const grouped: GroupedCities = {};
grouped["不明"] = [];
// const grouped: {[prev: string]: CityEntry[]} = {};
for (const city of cities){
  let flag = false;
  const {lon, lat} = city.coord;
  // 2. cities をループし、各都市の coord.lon/lat で turf の point を作成
  const pt = point([lon, lat]);
  for (const feature of geojson.features){
    // 3. geojson.features をループし、booleanPointInPolygon で判定
    if (booleanPointInPolygon(pt, feature.geometry)){
      console.log(city.name + "is in " + feature!.properties!.nam_ja);
      // 4. 一致した feature の properties.nam_ja を県名として grouped に追加
      const prefName = feature!.properties!.nam_ja;
      grouped[prefName] = grouped[prefName] ?? [];
      grouped[prefName].push(city);
      flag = true;
      break
    }
  }
  if (!flag){
    grouped["不明"].push(city)
  }
}

// 6. fs.writeFileSync で data/city.list.jp.grouped.json に出力
fs.writeFileSync(
  path.join(dataDir, "city.list.jp.grouped.json"),
  JSON.stringify(grouped, null, 2),
  'utf-8'
);