import { useEffect, useState } from 'react'
import { Button } from 'react95'
import { keyframes, styled } from 'styled-components'
import dayjs from 'dayjs'

const taskbarIn = keyframes`
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
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

function Clock() {
  const [time, setTime] = useState(() => dayjs().format('HH:mm'))
  useEffect(() => {
    const id = setInterval(() => setTime(dayjs().format('HH:mm')), 10_000)
    return () => clearInterval(id)
  }, [])
  return <>{time}</>
}

interface Props {
  onRefresh: () => void
}

export default function Taskbar({ onRefresh }: Props) {
  return (
    <TaskbarWrap>
      <Button onClick={onRefresh} style={{ fontWeight: 'bold', minWidth: 80, height: 30 }}>
        🪟 Start
      </Button>
      <div style={{ width: 2, background: '#888', alignSelf: 'stretch', margin: '4px 4px' }} />
      <Button active style={{ height: 30, minWidth: 120, fontWeight: 'bold', textAlign: 'left', paddingLeft: 6 }}>
        📅 Schedule.exe
      </Button>
      <div style={{
        marginLeft: 'auto', fontSize: 12, alignSelf: 'center',
        padding: '2px 8px',
        border: '1px inset #c0c0c0',
        borderColor: '#808080 #fff #fff #808080',
      }}>
        <Clock />
      </div>
    </TaskbarWrap>
  )
}
