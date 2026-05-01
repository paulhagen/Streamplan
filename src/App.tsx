import { useEffect, useMemo, useRef, useState } from 'react'
import {
    Window, WindowHeader, WindowContent,
    Button, Toolbar, Hourglass, Fieldset
} from 'react95'
import { keyframes, styled } from 'styled-components'
import * as htmlToImage from 'html-to-image'
import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import isoWeek from 'dayjs/plugin/isoWeek'
import 'dayjs/locale/de'

dayjs.extend(weekOfYear)
dayjs.extend(isoWeek)
dayjs.locale('de')

// ── Animations ────────────────────────────────────────────────────────────────

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(20px) scale(0.99); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
`
const taskbarIn = keyframes`
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
`
const groupIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`
const cardIn = keyframes`
  from { opacity: 0; transform: translateX(-10px); }
  to   { opacity: 1; transform: translateX(0); }
`

// ── Styled components ─────────────────────────────────────────────────────────

const WindowWrap = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  animation: ${slideUp} 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
`

const TaskbarWrap = styled.div`
  height: 40px;
  background: #c0c0c0;
  border-top: 2px solid #fff;
  display: flex;
  align-items: center;
  padding: 0 4px;
  gap: 4px;
  flex-shrink: 0;
  animation: ${taskbarIn} 0.3s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
`

const DaySection = styled.div<{ $delay: number }>`
  animation: ${groupIn} 0.3s ease both;
  animation-delay: ${p => p.$delay}ms;
  margin-bottom: 24px;
