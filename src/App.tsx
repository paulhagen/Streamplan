import { useEffect, useMemo, useRef, useState } from 'react'
import { Window, WindowHeader, WindowContent, Button, Toolbar, Fieldset, Hourglass } from 'react95'
import * as htmlToImage from 'html-to-image'
import dayjs from 'dayjs'
import 'dayjs/locale/de'
dayjs.locale('de')

type Item = {
    id: string
    title?: string | null        // Fallback, wird nicht angezeigt, wenn category existiert
    category?: string | null     // wird angezeigt
    startTime: string
    endTime: string | null
    canceled: boolean
}

type Schedule = {
    channel: string
    updatedAt: string
    items: Item[]
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

export default function App() {
    const [data, setData] = useState<Schedule | null>(null)
    const [loading, setLoading] = useState(true)
    const refCapture = useRef<HTMLDivElement>(null)

    async function load() {
        setLoading(true)
        const res = await fetch('/schedule.json', { cache: 'no-store' })
        const json = await res.json()
        setData(json)
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    const groups = useMemo(() => (data ? groupByDaySorted(data.items) : {}), [data])

    async function exportPng() {
        if (!refCapture.current) return
        const dataUrl = await htmlToImage.toPng(refCapture.current, { pixelRatio: 2 })
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `streamplan_${data?.channel ?? 'channel'}.png`
        a.click()
    }

    const rowStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: '160px 1fr 120px',
        gap: 8,
        alignItems: 'center',
        padding: '6px 8px',
        border: '1px solid rgba(0,0,0,.15)'
    }

    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div ref={refCapture}>
                <Window style={{ width: 900 }}>
                    <WindowHeader>Schedule.exe</WindowHeader>
                    <WindowContent>
                        <Toolbar>
                            <Button onClick={load}>Update</Button>
                            <Button onClick={exportPng}>Als PNG exportieren</Button>
                            <div style={{ marginLeft: 'auto', opacity: .7 }}>
                                {data && `Stand: ${dayjs(data.updatedAt).format('DD.MM.YYYY HH:mm')}`}
                            </div>
                        </Toolbar>

                        {loading && (
                            <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:12 }}>
                                <Hourglass /> <span>Lade Plan…</span>
                            </div>
                        )}

                        {!loading && data && data.items.length === 0 && (
                            <Fieldset label="Hinweis" style={{ marginTop: 12 }}>
                                Keine Einträge im Twitch-Schedule gefunden.
                            </Fieldset>
                        )}

                        {!loading && data && data.items.length > 0 && (
                            <div style={{ display:'grid', gap:16, marginTop: 12 }}>
                                {Object.values(groups).map(({ label, items }) => (
                                    <Fieldset key={label} label={label}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {items.map(it => (
                                                <div key={it.id} style={rowStyle}>
                                                    <div>ab {dayjs(it.startTime).format('HH:mm')}</div>
                                                    <div>
                                                        <b>{it.category ?? it.title ?? 'Stream'}</b>{' '}
                                                        {it.canceled && <span style={{ opacity:.6 }}>(abgesagt)</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </Fieldset>
                                ))}
                            </div>
                        )}
                    </WindowContent>
                </Window>
            </div>
        </div>
    )
}
