'use client'
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

const TAGLINES = [
  "진실은 한 줄의 실수에서 시작된다.",
  "모두가 말하지만, 아무도 듣지 않는다.",
  "의심은 감염된다. 오늘은 누구 차례인가.",
  "조용한 발자국이 가장 멀리 간다.",
  "토큰이 떨어지면, 말도 떨어진다.",
  "거짓은 빠르고, 증거는 느리다.",
]

export default function Home() {
  const router = useRouter()
  const [nickname, setNickname] = useState("")
  const [room, setRoom]         = useState("")
  const lines = useMemo(() => [...TAGLINES].sort(()=>Math.random()-0.5).slice(0, Math.random()>0.5?4:3), [])
  const canEnter = nickname.trim().length>=1 && room.trim().length>=4
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10 grid md:grid-cols-2 gap-10 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-800/40 px-3 py-1 text-xs text-slate-300">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> beta
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Möbius-Game</h1>
          <p className="text-slate-300/90">차갑고 조용한 심리 추리. <span className="text-slate-100">증거</span>와 <span className="text-slate-100">거짓</span>이 교차하는 10라운드.</p>
          <ul className="mt-6 grid gap-2 text-slate-300/80">
            {lines.map((t,i)=>(
              <li key={i} className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400/80"/><span>{t}</span></li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-xl p-6 md:p-8 shadow-[0_0_60px_-20px_rgba(43,135,255,0.35)]">
          <div className="text-xl font-semibold mb-4">방 입장</div>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-300">참가자</label>
              <input className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-slate-100 outline-none focus:ring-2 focus:ring-sky-500/40"
                     placeholder="예: 유진" value={nickname} onChange={e=>setNickname(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-slate-300">방코드 (호스트가 정함)</label>
              <input className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-slate-100 outline-none focus:ring-2 focus:ring-sky-500/40 uppercase"
                     placeholder="예: A1B2" value={room} onChange={e=>setRoom(e.target.value.toUpperCase())} maxLength={6}/>
              <p className="mt-2 text-[12px] text-slate-400">호스트가 만든 코드를 입력하면 입장할 수 있습니다.</p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button onClick={()=>router.push('/rules')} className="flex-1 py-3 rounded-xl border border-slate-700 hover:bg-slate-800/40">📜 게임규칙</button>
              <button onClick={()=>router.push(`/lobby/${room}?nick=${encodeURIComponent(nickname)}`)} disabled={!canEnter}
                      className="flex-1 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-semibold disabled:opacity-40 disabled:cursor-not-allowed">입장</button>
            </div>
            <div className="pt-4 text-xs text-slate-400">호스트는 원하는 코드를 정해 먼저 입장한 후, 참가자에게 코드를 공유하세요.</div>
          </div>
        </div>
      </div>
    </main>
  )
}