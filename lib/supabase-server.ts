import { createClient } from '@supabase/supabase-js'

// サーバー専用クライアント。service_role キーで接続し RLS をバイパスする。
// （stage_clears テーブルには INSERT 用の RLS ポリシーが無いため、anon キーでは書き込みできない）
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase server env vars: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY',
    )
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
