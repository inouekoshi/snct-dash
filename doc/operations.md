# 運用ガイド（本番リリース・高専祭当日）

高専祭（2026-11-03）当日に、開発メンバー・運営スタッフが見るためのドキュメント。

- [本番リリース手順（dev → main）](#本番リリース手順dev--main)
- [実機チェックリスト](#実機チェックリスト)
- [当日の監視](#当日の監視)
- [トラブル対応](#トラブル対応)
- [不適切なニックネーム・不正な記録への対応](#不適切なニックネーム不正な記録への対応)
- [運営スタッフ向け：遊び方の案内と連絡フロー](#運営スタッフ向け遊び方の案内と連絡フロー)
- [負荷の見積もり](#負荷の見積もり)
- [Vercel Hobby プランで公開してよいか](#vercel-hobby-プランで公開してよいか)
- [Vercel の不要な環境変数を消す](#vercel-の不要な環境変数を消す)
- [学科をメンテナンス中にする](#学科をメンテナンス中にする)

---

## 本番リリース手順（dev → main）

本番DBには「新しいコードとも旧コードとも互換」なマイグレーション（`..._100`, `..._300`）を適用済み。
**直接 INSERT の禁止（`..._200_lockdown`）だけは、main に新コードが出てから適用する**（先に当てると旧コードの登録が失敗する）。

1. dev のプレビュー（`https://kosendash-git-dev-koshiinoues-projects.vercel.app`）で全5学科をプレイし、クリア登録・順位・ランキング・シェアを確認する
2. `lib/game/constants.ts` の `STAGE_LENGTH` が **70000** であることを確認する
3. dev → main をマージ（GitHub で PR を作ってマージ）。Vercel が本番を自動デプロイする
4. **デプロイが終わったら、本番DB に lockdown を適用する**（Supabase ダッシュボード → 本番 `kosendash` → SQL Editor）：

   ```sql
   alter policy "API can insert stage_clears" on public.stage_clears with check (false);
   alter policy "API can insert stage_clears" on public.stage_clears rename to "No direct insert (use submit_clear)";
   ```

5. 本番で1回クリアして、登録・順位・ランキングが出ることを確認する
6. **ランキングのテストデータ**：2026-10-13 時点の15件は `archive.stage_clears_20261013` に退避したうえで、
   `hidden = true`・ニックネームを `reset-xxxxxxxx` に変更済み（新コードのランキングには出ない）。
   旧コード（main マージ前の本番）は `hidden` を見ないので、マージまでは本番ランキングに `reset-…` が見える。
   行ごと消したいとき・当日の朝にリハーサルの記録を消すときは SQL Editor で：

   ```sql
   -- 退避済みの行（テストデータ）だけを消す
   delete from public.stage_clears where id in (select id from archive.stage_clears_20261013);
   -- リハーサルの記録も含めて全部消す（先に archive へコピーしておくと安心）
   -- create table archive.stage_clears_YYYYMMDD as table public.stage_clears;
   -- truncate public.stage_clears;  truncate public.runs cascade;
   ```

7. 旧 `scores` テーブルは `archive.scores_20261013` に退避済み。不要と判断できたら `drop table archive.scores_20261013;`

---

## 実機チェックリスト

自動テストでは確かめられない「手触り」。iPhone と Android の両方で、横持ちで確認する。

- [ ] 全5学科を1回ずつクリアできる（クリア後に順位が出る）
- [ ] カクつかない（特に材料工学科の終盤・生物応化）。重い端末では光彩が自動で消えて軽くなる
- [ ] タップの反応（ジャンプ・二段ジャンプ・生物応化の長押し）
- [ ] 一時停止メニュー（再開・最初から・学科選択）／アプリを切り替えると止まる／縦にすると止まる
- [ ] 材料工学科：「鍛えてカン！」の叩きアクションの手触り（赤熱塊へのタップタイミング・リング波紋とハンマー演出）、等速でリズムよく叩く手触り、連打時の空振り硬直・ペナルティ、チュートリアル塊での減速停止・タップ待ち演出、結果画面での走行タイムと最大連続ボーナスの内訳表示、結晶粒微細化演出
- [ ] クリアタイム：自動プレイでは機械 約105秒・電気電子 約105秒・電子情報 約89秒・材料 約87秒（コンボボーナス適用後。走行は約105秒）・生物応化 約149秒。**生物応化だけ約2分半と長い**ので、長すぎると感じたら `BIO_SPEED_START/END` を上げる（その場合は `lib/game/limits.ts` と DB の `min_clear_time_ms()` も直す）
- [ ] シェア（X・LINE）でリンクを開くと記録ページとリザルト画像が出る（本番のみ。プレビューは Vercel の認証がかかっていると画像が出ない）
- [ ] ホーム画面に追加して起動できる（PWA）

---

## 当日の監視

| 見るもの | 場所 | 何を見るか |
|---------|------|-----------|
| エラー | Vercel ダッシュボード → kosendash → **Logs**（Runtime Logs） | `start_run error` / `submit_clear error` / `get_leaderboard error` が出ていないか |
| デプロイ | Vercel → Deployments | 本番が Ready か |
| DB の状態 | Supabase → 本番 `kosendash` → Project Status | **ACTIVE** か（Paused なら下の「DBが止まった」） |
| DB のエラー | Supabase → Logs → API / Postgres | 5xx が出ていないか |
| プレイ状況 | Supabase → SQL Editor | 下の SQL |

```sql
-- 学科ごとの開始数・クリア数・クリア率・タイムの中央値・平均ミス
select * from analytics.department_summary;
-- 1時間ごとの開始数・クリア数（日本時間）
select * from analytics.hourly limit 24;
-- 最新の登録10件
select played_at, department, nickname, clear_time_ms, misses, hidden from public.stage_clears order by played_at desc limit 10;
```

---

## トラブル対応

| 症状 | 原因と対応 |
|------|-----------|
| 登録したのにランキングに出ない | ランキングは CDN に数秒キャッシュするので、最大10秒ほど遅れて出る（リザルト画面の順位は即時） |
| ゲームは動くが「登録されませんでした」「ランキングを読み込めませんでした」 | Supabase が止まっている／障害。Supabase の Project Status を確認し、Paused なら **Restore**（数分）。ゲーム自体は遊べるので、来場者には「ランキングは後で復旧します」と案内 |
| 全員「このプレイはすでに登録済み」「プレイ情報が見つかりません」 | 本番DBに `..._100` マイグレーションが当たっていない。`select to_regclass('public.runs');` が null なら `supabase/migrations/20261013000100_*.sql` を SQL Editor で実行 |
| 「クリアタイムが正しくありません」が多発 | ステージの長さや速度を変えたのに最短タイムを直していない。`lib/game/limits.ts` と `min_clear_time_ms()` を確認 |
| 「短時間に何度も始めすぎです」 | 同じ回線（IP）から1分に120回以上、または全員の合計で1分に600回以上スタートした。会場の Wi-Fi で非常に大勢が同時に遊ぶと起きうる。起きたら `start_run()` の `120` / `600` を増やす（`supabase/migrations/20261013000400_review_fixes.sql` の関数定義を書き換えて SQL Editor で実行） |
| ページが開かない | Vercel の障害・デプロイ失敗。Deployments で直前の Ready なデプロイを **Promote to Production**（ロールバック） |
| 古い画面のまま | Service Worker のキャッシュ。ページを再読み込み（2回）すれば最新になる（画面はネット優先で取りに行く設定） |

---

## 不適切なニックネーム・不正な記録への対応

```sql
-- ランキングから隠す（消さない。戻すときは hidden = false）。
-- 一度隠したニックネームは、その人がもう一度クリアしても最初から隠れる
update public.stage_clears set hidden = true where nickname = '〇〇';

-- 禁止語を追加する（以後の登録で弾く。小文字で入れる。部分一致なので短すぎる語は避ける）
insert into public.ng_words (word) values ('〇〇');

-- 怪しい記録を探す：理論最短に近すぎる・ミス数が送られていない など
select played_at, department, nickname, clear_time_ms, misses
from public.stage_clears
where clear_time_ms < public.min_clear_time_ms(department) * 1.05 or misses is null
order by played_at desc;
```

---

## 運営スタッフ向け：遊び方の案内と連絡フロー

### 来場者への案内（そのまま読んでOK）

1. 「スマホでQRコードを読んで、**横向き**にしてください」
2. 「ニックネームを入れて、好きな学科を選んでください。**5学科で遊び方が全部違います**」
3. 「画面をタップでジャンプ、空中でもう一度タップで二段ジャンプ。生物応用化学科だけは**長押しで浮かびます**」
4. 「ぶつかっても後ろに戻されるだけで、ゲームオーバーはありません。ゴールまでのタイムで競います」
5. 「クリアするとランキングに載ります。結果は X や LINE でシェアできます」

よくある質問：

- **縦にしたら止まった** → 横向きにして「▶ 再開」
- **名前を変えたい** → タイトル画面の下「名前を変更する」
- **「このニックネームは使えません」** → 別の名前にしてもう一度
- **ランキングが出ない** → 電波の良い場所で開き直す。直らなければ開発メンバーに連絡

### 連絡フロー

```
来場者・スタッフが不具合に気づく
  ↓ 当日の連絡チャンネル（LINE グループ等）に「いつ・どの画面で・何が起きたか」＋スクショ
開発メンバー（当番）
  ↓ 「当日の監視」の表で原因を切り分け、「トラブル対応」の表で対処
  ↓ 直せないとき：ゲームは遊べる状態のまま、ランキングだけ止めて案内する
```

当番表・連絡先は当日までに決めて、ここに書き足す。

---

## 負荷の見積もり

- ゲームは端末の中だけで動く（Canvas）。サーバーへの通信は「スタート」「クリア登録」「ランキング表示」の3つだけ
- ランキング（`/api/leaderboard`）は CDN に5秒キャッシュするので、何人が見ても DB へは学科ごとに約5秒に1回
- DB関数の処理時間（2万プレイ・2,000人分のデータで計測）：`start_run` 0.35ms／`submit_clear` 7.1ms／`get_leaderboard` 6.0ms
- 1人が約2分で1プレイなので、同時に100人遊んでもスタート＋登録は毎秒2回未満。Supabase Free でも十分余裕がある
- Supabase へは REST（PostgREST）経由で接続するので、「直接接続60」の上限には当たらない
- Vercel Hobby の上限（月100GB 転送・関数100万回）にも遠い（ページは数百KB、1プレイあたり関数2〜3回）

> 計測は DB の中で関数を直接呼んだもの。インターネット越しの HTTP 負荷試験は、作業環境から Supabase / Vercel に接続できず未実施。

---

## Vercel Hobby プランで公開してよいか

Vercel の利用規約では、Hobby プランは**個人の非商用利用**に限られる（[Terms of Service](https://vercel.com/terms)、[Hobby plan](https://vercel.com/docs/plans/hobby)）。
Vercel のフェアユースガイドラインでは、作った人が金銭的な利益を得るもの（有料の受託開発・決済・広告・寄付の受け付けなど）を商用とみなしている。

このゲームは学生が作った無料のゲームで、課金・広告・寄付も、開発への報酬もないので、**非商用の利用と言える可能性が高い**。
ただし「学校の公式行事として学校が運営する」形だと解釈が分かれうるので、次のどれかで決めておく：

1. 学生（作者）個人のプロジェクトとして公開する（現状のまま）→ 広告・寄付・スポンサー表示を入れない
2. 気になる場合は Vercel のサポートに確認する／高専祭の期間だけ Pro（有料・14日間の無料試用あり）にする
3. 学校として運営するなら、学校のアカウントで Pro にする

上限は Hobby で月100GB 転送・関数100万回（[Limits](https://vercel.com/docs/limits)）。高専祭の規模なら届かない（上の「負荷の見積もり」）。

---

## Vercel の不要な環境変数を消す

`SUPABASE_SERVICE_ROLE_KEY` はコードから使っていない（API は anon キーで DB関数を呼ぶ）。2026-10-14 時点で Production・Preview・Development の3環境すべてに残っているので消す（[#12](https://github.com/inouekoshi/snct-dash/issues/12)）。

1. Vercel ダッシュボード → kosendash → **Settings → Environment Variables**
2. `SUPABASE_SERVICE_ROLE_KEY` の「…」→ **Remove**（Production / Preview / Development すべて）
3. 再デプロイは不要（コードが参照していないため）

---

## 学科をメンテナンス中にする

不具合が見つかった学科だけを止めて、ほかの学科は遊べるままにできる。止めた学科は選択画面で「🔧 メンテナンス中」と出て押せなくなり、サーバーもその学科のプレイ開始を断る。ランキングは今までどおり見られる。

1. Vercel → kosendash → Settings → Environment Variables で `NEXT_PUBLIC_MAINTENANCE_DEPARTMENTS` に学科IDを入れる（カンマ区切り。例: `5`、`4,5`）。本番だけ・デモ版（Preview）だけ、のように環境を選べる
2. 再デプロイする（ビルド時に埋め込まれるので、設定しただけでは反映されない）
3. 戻すときは変数を削除するか空にして、もう一度再デプロイする

2026-10-16 の「鍛えてカン！」実装に伴い、デモ版（Preview）のメンテナンス設定を解除し、全5学科を解放済み。本番にも設定していない。
