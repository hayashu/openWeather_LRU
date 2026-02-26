import { Router } from 'express';
import axios from "axios";
import { ForecastResponse } from '../types/openWeather';
import {LRUCache} from '../utils/lru-cache';
const router = Router();

const cache = new LRUCache<ForecastResponse>(3);
// GET /forecast/:cityId → 天気予報を返す（LRU キャッシュ付き）
router.get('/:cityId', async (req, res) => {
    const cityId = req.params.cityId;
    console.log(cityId);
    const searchCache = cache.get(cityId);
    console.log(searchCache);
    if (searchCache){
        console.log('chacheがヒット');
        res.json(searchCache);
    }else{
        try{
            console.log('apiで検索')
            const openWeatherAPI: string| undefined = process.env.OPENWEATHER_API_KEY; // ① string | undefined → string に
            const openWeatherURL = `http://api.openweathermap.org/data/2.5/forecast?id=${cityId}&appid=${openWeatherAPI}&lang=ja&units=metric`; // ② クォート除去
            const result = await axios.get(openWeatherURL); // ③ openWeatherAPI → openWeatherURL
            cache.put(cityId,result.data);
            res.json(result.data); // ④ result を使って返す
        }catch(err){
            // console.log(err);
            res.status(500).json({error: "失敗"})
        }
    }
    // return result;
});

export default router;