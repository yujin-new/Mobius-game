'use client'

export default function RulesModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <div className="font-semibold">📜 게임 규칙 (요약)</div>
          <button className="text-zinc-500 hover:text-zinc-700" onClick={onClose}>닫기</button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5 space-y-5 text-sm text-zinc-700">
          <section>
            <div className="font-medium mb-1">🎯 게임 개요</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>장르: 추리·심리전 멀티플레이</li>
              <li>인원: 11명 (탐정, 범인 다수)</li>
              <li>승리: 탐정팀은 범인 전원 검거, 범인팀은 인원 우위 또는 생존</li>
            </ul>
          </section>

          <section>
            <div className="font-medium mb-1">🧩 게임 모드</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>카발: 범인끼리 서로를 알고 시작</li>
              <li>블라인드 공모: 범인도 서로를 모름 (모두를 의심하세요)</li>
            </ul>
          </section>

          <section>
            <div className="font-medium mb-1">🔁 라운드 진행</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>단서 찾기 1분 — 장소별 동시 열람 최대 2명</li>
              <li>토론 15분 — 단서 공유(블러핑 가능) / 비밀, 범인 토론</li>
              <li>
                비밀투표 60초 — 참가자들의 비밀을 알아내세요
                <div className="text-xs text-zinc-500">
                  (과반수 투표 정답시 노출된 참가자는 토큰 패널티를 가집니다)
                </div>
              </li>
              <li>범인투표 30초 — 과반 아웃, 동률이면 3분 재토론 후 10초 재투표</li>
              <li>결과 정리 — 정체/비밀 공개 후 다음 라운드</li>
            </ul>
          </section>

          <section>
            <div className="font-medium mb-1">🪙 토큰</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>시작 10개</li>
              <li>사용: 추가 단서 열람 - 1</li>
              <li>보상: 범인 검거 +1, 비밀 맞추기 +1</li>
              <li>패널티: 내 비밀 노출 -5 (0이면 투표만 가능)</li>
            </ul>
          </section>

          <section>
            <div className="font-medium mb-1">💬 채팅</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>공용 채팅은 각 라운드 시간에만 입력 가능</li>
              <li>귓속말은 라운드당 1회</li>
            </ul>
          </section>

          <div className="rounded-xl bg-zinc-50 p-4 text-[13px]">
            <div className="font-medium mb-1">👉 요약</div>
            <div>단서 모으기 → 토론하기 → 비밀 맞추기 → 범인 지목하기</div>
            <div className="text-zinc-600">
              토큰 관리는 생존과 추리의 핵심입니다. 범인은 혼란을, 탐정은 연결고리를!
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}