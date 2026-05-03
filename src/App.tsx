import { useEffect, useRef, useState } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { Window, WindowHeader, WindowContent, Button, Toolbar, Fieldset } from 'react95'
import { keyframes, styled } from 'styled-components'
import * as htmlToImage from 'html-to-image'
import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import isoWeek from 'dayjs/plugin/isoWeek'
import 'dayjs/locale/de'
import WeekGrid, { type Schedule } from './components/WeekGrid'
import Taskbar from './components/Taskbar'

dayjs.extend(weekOfYear)
dayjs.extend(isoWeek)
dayjs.locale('de')

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(20px) scale(0.99); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
`

const WindowWrap = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  animation: ${slideUp} 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
`

function useSchedule() {
  const [data, setData] = useState<Schedule | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch(`${import.meta.env.BASE_URL}schedule.json`, { cache: 'no-store' })
    setData(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  return { data, loading, load }
}

// ── Full schedule page (/) ────────────────────────────────────────────────────

function FullSchedulePage() {
  const { data, loading, load } = useSchedule()
  const [weekOffset, setWeekOffset] = useState(0)
  const refCapture = useRef<HTMLDivElement>(null)
  const kw = dayjs().add(weekOffset, 'week').isoWeek()

  async function exportPng() {
    if (!refCapture.current) return
    const dataUrl = await htmlToImage.toPng(refCapture.current, { pixelRatio: 2 })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `streamplan_kw${kw}_${data?.channel ?? 'channel'}.png`
    a.click()
  }

  const hasOtherWeeks = !loading && weekOffset === 0 && data
    ? data.items.some(it => {
        const d = dayjs(it.startTime)
        const weekStart = dayjs().startOf('isoWeek')
        return d.isBefore(weekStart) || d.isAfter(weekStart.add(6, 'day'))
      })
    : false

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <WindowWrap ref={refCapture}>
        <Window style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <WindowHeader style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span>
              📅 Streamplan —{' '}
              <span style={{ fontSize: 24, fontWeight: 700 }}>KW {kw}</span>
            </span>
            <span style={{ fontSize: 13, fontWeight: 'normal', opacity: 0.8 }}>
              {data?.channel ?? ''}
            </span>
          </WindowHeader>

          <Toolbar style={{ flexShrink: 0, flexWrap: 'nowrap', overflowX: 'auto' }}>
            <Button onClick={load} size="sm" style={{ whiteSpace: 'nowrap' }}>Aktualisieren</Button>
            <Button onClick={exportPng} size="sm" style={{ whiteSpace: 'nowrap' }}>PNG exportieren</Button>
            <Button onClick={() => setWeekOffset(v => v - 1)} size="sm">◀</Button>
            <Button onClick={() => setWeekOffset(0)} size="sm" active={weekOffset === 0} style={{ whiteSpace: 'nowrap' }}>
              Diese Woche
            </Button>
            <Button onClick={() => setWeekOffset(v => v + 1)} size="sm">▶</Button>
            {data && (
              <div style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.7, alignSelf: 'center', whiteSpace: 'nowrap', paddingLeft: 8 }}>
                Stand: {dayjs(data.updatedAt).format('DD.MM. HH:mm')}
              </div>
            )}
          </Toolbar>

          <WindowContent style={{ flex: 1, overflowY: 'auto', padding: '10px 12px 6px' }}>
            <WeekGrid data={data} loading={loading} weekOffset={weekOffset} />
            {hasOtherWeeks && (
              <Fieldset label="Weitere Streams" style={{ marginTop: 16, marginBottom: 16, fontSize: 13, color: '#666' }}>
                Weitere Streams in anderen Wochen vorhanden — nutze ▶ zum Blättern.
              </Fieldset>
            )}
          </WindowContent>
        </Window>
      </WindowWrap>
      <Taskbar onRefresh={load} />
    </div>
  )
}

// ── Current week page (/current-week) ────────────────────────────────────────

function CurrentWeekPage() {
  const { data, loading, load } = useSchedule()
  const kw = dayjs().isoWeek()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <WindowWrap>
        <Window style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <WindowHeader style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span>
              📅 Streamplan —{' '}
              <span style={{ fontSize: 24, fontWeight: 700 }}>KW {kw}</span>
            </span>
            <span style={{ fontSize: 13, fontWeight: 'normal', opacity: 0.8 }}>
              {data?.channel ?? ''}
            </span>
          </WindowHeader>

          <Toolbar style={{ flexShrink: 0 }}>
            <Button onClick={load} size="sm">Aktualisieren</Button>
            {data && (
              <div style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.7, alignSelf: 'center', paddingLeft: 8 }}>
                Stand: {dayjs(data.updatedAt).format('DD.MM. HH:mm')}
              </div>
            )}
          </Toolbar>

          <WindowContent style={{ flex: 1, overflowY: 'auto', padding: '10px 12px 6px' }}>
            <WeekGrid data={data} loading={loading} weekOffset={0} />
          </WindowContent>
        </Window>
      </WindowWrap>
      <Taskbar onRefresh={load} />
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<FullSchedulePage />} />
        <Route path="/current-week" element={<CurrentWeekPage />} />
      </Routes>
    </HashRouter>
  )
}