`

const DayHeader = styled.div`
  background: linear-gradient(to right, #000080, #1084d0);
  color: #fff;
  font-weight: 700;
  font-size: 20px;
  padding: 8px 12px;
  letter-spacing: 0.3px;
  margin-bottom: 10px;
  user-select: none;
`

const SlotCard = styled.div<{ $delay: number; $canceled: boolean }>`
  display: flex;
  align-items: stretch;
  border: 2px solid;
  border-color: #fff #808080 #808080 #fff;
  background: #c0c0c0;
  margin-bottom: 6px;
  opacity: ${p => p.$canceled ? 0.5 : 1};
  animation: ${cardIn} 0.25s ease both;
  animation-delay: ${p => p.$delay}ms;
  overflow: hidden;
  transition: border-color 0.1s;

  &:hover { border-color: #dfdfdf #606060 #606060 #dfdfdf; }
  &:active { border-color: #808080 #fff #fff #808080; }
`

const BoxArtWrap = styled.div`
  width: 108px;
  flex-shrink: 0;
  background: #000;
  border-right: 2px solid;
  border-color: #808080 #fff #fff #808080;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
`

const BoxArt = styled.img`
  width: 108px;
  height: 144px;
  object-fit: cover;
  display: block;
`

const BoxArtPlaceholder = styled.div`
  width: 108px;
  height: 144px;
  background: repeating-linear-gradient(
    45deg,
    #808080 0px, #808080 2px,
    #c0c0c0 2px, #c0c0c0 10px
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
`

const SlotInfo = styled.div`
  flex: 1;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  min-width: 0;
`

const SlotTime = styled.div`
  font-size: 16px;
  color: #444;
  font-variant-numeric: tabular-nums;
`

const SlotTitle = styled.div`
  font-weight: 700;
  font-size: 22px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const SlotCategory = styled.div`
  font-size: 16px;
  color: #000080;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const CanceledBadge = styled.span`
  font-size: 13px;
  background: #800000;
  color: #fff;
  padding: 2px 7px;
  align-self: flex-start;
`

// ── Types ─────────────────────────────────────────────────────────────────────

type Item = {
    id: string
    title?: string | null
    category?: string | null
    categoryId?: string | null
    boxArtUrl?: string | null
    startTime: string
    endTime: string | null
    canceled: boolean
}

type Schedule = {
    channel: string
    updatedAt: string
    items: Item[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function currentIsoWeek() { return dayjs().isoWeek() }
function itemIsoWeek(item: Item) { return dayjs(item.startTime).isoWeek() }

function resolveBoxArt(url: string | null | undefined, w = 108, h = 144): string | null {
    if (!url) return null
    return url.replace('{width}', String(w)).replace('{height}', String(h))
}

function groupByDaySorted(items: Item[]) {
    const sorted = [...items].sort(
        (a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf()
    )
    return sorted.reduce<Record<string, { label: string; items: Item[] }>>((acc, it) => {
        const d = dayjs(it.startTime)
        const key = d.format('YYYY-MM-DD')
        if (!acc[key]) acc[key] = { label: d.format('dddd, DD.MM.YYYY'), items: [] }
        acc[key].items.push(it)
        return acc
    }, {})
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
    const [data, setData] = useState<Schedule | null>(null)
    const [loading, setLoading] = useState(true)
    const [showAllWeeks, setShowAllWeeks] = useState(false)
    const refCapture = useRef<HTMLDivElement>(null)

    async function load() {
        setLoading(true)
        const res = await fetch('/schedule.json', { cache: 'no-store' })
        const json = await res.json()
        setData(json)
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    const kw = currentIsoWeek()

    const filteredItems = useMemo(() => {
        if (!data) return []
        if (showAllWeeks) return data.items
        return data.items.filter(it => itemIsoWeek(it) === kw)
    }, [data, showAllWeeks, kw])

    const groups = useMemo(() => groupByDaySorted(filteredItems), [filteredItems])

    async function exportPng() {
        if (!refCapture.current) return
        const dataUrl = await htmlToImage.toPng(refCapture.current, { pixelRatio: 2 })
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `streamplan_kw${kw}_${data?.channel ?? 'channel'}.png`
        a.click()
    }

    const hasItems = filteredItems.length > 0

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
            <WindowWrap ref={refCapture}>
                <Window style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <WindowHeader style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                        <span>📅 Streamplan — KW {kw}</span>
                        <span style={{ fontSize: 13, fontWeight: 'normal', opacity: 0.8 }}>
                            {data?.channel ?? ''}
                        </span>
                    </WindowHeader>

                    <Toolbar style={{ flexShrink: 0, flexWrap: 'nowrap', overflowX: 'auto' }}>
                        <Button onClick={load} size="sm" style={{ whiteSpace: 'nowrap' }}>Aktualisieren</Button>
                        <Button onClick={exportPng} size="sm" style={{ whiteSpace: 'nowrap' }}>PNG exportieren</Button>
                        <Button
                            onClick={() => setShowAllWeeks(v => !v)}
                            size="sm"
                            active={showAllWeeks}
                            style={{ whiteSpace: 'nowrap' }}
                        >
                            {showAllWeeks ? `Nur KW ${kw}` : 'Alle Wochen'}
                        </Button>
                        {data && (
                            <div style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.7, alignSelf: 'center', whiteSpace: 'nowrap', paddingLeft: 8 }}>
                                Stand: {dayjs(data.updatedAt).format('DD.MM. HH:mm')}
                            </div>
                        )}
                    </Toolbar>

                    <WindowContent style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
                        {loading && (
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 24 }}>
                                <Hourglass size={48} />
                                <span style={{ fontSize: 18 }}>Lade Streamplan…</span>
                            </div>
                        )}

                        {!loading && !hasItems && (
                            <Fieldset label="Hinweis" style={{ marginTop: 16, fontSize: 16 }}>
                                {showAllWeeks
                                    ? 'Keine Einträge im Twitch-Schedule gefunden.'
                                    : `Keine Streams für KW ${kw} geplant.`}
                            </Fieldset>
                        )}

                        {!loading && hasItems && Object.values(groups).map(({ label, items }, gi) => (
                            <DaySection key={label} $delay={gi * 80}>
                                <DayHeader>{label}</DayHeader>
                                {items.map((it, ri) => {
                                    const boxArt = resolveBoxArt(it.boxArtUrl)
                                    return (
                                        <SlotCard
                                            key={it.id}
                                            $delay={gi * 80 + ri * 50 + 40}
                                            $canceled={it.canceled}
                                        >
                                            <BoxArtWrap>
                                                {boxArt
                                                    ? <BoxArt src={boxArt} alt={it.category ?? ''} loading="lazy" />
                                                    : <BoxArtPlaceholder>🎮</BoxArtPlaceholder>
                                                }
                                            </BoxArtWrap>
                                            <SlotInfo>
                                                <SlotTime>
                                                    ab {dayjs(it.startTime).format('HH:mm')} Uhr
                                                    {it.endTime && ` – ${dayjs(it.endTime).format('HH:mm')} Uhr`}
                                                </SlotTime>
                                                <SlotTitle style={{ textDecoration: it.canceled ? 'line-through' : 'none' }}>
                                                    {it.title || it.category || 'Stream'}
                                                </SlotTitle>
                                                {it.category && it.title && (
                                                    <SlotCategory>{it.category}</SlotCategory>
                                                )}
                                                {it.canceled && <CanceledBadge>Abgesagt</CanceledBadge>}
                                            </SlotInfo>
                                        </SlotCard>
                                    )
                                })}
                            </DaySection>
                        ))}
                    </WindowContent>
                </Window>
            </WindowWrap>

            <TaskbarWrap>
                <Button onClick={load} style={{ fontWeight: 'bold', minWidth: 80, height: 30 }}>
                    🪟 Start
                </Button>
                <div style={{ width: 2, background: '#888', alignSelf: 'stretch', margin: '4px 4px' }} />
                <div style={{ fontSize: 12, alignSelf: 'center' }}>📅 Schedule.exe</div>
                <div style={{
                    marginLeft: 'auto', fontSize: 12, alignSelf: 'center',
                    padding: '2px 8px',
                    border: '1px inset #c0c0c0',
                    borderColor: '#808080 #fff #fff #808080',
                }}>
                    <Clock />
                </div>
            </TaskbarWrap>
        </div>
    )
}

function Clock() {
    const [time, setTime] = useState(() => dayjs().format('HH:mm'))
    useEffect(() => {
        const id = setInterval(() => setTime(dayjs().format('HH:mm')), 10_000)
        return () => clearInterval(id)
    }, [])
    return <>{time}</>
}
