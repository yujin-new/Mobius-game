'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import RulesModal from '../../components/RulesModal'
import { supabase } from '../../../lib/supabase'
import { getDeviceId } from '../../../lib/device'

type Place = { id: number; name: string; is_crime: boolean }
const STAGES = [
  { key: 'CLUE',         label: '단서 찾기', secs: 60 },
  { key: 'CHAT',         label: '토론',      secs: 900 },
  { key: 'VOTE_SECRET',  label: '비밀투표',  secs: 60 },
  { key: 'VOTE_VERDICT', label: '범인투표',  secs: 30 },
  { key: 'SUMMARY',      label: '결과',      secs: 0  },
] as const
type RoomState = { round: number; stageIndex: number; stageStartAt: number; gameNo: 1|2|3|4 }

function loadRoomMeta(code: string): { gameNo: 1|2|3|4 } {
  if (typeof window === 'undefined') return { gameNo: 1 }
  try {
    const raw = localStorage.getItem('room:' + code)
    const parsed = raw ? JSON.parse(raw) : null
    return { gameNo: (parsed?.gameNo ?? 1) as 1|2|3|4 }
  } catch { return { gameNo: 1 } }
}
function loadState(code: string): RoomState | null {
  try { const raw = localStorage.getItem('room:'+code+':state'); return raw ? JSON.parse(raw) as RoomState : null } catch { return null }
}
function saveState(code: string, s: RoomState) {
  localStorage.setItem('room:'+code+':state', JSON.stringify(s))
  window.dispatchEvent(new StorageEvent('storage', { key:'room:'+code+':state', newValue: JSON.stringify(s) }))
}
function amIHost(code: string, nick: string) {
  try {
    const raw = localStorage.getItem('room:'+code); if (!raw) return false
    const meta = JSON.parse(raw)
    const me = (Array.isArray(meta) ? meta : meta.players)?.find((p: any) => p.name === nick)
    return !!me?.isHost
  } catch { return false }
}

