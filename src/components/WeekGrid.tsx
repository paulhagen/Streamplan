import { useMemo } from 'react'
import { Hourglass } from 'react95'
import { keyframes, styled } from 'styled-components'
import dayjs from 'dayjs'

const groupIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`
const cardIn = keyframes`
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: translateX(0); }
`

const DaySection = styled.div<{ $delay: number; $pastDay: boolean }>`
  animation: ${groupIn} 0.3s ease both;
  animation-delay: ${p => p.$delay}ms;
  margin-bottom: 6px;
  opacity: ${p => p.$pastDay ? 0.82 : 1};
`

const DayHeader = styled.div<{ $today: boolean; $pastDay: boolean }>`
  background: ${p => p.$today
    ? 'linear-gradient(to right, #800000, #c04040)'
    : 'linear-gradient(to right, #000080, #1084d0)'};
  color: #fff;
  font-weight: 700;
  font-size: 18px;
  padding: 6px 12px;
  letter-spacing: 0.2px;
  margin-bottom: 3px;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 8px;
`

const TodayBadge = styled.span`
  font-size: 13px;
  font-weight: 400;
  background: rgba(255,255,255,0.25);
  padding: 1px 6px;
  letter-spacing: 0;
`

const SlotCard = styled.div<{ $delay: number; $canceled: boolean; $pastDay: boolean }>`
  display: flex;
  align-items: stretch;
  border: 2px solid;
  border-color: #fff #808080 #808080 #fff;
  background: ${p => p.$pastDay ? '#8f8f8f' : '#c0c0c0'};
  margin-bottom: 3px;
  opacity: ${p => p.$canceled ? 0.55 : p.$pastDay ? 0.68 : 1};
  filter: ${p => p.$pastDay ? 'brightness(0.82)' : 'none'};
  animation: ${cardIn} 0.2s ease both;
  animation-delay: ${p => p.$delay}ms;
  overflow: hidden;
  transition: border-color 0.1s;

  &:hover { border-color: #dfdfdf #606060 #606060 #dfdfdf; }
  &:active { border-color: #808080 #fff #fff #808080; }
`

const BoxArtWrap = styled.div`
  width: 60px;
  flex-shrink: 0;
  background: #000;
  border-right: 2px solid;
  border-color: #808080 #fff #fff #808080;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
`

const BoxArt = styled.img<{ $pastDay: boolean }>`
  width: 60px;
  height: 80px;
  object-fit: cover;
  display: block;
  filter: ${p => p.$pastDay ? 'grayscale(0.85) saturate(0.25) brightness(0.8)' : 'none'};
`

const BoxArtPlaceholder = styled.div`
  width: 60px;
  height: 80px;
  background: repeating-linear-gradient(
    45deg,
    #808080 0px, #808080 2px,
    #c0c0c0 2px, #c0c0c0 8px
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
`

const SlotInfo = styled.div`
  flex: 1;
  padding: 10px 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  min-width: 0;
`

const TimeBadge = styled.div`
  font-size: 16px;
  color: #444;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

const SlotTitle = styled.div`
  font-weight: 700;
  font-size: 20px;
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
  font-size: 14px;
  background: #800000;
  color: #fff;
  padding: 2px 7px;
  align-self: flex-start;
`

const EmptyDay = styled.div`
  border: 2px solid;
  border-color: #808080 #fff #fff #808080;
  background: #c0c0c0;
  margin-bottom: 3px;
  padding: 8px 12px;
  font-size: 16px;
  color: #808080;
  font-style: italic;
  min-height: 36px;
  display: flex;
  align-items: center;
`

export type Item = {
  id: string
  title?: string | null
  category?: string | null
  categoryId?: string | null
  boxArtUrl?: string | null
  startTime: string
  endTime: string | null
  canceled: boolean
}

export type Schedule = {
  channel: string
  updatedAt: string
  items: Item[]
}

interface Props {
  data: Schedule | null
  loading: boolean
  weekOffset: number
}

function buildWeekDays(weekOffset: number) {
  const today = dayjs()
  const monday = today.startOf('isoWeek').add(weekOffset, 'week')
  return Array.from({ length: 7 }, (_, i) => {
    const d = monday.add(i, 'day')
    return {
      key: d.format('YYYY-MM-DD'),
      label: d.format('dddd, DD.MM.YYYY'),
      isToday: d.isSame(today, 'day'),
      isPastDay: d.isBefore(today, 'day'),
    }
  })
}

function resolveBoxArt(url: string | null | undefined, w = 60, h = 80): string | null {
  if (!url) return null
  return url.replace('{width}', String(w)).replace('{height}', String(h))
}

export default function WeekGrid({ data, loading, weekOffset }: Props) {
  const now = dayjs()
  const weekDays = useMemo(() => buildWeekDays(weekOffset), [weekOffset])

  const byDay = useMemo(() => {
    if (!data) return {} as Record<string, Item[]>
    return data.items.reduce<Record<string, Item[]>>((acc, it) => {
      const key = dayjs(it.startTime).format('YYYY-MM-DD')
      ;(acc[key] ??= []).push(it)
      return acc
    }, {})
  }, [data])

  if (loading) {
    return (
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 24 }}>
        <Hourglass size={48} />
        <span style={{ fontSize: 18 }}>Lade Streamplan…</span>
      </div>
    )
  }

  return (
    <>
      {weekDays.map(({ key, label, isToday, isPastDay }, gi) => {
        const slots = (byDay[key] ?? []).sort(
          (a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf()
        )
        return (
          <DaySection key={key} $delay={gi * 50} $pastDay={isPastDay}>
            <DayHeader $today={isToday} $pastDay={isPastDay}>
              {label}
              {isToday && <TodayBadge>Heute</TodayBadge>}
            </DayHeader>
            {slots.length === 0
              ? <EmptyDay>Kein Stream geplant</EmptyDay>
              : slots.map((it, ri) => {
                  const boxArt = resolveBoxArt(it.boxArtUrl)
                  const isPastDay = dayjs(it.startTime).isBefore(now, 'day')
                  return (
                    <SlotCard
                      key={it.id}
                      $delay={gi * 50 + ri * 30 + 20}
                      $canceled={it.canceled}
                      $pastDay={isPastDay}
                    >
                      <BoxArtWrap>
                        {boxArt
                          ? <BoxArt $pastDay={isPastDay} src={boxArt} alt={it.category ?? ''} loading="lazy" />
                          : <BoxArtPlaceholder>🎮</BoxArtPlaceholder>
                        }
                      </BoxArtWrap>
                      <SlotInfo>
                        <TimeBadge>
                          {dayjs(it.startTime).format('HH:mm')}
                          {it.endTime && ` – ${dayjs(it.endTime).format('HH:mm')} Uhr`}
                        </TimeBadge>
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
                })
            }
          </DaySection>
        )
      })}
    </>
  )
}
