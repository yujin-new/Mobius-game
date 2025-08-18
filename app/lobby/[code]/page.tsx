"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import RulesModal from "../../components/RulesModal"
import { supabase } from "../../../lib/supabase"
import { getDeviceId } from "../../../lib/device"

type Player = { id: string; device_id: string; nick: string; ready: boolean; is_host: boolean }
type Room   = { code: string; host_device_id: string | null; host_nick: string | null; game_no: 1|2|3|4 }

export default function LobbyPage() {
  const params = useParams<{ code:string }>()
  const code = String(params.code).toUpperCase()
  const sp    = useSearchParams()
  const router = useRouter()

  const deviceId = getDeviceId()
  const nickInput = (sp.get("nick") || "GUEST").trim()

  const [room, setRoom] = useState<Room | null>(null)
  const [me, setMe] = useState<Player | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [openRules, setOpenRules] = useState(false)
  const [openCase,  setOpenCase]  = useState(false)
  const [openMy,    setOpenMy]    = useState(false)

  // presence: device_id 기준 온라인 여부만 계산 (이름은 DB에서)
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const [onlineIds, setOnlineIds] = useState<string[]>([])

  useEffect(() => {
    (async () => {
      // 방 없으면 내가 호스트로 생성
      let { data: r } = await supabase.from("rooms").select("*").eq("code", code).maybeSingle()
      if (!r) {
        const { data: created, error } = await supabase.from("rooms")
          .insert({ code, host_device_id: deviceId, host_nick: nickInput, game_no: 1 })
          .select().single()
        if (error) { alert("방 생성 실패: " + error.message); return }
        r = created as Room
      }
      setRoom(r as Room)

      // 내 슬롯 있나 확인
      const { data: mine } = await supabase.from("players")
        .select("*").eq("room_code", code).eq("device_id", deviceId).maybeSingle()

      if (mine) {
        // 같은 폰이면 기존 닉으로 고정
        setMe(mine as any)
        if (mine.nick !== nickInput) {
          router.replace(`/lobby/${code}?nick=${encodeURIComponent(mine.nick)}`)
        }
      } else {
        // 닉 중복 검사
        const { data: dup } = await supabase.from("players")
          .select("id").eq("room_code", code).eq("nick", nickInput).maybeSingle()
        if (dup) {
          alert("이미 사용 중인 닉네임입니다. 메인으로 돌아가 다른 이름을 입력해 주세요.")
          router.replace("/")
          return
        }
        // 첫 입장자가 호스트
        const isHost = (r!.host_device_id === deviceId)
        const { data: created, error } = await supabase.from("players")
          .insert({ room_code: code, device_id: deviceId, nick: nickInput, is_host: isHost })
          .select().single()
        if (error) { alert("입장 실패: " + error.message); return }
        setMe(created as any)
      }

      await refreshPlayers()

      // 실시간: players/rooms, 그리고 presence
      const ch = supabase.channel("lobby-"+code)
        .on("postgres_changes",
          { event: "*", schema: "public", table: "players", filter: `room_code=eq.${code}` },
          () => refreshPlayers())
        .on("postgres_changes",
          { event: "*", schema: "public", table: "rooms", filter: `code=eq.${code}` },
          (payload) => setRoom(payload.new as any))

      // presence: device_id 기준
      ch.on("presence", { event: "sync" }, () => {
        const state = ch.presenceState()
        const ids = Object.values(state).flat().map((m: any) => m.presence_key) as string[]
        setOnlineIds([...new Set(ids)])
      })

      chanRef.current = ch
      const status = await ch.subscribeStatus()
      if (status !== "SUBSCRIBED") {
        ch.subscribe(async (st) => { if (st === "SUBSCRIBED") await ch.track({ presence_key: deviceId }) })
      } else {
        await ch.track({ presence_key: deviceId })
      }
    })()

    return () => {
      if (chanRef.current) { chanRef.current.untrack(); chanRef.current.unsubscribe() }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  async function refreshPlayers() {
    const { data } = await supabase.from("players")
      .select("id,device_id,nick,ready,is_host")
      .eq("room_code", code)
      .order("joined_at", { ascending: true })
    setPlayers((data||[]) as any)
  }

  async function toggleReady() {
    if (!me) return
    const { data: updated } = await supabase.from("players")
      .update({ ready: !me.ready }).eq("id", me.id).select().single()
    setMe(updated as any)
  }

  async function kick(target: Player) {
    if (!me?.is_host || target.id === me.id) return
    if (!confirm(`${target.nick}님을 퇴장시키시겠습니까?`)) return
    await supabase.from("players").delete().eq("id", target.id)
    // 대상은 자신의 행이 삭제되면 룸/로비에서 실시간 구독으로 메인으로 튕김 (room 페이지에도 처리 추가함)
  }

  async function selectGame(no: 1|2|3|4) {
    if (!me?.is_host || !room) return
    await supabase.from("rooms").update({ game_no: no }).eq("code", room.code)
  }

  function startGame() {
    if (!me?.is_host) return
    const allReady = players.every(p => p.is_host || p.ready)
    if (!allReady && !confirm("모두 준비되지 않았습니다. 그래도 시작할까요?")) return
    location.href = `/room/${code}?nick=${encodeURIComponent(me.nick)}`
  }

  const gameTitle =
    room?.game_no===1 ? "게임 1 — 유리박스 타워" :
    room?.game_no===2 ? "게임 2 — 지하, 잔향" :
    room?.game_no===3 ? "게임 3 — 백색소음" :
    "게임 4 — 쇼핑몰, 네온의 그림자"

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div className="text-lg font-bold">Lobby {code}</div>
        <div className="text-sm text-zinc-600">
          접속 {onlineIds.length}명
        </div>
      </header>

      <section className="grid md:grid-cols-3 gap-6">
        <div className="rounded-2xl border bg-white p-4">
          <div className="font-semibold mb-3">참가자</div>
          <ul className="space-y-2">
            {players.map(p=>(
              <li key={p.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={"inline-block h-2 w-2 rounded-full " + (onlineIds.includes(p.device_id) ? "bg-green-500" : "bg-zinc-300")} />
                  <span>{p.nick}</span>
                  {p.is_host && <span className="text-xs text-zinc-500">(host)</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={"text-sm " + (p.ready ? "text-green-600":"text-zinc-400")}>
                    {p.ready ? "준비" : "대기"}
                  </span>
                  {me?.is_host && p.id!==me.id && (
                    <button onClick={()=>kick(p)} className="text-xs px-2 py-1 rounded border hover:bg-zinc-50" title="강퇴">강퇴</button>
                  )}
                </div>
              </li>
            ))}
            {players.length===0 && <li className="text-zinc-500 text-sm">아직 아무도 없습니다.</li>}
          </ul>

          {!me?.is_host && (
            <div className="mt-4">
              <button onClick={toggleReady} className="w-full py-2 rounded-xl border hover:bg-zinc-50">
                {me?.ready ? "준비 해제" : "준비"}
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-4 md:col-span-2 space-y-4">
          <div className="font-semibold">게임선택</div>
          <div className="flex flex-wrap gap-2">
            {[1,2,3,4].map(n=>(
              <button key={n} onClick={()=>selectGame(n as 1|2|3|4)} disabled={!me?.is_host}
                className={"px-3 py-2 rounded-lg border " + (room?.game_no===n?"bg-black text-white":"hover:bg-zinc-50") + (!me?.is_host?" opacity-50 cursor-not-allowed":"")}>
                게임 {n}
              </button>
            ))}
          </div>
          <div className="text-sm text-zinc-500">
            현재 선택: <span className="font-medium">{gameTitle}</span>{!me?.is_host && " (호스트만 변경 가능)"}
          </div>

          {me?.is_host && (
            <div className="pt-2">
              <button onClick={startGame} className="px-4 py-2 rounded-xl bg-black text-white" disabled={players.length===0}>시작</button>
              <span className="ml-3 text-sm text-zinc-500">
                {players.every(p=>p.is_host||p.ready) ? "모두 준비 완료" : "아직 준비 안 한 참가자가 있습니다"}
              </span>
            </div>
          )}
        </div>
      </section>

      <div className="flex gap-2">
        <button onClick={()=>setOpenCase(true)} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-zinc-50">📖 사건 이야기</button>
        <button onClick={()=>setOpenMy(true)}   className="px-3 py-1.5 rounded-lg border text-sm hover:bg-zinc-50">🪪 나의 이야기</button>
        <button onClick={()=>setOpenRules(true)}className="px-3 py-1.5 rounded-lg border text-sm hover:bg-zinc-50">📜 게임규칙</button>
        <div className="text-sm text-zinc-600 ml-auto">
          {me?.nick} {me?.is_host && "(host)"}
        </div>
      </div>

      <RulesModal open={openRules} onClose={()=>setOpenRules(false)} />
      {openCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-4">
              <div className="font-semibold">📖 사건 이야기</div>
              <button className="text-zinc-500 hover:text-zinc-700" onClick={()=>setOpenCase(false)}>닫기</button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5 text-sm text-zinc-700">🔹 [파트1 — 스토리] (자리표시자)</div>
          </div>
        </div>
      )}
      {openMy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-4">
              <div className="font-semibold">🪪 나의 이야기</div>
              <button className="text-zinc-500 hover:text-zinc-700" onClick={()=>setOpenMy(false)}>닫기</button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5 text-sm text-zinc-700">🔹 [파트2 — Characters] — <strong>{me?.nick}</strong> (자리표시자)</div>
          </div>
        </div>
      )}
    </main>
  )
}