export default function RoomPage() {
  const params = useParams<{ code: string }>()
  const code = String(params.code).toUpperCase()
  const sp = useSearchParams()
  const nick = sp.get('nick') ?? 'GUEST'
  const host = amIHost(code, nick)
  const deviceId = getDeviceId()

  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Presence(접속자)
  const [online, setOnline] = useState<string[]>([])
  useEffect(() => {
    const channel = supabase.channel(`room-${code}`, { config:{ presence:{ key: deviceId }}})
    chanRef.current = channel
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const nicks = Object.values(state).flat().map((m:any)=> m.nick ?? m.presence_key)
        setOnline([...new Set(nicks)])
      })
      .on('broadcast', { event: 'kick' }, ({ payload }: any) => {
        const t = payload as { deviceId?: string; nick?: string }
        if (t.deviceId === deviceId || t.nick === nick) {
          localStorage.removeItem(`room:${code}:state`)
          location.href = '/?kicked=1'
        }
      })
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ presence_key: deviceId, nick })
      }
    })
    return () => { channel.untrack(); channel.unsubscribe(); chanRef.current = null }
  }, [code, deviceId, nick])

  const [state, setState] = useState<RoomState | null>(null)

  useEffect(() => {
    const cur = loadState(code)
    const { gameNo } = loadRoomMeta(code)
    if (!cur && host) {
      const now = Date.now()
      const init: RoomState = { round: 1, stageIndex: 0, stageStartAt: now, gameNo }
      saveState(code, init); setState(init)
    } else if (cur && cur.gameNo !== gameNo && host) {
      const next = { ...cur, gameNo, stageIndex: 0, stageStartAt: Date.now() }
      saveState(code, next); setState(next)
    } else {
      setState(cur)
    }
    const onSync = (e:StorageEvent) => { if (e.key==='room:'+code+':state') setState(loadState(code)) }
    window.addEventListener('storage', onSync)
    return () => window.removeEventListener('storage', onSync)
  }, [code, host])

  const stage = useMemo(() => STAGES[state?.stageIndex ?? 0], [state?.stageIndex])
  const [, rerender] = useState(0)
  useEffect(() => { const t = setInterval(() => rerender(x=>x+1), 1000); return () => clearInterval(t) }, [])
  const secsLeft = useMemo(() => {
    if (!state) return 0
    const dur = stage.secs; if (dur === 0) return 0
    const passed = Math.floor((Date.now() - state.stageStartAt)/1000)
    return Math.max(0, dur - passed)
  }, [state?.stageStartAt, stage.secs])

  useEffect(() => {
    if (!state || stage.key==='SUMMARY') return
    if (stage.secs>0 && secsLeft===0 && host) {
      const nextIdx = Math.min(state.stageIndex+1, STAGES.length-1)
      saveState(code, { ...state, stageIndex: nextIdx, stageStartAt: Date.now() })
    }
  }, [secsLeft, stage.key, stage.secs, host, state, code])

  const [places, setPlaces] = useState<Place[]>([])
  useEffect(() => {
    if (!state?.gameNo) return
    supabase.from('places').select('id,name,is_crime').eq('game_no', state.gameNo).order('sort_order')
      .then(({ data, error }) => { if (!error && data) setPlaces(data as Place[]) })
  }, [state?.gameNo])

  const [selected, setSelected] = useState<number | null>(null)
  const [openRules, setOpenRules] = useState(false)

  const gameTitle =
    state?.gameNo===1?'게임 1 — 유리박스 타워':
    state?.gameNo===2?'게임 2 — 지하, 잔향':
    state?.gameNo===3?'게임 3 — 백색소음':
    '게임 4 — 쇼핑몰, 네온의 그림자'

  const nextRound = () => {
    if (!state || !host) return
    const nxt = state.round + 1
    if (nxt > 10) { alert('10라운드 종료! 게임이 끝났습니다.'); return }
    saveState(code, { ...state, round: nxt, stageIndex: 0, stageStartAt: Date.now() })
  }

  if (!state) {
    return (
      <main className="min-h-screen grid place-items-center bg-zinc-50 p-6">
        <div className="rounded-2xl bg-white border shadow p-6 max-w-lg w-full space-y-3 text-center">
          <div className="text-lg font-semibold">Room {code}</div>
          <div className="text-sm text-zinc-600">참여자: {nick} {host && '(host)'} · 접속 {online.length}</div>
          <div className="text-zinc-700">호스트가 방을 시작하면 자동으로 이어집니다.</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto p-4 flex items-center justify-between">
          <div className="font-bold">
            {gameTitle} · Room {code} · Round {state.round}/10 · {stage.label}
          </div>
          <div className="text-sm text-zinc-600">{nick} {host && '(host)'} · 접속 {online.length}</div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto p-4 grid gap-4">
        <div className="rounded-2xl border bg-white p-4 flex items-center justify-between">
          <div className="font-semibold">{stage.label}</div>
          <div className={'tabular-nums text-xl font-mono ' + (secsLeft<=10 && stage.secs>0 ? 'text-red-600':'')}>
            {stage.secs===0 ? '—' : `${secsLeft}s`}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 flex items-center gap-3 text-sm text-zinc-600">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-4 w-4 rounded-lg border-2 border-red-500 ring-2 ring-red-300" />
            범행장소
          </span>
          <span className="text-zinc-400">|</span>
          <span>동시 열람 최대 2명 / 타일을 클릭해 단서 열람</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {places.map(p=>(
            <button key={p.id} onClick={()=>setSelected(p.id)}
              className={'group aspect-[4/3] rounded-2xl bg-white p-4 text-left hover:shadow-md transition ' +
                (p.is_crime ? 'border-2 border-red-500 ring-2 ring-red-300':'border')}>
              <div className="flex items-center justify-between">
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-zinc-500">동시열람 2명</div>
              </div>
              {p.is_crime && (
                <div className="mt-2 inline-flex items-center gap-1 text-xs text-red-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />
                  범행장소
                </div>
              )}
              <div className="mt-6 text-zinc-400 text-sm">+ 클릭해 단서 열람</div>
            </button>
          ))}
        </div>

        {stage.key==='SUMMARY' && host && (
          <div className="rounded-2xl border bg-white p-4 flex items-center justify-between">
            <div className="font-semibold">결과 단계</div>
            <button onClick={nextRound} className="px-4 py-2 rounded-xl bg-black text-white">다음 라운드</button>
          </div>
        )}
      </section>

      {selected!==null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">단서 열람</h2>
              <button className="text-zinc-500" onClick={()=>setSelected(null)}>닫기</button>
            </div>
            <div className="rounded-xl border p-4 text-sm text-zinc-700 max-h-[60vh] overflow-y-auto">
              이 장소의 단서는 아직 데이터셋 연결 전입니다. (다음 단계에서 Supabase clues 연결)
            </div>
            <div className="flex justify-end">
              <button className="px-4 py-2 rounded-xl bg-black text-white" onClick={()=>setSelected(null)}>확인</button>
            </div>
          </div>
        </div>
      )}

      <RulesModal open={openRules} onClose={()=>setOpenRules(false)} />
    </main>
  )
}
