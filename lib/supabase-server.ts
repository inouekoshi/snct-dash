import { createClient } from '@supabase/supabase-js'

// サーバー専用クライアント（APIルートで使用）。
// anon キーで接続し、stage_clears の RLS ポリシー（SELECT / INSERT を public に許可）に従う。
// service_role キーは使わない方針（環境変数の取り違えで本番が止まった経緯があるため）。
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase server env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY',
    )
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
