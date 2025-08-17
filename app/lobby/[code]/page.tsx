"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import RulesModal from "../../components/RulesModal"
import { supabase } from "../../../lib/supabase"

type Player = { name: string; ready: boolean; isHost: boolean }
type RoomData = { players: Player[]; gameNo: 1 | 2 | 3 | 4 }

function CaseModal({ open, onClose, gameNo }:{ open:boolean; onClose:()=>void; gameNo:1|2|3|4 }) {
  if (!open) return null
  const titles: Record<1|2|3|4,string> = {
    1:"게임 1 — 유리박스 타워 (오피스)",
    2:"게임 2 — 지하, 잔향 (지하철역)",
    3:"게임 3 — 백색소음 (병원동)",
    4:"게임 4 — 쇼핑몰, 네온의 그림자",
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <div className="font-semibold">📖 사건 이야기</div>
          <button className="text-zinc-500 hover:text-zinc-700" onClick={onClose}>닫기</button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5 text-sm text-zinc-700 space-y-3">
          <div className="text-zinc-500 text-xs">현재 선택: {titles[gameNo]}</div>
          <p className="whitespace-pre-wrap">
            🔹 [파트1 — 스토리]{"\n"}
            여기에 각 게임의 스토리 본문을 넣습니다. (자리표시자)
          </p>
        </div>
      </div>
    </div>
  )
}

function MyStoryModal({ open, onClose, nick }:{ open:boolean; onClose:()=>void; nick:string }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <div className="font-semibold">🪪 나의 이야기</div>
          <button className="text-zinc-500 hover:text-zinc-700" onClick={onClose}>닫기</button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5 text-sm text-zinc-700 space-y-3">
          <p className="whitespace-pre-wrap">
            🔹 [파트2 — Characters]{"\n"}
            <strong>{nick}</strong> 님의 비밀 카드입니다. (본인만 열람){"\n"}
            지금은 더미 텍스트입니다.
          </p>
        </div>
      </div>
    </div>
  )
}

function loadRoom(code:string): RoomData {
  if (typeof window==="undefined") return { players:[], gameNo:1 }
  try {
    const raw = localStorage.getItem("room:"+code)
    if (!raw) return { players:[], gameNo:1 }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return { players: parsed as Player[], gameNo:1 }
    return parsed as RoomData
  } catch { return { players:[], gameNo:1 } }
}
function saveRoom(code:string, data:RoomData) {
  localStorage.setItem("room:"+code, JSON.stringify(data))
  window.dispatchEvent(new StorageEvent("storage", { key:"room:"+code, newValue: JSON.stringify(data) }))
}

