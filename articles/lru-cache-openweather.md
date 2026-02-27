---
title: "LRUキャッシュでAPIの無駄な呼び出しを減らす"
emoji: "🌤"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["typescript", "nodejs", "express", "openweathermap", "cache"]
published: false
---

# はじめに
天気APIでサービスを作ると、東京のような人気都市には繰り返しアクセスが集中します。一方で天気データは時間とともに変わるため、キャッシュに古い天気情報が残り続けてしまう問題もあります。そこで、**直近にアクセスされたデータを優先的に保持し、古いデータから順に削除する** LRU（Least Recently Used）キャッシュが解決策になると知り、実装してみました。

## 結果
導入した結果、キャッシュにデータが残ってる状態で再度検索をしようとすると、APIリクエストを送信する必要がないだけでなく、レスポンス速度が大幅に向上しました。

# LRUキャッシュとは
LRU（Least Recently Used）キャッシュとは、**最も長い間使われていないデータを削除**するキャッシュ戦略です。
容量が上限に達したとき、「最近アクセスされていないデータほど今後も使われにくい」という仮定のもと、古いデータから順に削除します。

## データ構造
LRUキャッシュは **双方向リスト** と **Map** を組み合わせて実装します。

- **双方向リスト**: アクセス順を管理。先頭が「最近使った」、末尾が「最も古い」
- **Map**: キーからノードへの O(1) アクセスを実現

この2つを組み合わせることで、`get`・`put` をともに **O(1)** で実現できます。

### 動作イメージ（容量3の場合）

```
// A, B, C を順にキャッシュ
[A] -> [B] -> [C]  ← 末尾Cが最も古い

// Bに再アクセス → Bを先頭に移動
[B] -> [A] -> [C]  ← 末尾Cが最も古い

// 新しいDを追加 → 容量超過のため末尾Cを削除
[D] -> [B] -> [A]
```

詳しく解説している記事があったので、より詳しい内容は以下のリンクから確認してみてください。
（参考: [LRUキャッシュをLeetCodeで学ぶ](https://dev.classmethod.jp/articles/lru-cache-leetcode/)）

# TypescriptでのLRUキャッシュ実装
TypescriptでLRUキャッシュを以下のように作りました。
```typescript
interface Node<T>{
    key: string;
    value: T;
    prev: Node<T> | null;
    next: Node<T> | null;
}

export class LRUCache<T>{
    capacity: number;
    head : Node<T>;
    tail : Node<T>;
    map : Map<string, Node<T>>;
    constructor(capacity: number){
        this.capacity = capacity;
        this.map = new Map();
        this.head = {
            key: "head",
            value: undefined as unknown as T,
            prev: null,
            next: null
        }
        this.tail = {
            key: "tail",
            value: undefined as unknown as T,
            prev: null,
            next: null
        }
        this.head.next = this.tail;
        this.tail.prev = this.head;
    }
    
    // 値がキャッシュにあれば、それを先頭に配置する
    get(key: string): T | undefined{
        const getNode = this.map.get(key);
        if (!getNode) return undefined
        this.remove(getNode);
        this.addToHead(getNode);
        return getNode.value;
    }
    private remove(node: Node<T>): void {
        node.prev!.next = node.next;
        node.next!.prev = node.prev;
    }

    private addToHead(node: Node<T>): void {
        node.next = this.head.next;
        this.head.next!.prev = node
        node.prev = this.head;
        this.head.next = node;
        
    }
    // 値がすでにあれば、値を更新し、先頭に持ってくる
    // 値がなければ、キャパシティの限界を見て、先頭に追加
    put(key: string, value: T): void {
        const node = this.map.get(key);
        if (!node){
            const newNode = {
                key: key,
                value: value,
                prev: null,
                next: null
            }
            this.map.set(key, newNode);
            this.addToHead(newNode);
            if (this.capacity < this.map.size){
                console.log('cacheが飽和したので削除します')
                const lastNode = this.tail.prev!;
                this.remove(lastNode);
                this.map.delete(lastNode.key);
            }
        }else{
            node.value = value;
            this.remove(node);
            this.addToHead(node);
        }
    }
}
```
# OpenWeather APIでの実装
GitHubにプロジェクトを公開しているので、詳細が気になる方はそちらをご覧ください。
https://github.com/hayashu/openWeather_LRU


## 概要
CLIで検索したい日本の都市を選択 → 都市idを元にキャッシュを検索
ヒットした場合、それを返す
ヒットしない場合、OpenWeather APIから情報を取得する
### 概要図
![概要図](/images/sequence_diagram.png)

## 実装
先程作成したLRUCacheクラスを使い、簡単にキャッシュを使用し、作成できました。私が作成したアプリでは以下のように使用しています。

```typescript
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
```

## 実行結果
作成したアプリを動作させ、LRUキャッシュの動作確認と実行速度を確認します。
以下の図は東京都有楽町を2回、CLIから検索した結果です。
CACHE MISSはキャッシュにデータがなくAPIリクエストから情報を取得し、CACHE HIT時はキャッシュにデータがあり、キャッシュからデータを取得しています。
時間を比較すると352.091msから0.097msと3000分の1以上の時間短縮が行えていることが確認できます。
![実行結果](/images/terminal_image.png)
### 実行環境
- ハードウェア環境
    - macOS 26.3 / MacBook Air M4（メモリ 24GB）
- プログラム環境
    - Node.js 24.13.0
    - express 4.18.2
    - axios 1.13.5
    - typescript 5.3.3

## 結論
LRUキャッシュを使うことで、APIリクエスト数を減らしかつ人気のある検索結果に対して高速でレスポンスを返せるようになりました。みなさんもよろしければAPI接続時に使用してみてください。

## 今後の計画

- **TTL（有効期限）の追加**
はじめにで触れた「古いデータが残り続ける問題」への対応です。キャッシュに保存した時刻を記録し、一定時間が経過したデータは自動的に削除することで、天気データの鮮度を保てるようにします。

- **Redis への移行**
現在の実装はメモリ上にキャッシュを保持するため、サーバーを再起動するとキャッシュが消えてしまいます。Redis を使うことでキャッシュを永続化し、複数サーバーへのスケールアウトにも対応できるようにします。

- **天気データの表示改善**
現在は OpenWeather API から取得した生の JSON をそのまま返しています。5日間の予報を日付・時間帯ごとに整形して表示するなど、実用的な形に加工する予定です。