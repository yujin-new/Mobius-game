export default function RulesPage() {
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">📜 게임 규칙 (요약)</h1>

      <section className="space-y-5 text-sm text-zinc-700">
        <div>
          <div className="font-medium mb-1">🎯 게임 개요</div>
          <ul className="list-disc pl-5 space-y-1">
            <li>장르: 추리·심리전 멀티플레이</li>
            <li>인원: 11명 (탐정 8, 범인 3)</li>
            <li>승리: 탐정팀은 범인 전원 검거, 범인팀은 인원 우위 또는 생존</li>
          </ul>
        </div>

        <div>
          <div className="font-medium mb-1">🧩 게임 모드</div>
          <ul className="list-disc pl-5 space-y-1">
            <li>카발: 범인끼리 서로를 알고 시작</li>
            <li>블라인드 공모: 범인도 서로를 모름 (모두를 의심!)</li>
          </ul>
        </div>

        <div>
          <div className="font-medium mb-1">🔁 라운드 진행</div>
          <ul className="list-disc pl-5 space-y-1">
            <li>단서 찾기 1분 — 장소별 동시 열람 최대 2명, 기본 1개 + 토큰 사용 시 추가 1개</li>
            <li>토론 15분 — 단서 공유/블러핑</li>
            <li>비밀투표 60초 — 진짜 1개 + 미끼들, 정답 +1 / 내 비밀 노출 -5</li>
            <li>범인투표 30초 — 과반 아웃, 동률이면 3분 재토론 후 10초 재투표</li>
            <li>결과 정리 — 정체/비밀 공개 후 다음 라운드</li>
          </ul>
        </div>

        <div>
          <div className="font-medium mb-1">🪙 토큰</div>
          <ul className="list-disc pl-5 space-y-1">
            <li>시작 10개</li>
            <li>사용: 추가 단서 열람(1)</li>
            <li>보상: 범인 검거/비밀 맞추기 +1</li>
            <li>패널티: 내 비밀 노출 -5 (0이면 투표만 가능)</li>
          </ul>
        </div>

        <div>
          <div className="font-medium mb-1">💬 채팅</div>
          <ul className="list-disc pl-5 space-y-1">
            <li>공용 채팅은 각 라운드 시간에만 입력 가능</li>
            <li>귓속말은 라운드당 1회 (사용 사실만 공개, 내용은 비밀)</li>
          </ul>
        </div>

        <div className="rounded-xl bg-zinc-50 p-4 text-[13px]">
          <div className="font-medium mb-1">👉 요약</div>
          <div>단서 모으기 → 토론하기 → 비밀 맞추기 → 범인 지목하기</div>
          <div className="text-zinc-600">
            토큰 관리는 생존과 추리의 핵심입니다. 범인은 혼란을, 탐정은 연결고리를!
          </div>
        </div>
      </section>
    </main>
  )
}
