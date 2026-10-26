import Image from 'next/image'

interface Props {
  /** true のときは画面下に重ねず、ふつうの要素として並べる（固定ボタンがある画面向け） */
  inFlow?: boolean
}

// 協賛表記。ゲーム以外の画面の下に小さく出す（親の main に relative と下の余白が必要）
export default function SponsorCredit({ inFlow = false }: Props) {
  return (
    <p
      className={`${inFlow ? '' : 'absolute bottom-3 inset-x-0 '}flex items-center justify-center gap-2 text-xs text-gray-500 pointer-events-none select-none`}
    >
      <span>supported by</span>
      {/* 暗い背景用に白抜きにしたロゴ。小さい画像なので最適化は通さない（SW のキャッシュにも乗る） */}
      <Image
        src="/sponsor/bengo4.png"
        alt="弁護士ドットコム"
        width={600}
        height={83}
        unoptimized
        className="h-4 w-auto opacity-70"
      />
    </p>
  )
}
