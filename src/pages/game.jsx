import React, { useEffect, useRef, useState } from 'react'
import Dice from '../components/dice'

export default function Game() {
  const [state, setState] = useState(null)
  const [player, setPlayer] = useState('A')
  const [roll, setRoll] = useState(null)
  const wsRef = useRef(null)

  useEffect(() => {
    fetch('/state').then(r => r.json()).then(setState).catch(() => {})
  }, [])

  useEffect(() => {
    const url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'
    const ws = new WebSocket(url)
    wsRef.current = ws
    ws.addEventListener('message', e => {
      try {
        const data = JSON.parse(e.data)
        if (data.broadcast) setState(data.broadcast)
        if (data.state) setState(data.state)
        if (data.outcome) setState(data.state || state)
      } catch (err) {
      }
    })
    return () => ws.close()
  }, [])

  function sendAction(act) {
    const payload = { player, action: act }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(payload))
    else fetch('/action', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json()).then(d => setState(d.state || state)).catch(() => {})
  }

  function start() {
    fetch('/start', { method: 'POST' }).then(r => r.json()).then(d => setState(d.state || state)).catch(() => {})
  }

  function reset() {
    fetch('/reset', { method: 'POST' }).then(r => r.json()).then(d => setState(d.state || state)).catch(() => {})
  }

  function doRoll() {
    const v = Math.floor(Math.random() * 20) + 1
    setRoll(v)
    sendAction({ type: 'roll', value: v })
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={start} style={{ padding: 8 }}>Start</button>
          <button onClick={reset} style={{ padding: 8 }}>Reset</button>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <label style={{ marginRight: 8 }}>Player</label>
          <select value={player} onChange={e => setPlayer(e.target.value)}>
            <option value="A">A (Trapped)</option>
            <option value="B">B (Operator)</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, marginTop: 24 }}>
        <div>
          <h2>World</h2>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#000', color: '#fff', padding: 12, borderRadius: 8 }}>{state ? JSON.stringify(state, null, 2) : 'no state'}</pre>
          <div style={{ marginTop: 12 }}>
            <button onClick={() => sendAction('move')} style={{ padding: 8, marginRight: 8 }}>Move</button>
            <button onClick={() => sendAction('interact')} style={{ padding: 8, marginRight: 8 }}>Interact</button>
            <button onClick={() => sendAction('freeze')} style={{ padding: 8, marginRight: 8 }}>Freeze</button>
            <button onClick={() => sendAction('assist')} style={{ padding: 8 }}>Assist</button>
          </div>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 260, height: 260 }}>
            <Dice size={260} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={doRoll} style={{ padding: 8 }}>Roll</button>
            <div style={{ padding: 8, minWidth: 48, textAlign: 'center', background: '#111', color: '#fff', borderRadius: 6 }}>{roll ?? '-'}</div>
          </div>
        </aside>
      </div>
    </div>
  )
}
