import { Router } from 'express';
import axios from "axios";
import { performance } from 'perf_hooks';
import { ForecastResponse } from '../types/openWeather';
import {LRUCache} from '../utils/lru-cache';
const router = Router();

const cache = new LRUCache<ForecastResponse>(3);
// GET /forecast/:cityId → 天気予報を返す（LRU キャッシュ付き）
router.get('/:cityId', async (req, res) => {
    const cityId = req.params.cityId;
    const start = performance.now();

    const searchCache = cache.get(cityId);
    if (searchCache){
        const elapsed = (performance.now() - start).toFixed(3);
        console.log(`[CACHE HIT]  cityId=${cityId} | ${elapsed}ms`);
        res.json(searchCache);
    }else{
        try{
            const openWeatherAPI: string| undefined = process.env.OPENWEATHER_API_KEY;
            const openWeatherURL = `http://api.openweathermap.org/data/2.5/forecast?id=${cityId}&appid=${openWeatherAPI}&lang=ja&units=metric`;
            const result = await axios.get(openWeatherURL);
            cache.put(cityId, result.data);
            const elapsed = (performance.now() - start).toFixed(3);
            console.log(`[CACHE MISS] cityId=${cityId} | ${elapsed}ms`);
            res.json(result.data);
        }catch(err){
            res.status(500).json({error: "失敗"})
        }
    }
});

export default router;