export default function LobbyPage() {
  const params = useParams<{ code:string }>()
  const code = String(params.code).toUpperCase()
  const sp = useSearchParams()
  const router = useRouter()
  const me = sp.get("nick") ?? "GUEST"

  const [players, setPlayers] = useState<Player[]>([])
  const [isHost, setIsHost]   = useState(false)
  const [gameNo, setGameNo]   = useState<1|2|3|4>(1)

  const [openRules, setOpenRules] = useState(false)
  const [openCase,  setOpenCase]  = useState(false)
  const [openMy,    setOpenMy]    = useState(false)

  // === Presence (접속자) ===
  const [online, setOnline] = useState<string[]>([])
  useEffect(() => {
    const channel = supabase.channel(`room-${code}`, { config: { presence: { key: me } } })
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState()
      const nicks = Object.values(state).flat().map((m:any)=>m.presence_key)
      setOnline([...new Set(nicks)])
    })
    channel.subscribe(async status => {
      if (status === "SUBSCRIBED") await channel.track({ presence_key: me, at: Date.now() })
    })
    return () => { channel.untrack(); channel.unsubscribe() }
  }, [code, me])

  // === 참가자 리스트/호스트 ===
  useEffect(() => {
    const data = loadRoom(code)
    let list = [...data.players]
    if (!list.find(p=>p.name===me)) {
      const hostExists = list.some(p=>p.isHost)
      list.push({ name: me, ready:false, isHost: !hostExists })
    }
    const next: RoomData = { players: list, gameNo: data.gameNo ?? 1 }
    saveRoom(code, next)
    setPlayers(next.players)
    setIsHost(next.players.find(p=>p.name===me)?.isHost ?? false)
    setGameNo(next.gameNo)

    const onSync = (e:StorageEvent) => { if (e.key==="room:"+code) {
      const d = loadRoom(code); setPlayers(d.players); setGameNo(d.gameNo)
    }}
    window.addEventListener("storage", onSync)
    return () => window.removeEventListener("storage", onSync)
  }, [code, me])

  const allReady = useMemo(() => players.length>0 && players.every(p=>p.isHost || p.ready), [players])
  const toggleReady = () => {
    const d = loadRoom(code)
    const list = d.players.map(p => p.name===me ? { ...p, ready: !p.ready } : p)
    saveRoom(code, { ...d, players: list }); setPlayers(list)
  }
  const kick = (target:string) => {
    if (!isHost || target===me) return
    if (!confirm(`${target} 님을 강퇴할까요?`)) return
    const d = loadRoom(code)
    const list = d.players.filter(p => p.name!==target)
    const hasHost = list.some(p=>p.isHost)
    const fixed = hasHost ? list : list.map((p,i)=> i===0 ? { ...p, isHost:true } : p)
    saveRoom(code, { ...d, players: fixed }); setPlayers(fixed)
  }
  const selectGame = (no:1|2|3|4) => {
    if (!isHost) return
    const d = loadRoom(code); saveRoom(code, { ...d, gameNo: no }); setGameNo(no)
  }
  const startGame = () => {
    if (!isHost) return
    if (!allReady && !confirm("모든 참가자가 준비되지 않았습니다. 그래도 시작할까요?")) return
    router.push(`/room/${code}?nick=${encodeURIComponent(me)}`)
  }
  const gameTitle = gameNo===1?'게임 1':gameNo===2?'게임 2':gameNo===3?'게임 3':'게임 4'

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div className="text-lg font-bold">Lobby {code}</div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setOpenCase(true)} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-zinc-50">📖 사건 이야기</button>
          <button onClick={()=>setOpenMy(true)} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-zinc-50">🪪 나의 이야기</button>
          <button onClick={()=>setOpenRules(true)} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-zinc-50">📜 게임규칙</button>
          <div className="text-sm text-zinc-600">{me} {isHost && "(host)"} · 접속 {online.length}</div>
        </div>
      </header>

      {/* 접속자 표시 */}
      <div className="rounded-2xl border bg-white p-3 text-sm text-zinc-600">
        접속 {online.length}명: {online.join(", ") || "—"}
      </div>

      <section className="grid md:grid-cols-3 gap-6">
        <div className="rounded-2xl border bg-white p-4">
          <div className="font-semibold mb-3">참가자</div>
          <ul className="space-y-2">
            {players.map(p=>(
              <li key={p.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={"inline-flex h-2 w-2 rounded-full " + (online.includes(p.name) ? "bg-green-500" : "bg-zinc-300")} />
                  <span>{p.name}</span>
                  {p.isHost && <span className="text-xs text-zinc-500">(host)</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={'text-sm ' + (p.ready ? 'text-green-600' : 'text-zinc-400')}>
                    {p.ready ? '준비' : '대기'}
                  </span>
                  {isHost && p.name!==me && (
                    <button onClick={()=>kick(p.name)} className="text-xs px-2 py-1 rounded border hover:bg-zinc-50" title="강퇴">강퇴</button>
                  )}
                </div>
              </li>
            ))}
            {players.length===0 && <li className="text-zinc-500 text-sm">아직 아무도 없습니다.</li>}
          </ul>

          {!isHost && (
            <div className="mt-4">
              <button onClick={toggleReady} className="w-full py-2 rounded-xl border hover:bg-zinc-50">
                {players.find(p=>p.name===me)?.ready ? '준비 해제' : '준비'}
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-4 md:col-span-2 space-y-4">
          <div className="font-semibold">게임선택</div>
          <div className="flex flex-wrap gap-2">
            {[1,2,3,4].map(n=>(
              <button key={n} onClick={()=>selectGame(n as 1|2|3|4)} disabled={!isHost}
                className={'px-3 py-2 rounded-lg border ' + (gameNo===n?'bg-black text-white':'hover:bg-zinc-50') + (!isHost?' opacity-50 cursor-not-allowed':'')}>
                게임 {n}
              </button>
            ))}
          </div>
          <div className="text-sm text-zinc-500">
            현재 선택: <span className="font-medium">{gameTitle}</span>{!isHost && ' (호스트만 변경 가능)'}
          </div>

          {isHost && (
            <div className="pt-2">
              <button onClick={startGame} className="px-4 py-2 rounded-xl bg-black text-white" disabled={players.length===0}>시작</button>
              <span className="ml-3 text-sm text-zinc-500">
                {allReady ? '모두 준비 완료' : '아직 준비 안 한 참가자가 있습니다'}
              </span>
            </div>
          )}
        </div>
      </section>

      <RulesModal open={openRules} onClose={()=>setOpenRules(false)} />
      <CaseModal open={openCase} onClose={()=>setOpenCase(false)} gameNo={gameNo} />
      <MyStoryModal open={openMy} onClose={()=>setOpenMy(false)} nick={me} />
    </main>
  )
}