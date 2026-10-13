# テスト

| コマンド | 内容 | 時間 |
|---------|------|------|
| `npm run check` | lint ＋ 型チェック ＋ 単体テスト ＋ 本番ビルド（**push 前に必ず**） | 約1分 |
| `npm test` | 単体テスト（Vitest）：エンジン・制限値・ニックネーム・API ルート | 数秒 |
| `npm run test:autoplay` | 全5学科を自動プレイでクリアできるか（各2シード・詰みの検出） | 約2〜3分 |
| `npm run test:e2e` | E2E（Playwright）：画面の流れ・スマホ操作・PWA。本番ビルドを起動して試す | 約1分 |
| `npm run test:e2e:full` | ↑＋実時間の通しプレイ（全学科）・描画性能・メモリ | 約5分 |
| `npm run autoplay:report -- 5 1,2,3,4,5` | 学科ごとに5回自動プレイしてクリアタイムを表示（バランス調整用） | 学科あたり約1分/回 |
| `supabase/tests/rpc_test.sql` | DB関数のテスト。開発DBの SQL エディタで実行（最後に ROLLBACK） | 数秒 |

初回だけ `npm install` が必要。Playwright のブラウザは `npx playwright install chromium` で入れる（クラウド環境では入っている）。

## 単体テスト（`tests/unit/`）

- `engine.test.ts`：同じシードなら同じ展開／`clone()` が独立／タイマー＝ステップ数×1/60秒／
  **30・60・90・120・144Hz のどれでも1秒あたり約60ステップ**（固定タイムステップ）／60Hz の揺れでカクつかない／処理落ちで暴走しない
- `limits.test.ts`：学科ごとの最短タイムが理論値より小さく近い／**SQL（`min_clear_time_ms()`）と TypeScript の値が一致**
- `api.test.ts`：Supabase をモックして API ルートの入力チェック・DB エラーの変換・キャッシュヘッダーを確認
- `autoplay-dept*.test.ts`：ボットで最後まで走り切れる（詰まない）／タイムがサーバーの下限に引っかからない

## 自動プレイ（ボット）

`lib/game/autopilot.ts`。毎フレーム、エンジンを `clone()` して「何フレーム後にジャンプするか」の候補（スイムは目標の高さ）を
約1.4秒先まで先読みし、いちばん進める候補の“今の操作”だけを実行する。

- 実プレイヤーより上手いとは限らない（バランスの目安・詰みの検出用）
- ステージやスポーンを変えたら `npm run test:autoplay` で詰まないことを確認する
- 2026-10-13 時点の自動プレイのクリアタイム（ミス0〜2回）：機械 約105.5秒／電気電子 約104.8秒／電子情報 約89秒／生物応化 約149秒／材料 約102秒

## E2E（`tests/e2e/`）

`playwright.config.ts` が `NEXT_PUBLIC_E2E=1` で `next build` → `next start`（ポート3100）してから実行する。
API（`/api/*`）は `page.route` でモックするので DB には繋がない。DB を含めた確認は `rpc_test.sql` と、プレビュー環境での手動プレイで行う。

- `flow.spec.ts`：ニックネーム → 学科選択 → プレイ → クリア → 登録 → 順位・シェア／もう一度／一時停止メニュー／タブ切替で自動停止／
  NGワード・通信失敗時の表示／ランキング／PWA（マニフェスト・アイコン・Service Worker）／OGP画像
- `mobile.spec.ts`：タップでジャンプ・二段ジャンプ／生物応化の長押し／縦向きで停止／横にはみ出さない
- `fullplay.spec.ts`：全学科を自動操縦で実時間で最後まで（コンソールエラーが出ないこと）
- `perf.spec.ts`：CPU を4倍遅くしても描画が1フレームに収まる／リトライ20回でメモリが増えない／重い端末で光彩を自動で切る

`NEXT_PUBLIC_E2E=1` のビルドだけ `window.__kosendash` が使える（本番ビルドには入らない）：

```js
window.__kosendash.engine.snapshot          // 進捗・タイム・ミス数など
await window.__kosendash.autopilot()        // 以降、自動操縦で走る
```

## 計測結果（2026-10-13）

| 項目 | 結果 |
|------|------|
| 描画（CPU 4倍遅い・終盤） | 全学科 58.7〜60fps、1フレームの描画 平均0.7〜1.9ms |
| 描画（CPU 6倍遅い） | 49.7〜60fps（生物応化・材料が約50fps）。ゲームの速さとタイムは固定タイムステップで正しいまま |
| リトライ20回 | ヒープ 4.0MB → 4.2MB（増え続けない） |
| DB関数（2万プレイ・2,000人のデータで） | `start_run` 0.35ms／`submit_clear` 7.1ms／`get_leaderboard` 6.0ms（1回あたり） |

> ヘッドレス Chrome の計測なので、GPU で描く部分（光彩など）の重さは含まない。実機での確認は [doc/operations.md](operations.md) のチェックリストで行う。
