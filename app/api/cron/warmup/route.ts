import { NextRequest } from 'next/server'

// このルートは毎回実行する（キャッシュさせない）
export const dynamic = 'force-dynamic'

// Supabase Free プランは7日間低アクティビティが続くと一時停止される。
// pause を防ぐため、1日1回（vercel.json の cron）で stage_clears を1行 SELECT し、
// 各DBに軽いアクティビティを発生させる。
//
// Vercel Cron は本番デプロイでのみ実行され、その環境変数は本番DBしか指さない。
// 開発DB(kosendash-dev)は Preview 環境のため cron が届かない。よって本番 cron から
// 両DBを明示的に叩く。
//
// ここで使うのは公開用の publishable key（RLS で SELECT のみ許可）。クライアントに
// 露出する anon/publishable キーと同種の公開情報なので、ソースに含めて問題ない。
const WARMUP_TARGETS = [
  {
    name: 'production',
    url: 'https://ewspcarevipbrakestod.supabase.co',
    key: 'sb_publishable_y-z4g3YHmf3bJPhiU-nq6w_NNJSKpn6',
  },
  {
    name: 'development',
    url: 'https://qfrtwmujtbaegehjwuku.supabase.co',
    key: 'sb_publishable_ROlBejGSDm1rGEhCEQNquQ_5VPk1mrm',
  },
]

export async function GET(request: NextRequest) {
  // Vercel Cron は Authorization: Bearer <CRON_SECRET> を付けて呼び出す。
  // CRON_SECRET が設定されている場合のみ検証する（未設定でも実害のない読み取りのみ）。
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const results = await Promise.all(
    WARMUP_TARGETS.map(async (t) => {
      try {
        const res = await fetch(`${t.url}/rest/v1/stage_clears?select=id&limit=1`, {
          headers: { apikey: t.key, Authorization: `Bearer ${t.key}` },
          cache: 'no-store',
        })
        return { name: t.name, ok: res.ok, status: res.status }
      } catch (e) {
        return { name: t.name, ok: false, error: e instanceof Error ? e.message : String(e) }
      }
    }),
  )

  return Response.json({ warmedAt: new Date().toISOString(), results })
}
