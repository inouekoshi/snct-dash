// メンテナンス中の学科（選択できず、サーバーもプレイ開始を受け付けない）。
// 環境変数 NEXT_PUBLIC_MAINTENANCE_DEPARTMENTS に学科ID をカンマ区切りで書く（例: "4" / "4,5"）。
// Vercel では環境ごとに設定できるので、デモ版（Preview）だけ止めることもできる。
// NEXT_PUBLIC_* はビルド時に埋め込まれるため、変えたら再デプロイが必要。

export function parseMaintenanceDepartments(value: string | undefined): Set<number> {
  const ids = (value ?? '')
    .split(',')
    .map(s => Number(s.trim()))
    .filter(n => Number.isInteger(n) && n >= 1 && n <= 5)
  return new Set(ids)
}

export function isUnderMaintenance(department: number): boolean {
  return parseMaintenanceDepartments(process.env.NEXT_PUBLIC_MAINTENANCE_DEPARTMENTS).has(department)
}
