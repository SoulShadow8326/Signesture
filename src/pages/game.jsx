import React, { useEffect, useRef, useState } from 'react'
import Dice from '../components/dice'

export default function Game() {
  const [state, setState] = useState(null)
  const [player, setPlayer] = useState('A')
  const [roll, setRoll] = useState(null)
  const [serverRoll, setServerRoll] = useState(null)
  const [pos, setPos] = useState([1, 1])
  const [mapSize] = useState(9)
  const wsRef = useRef(null)
  const canvasRef = useRef(null)

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
        if (data.outcome && data.outcome.result === 'moved') movePlayer()
        if (data.command === 'roll_result') {
          const v = data.value
          setRoll(v)
          setServerRoll(v)
        }
      } catch (err) {
      }
    })
    return () => ws.close()
  }, [])

  useEffect(() => draw(), [pos, state])

  function sendAction(act) {
    const payload = { player, action: act }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(payload))
    else fetch('/action', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json()).then(d => {
      if (d.outcome && d.outcome.result === 'moved') movePlayer()
      // if server responded with a roll_value, use it
      if (d.outcome && d.outcome.roll_value) {
        setRoll(d.outcome.roll_value)
        setServerRoll(d.outcome.roll_value)
      }
      setState(d.state || state)
    }).catch(() => {})
  }

  function start() {
    fetch('/start', { method: 'POST' }).then(r => r.json()).then(d => setState(d.state || state)).catch(() => {})
  }

  function reset() {
    fetch('/reset', { method: 'POST' }).then(r => r.json()).then(d => {
      setState(d.state || null)
      setPos([1, 1])
    }).catch(() => {})
  }

  function doRoll() {
    // request authoritative roll from server
    setRoll(null)
    sendAction({ type: 'roll_request' })
  }

  function movePlayer() {
    setPos(p => {
      const [x, y] = p
      if (x < mapSize) return [x + 1, y]
      if (y < mapSize) return [x, y + 1]
      return p
    })
  }

  function draw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)
    const cell = Math.min(w, h) / (mapSize + 2)
    const offsetX = (w - cell * (mapSize + 1)) / 2
    const offsetY = (h - cell * (mapSize + 1)) / 2
    for (let i = 1; i <= mapSize; i++) {
      for (let j = 1; j <= mapSize; j++) {
        const x = offsetX + i * cell
        const y = offsetY + j * cell
        ctx.fillStyle = '#0b0b0b'
        ctx.fillRect(x - cell * 0.45, y - cell * 0.45, cell * 0.9, cell * 0.9)
        ctx.strokeStyle = 'rgba(255,255,255,0.03)'
        ctx.strokeRect(x - cell * 0.45, y - cell * 0.45, cell * 0.9, cell * 0.9)
      }
    }
    const traps = generateTraps()
    traps.forEach(t => {
      const x = offsetX + t[0] * cell
      const y = offsetY + t[1] * cell
      ctx.fillStyle = 'rgba(238,67,132,0.12)'
      ctx.fillRect(x - cell * 0.45, y - cell * 0.45, cell * 0.9, cell * 0.9)
      ctx.strokeStyle = 'rgba(238,67,132,0.35)'
      ctx.strokeRect(x - cell * 0.45, y - cell * 0.45, cell * 0.9, cell * 0.9)
    })
    const exitX = offsetX + mapSize * cell
    const exitY = offsetY + mapSize * cell
    ctx.fillStyle = 'rgba(62,218,145,0.14)'
    ctx.fillRect(exitX - cell * 0.45, exitY - cell * 0.45, cell * 0.9, cell * 0.9)
    ctx.fillStyle = '#fff'
    ctx.font = `${cell * 0.32}px SatoshiVar, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('EXIT', exitX, exitY)
    const [px, py] = pos
    const pxX = offsetX + px * cell
    const pyY = offsetY + py * cell
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(pxX, pyY, cell * 0.22, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#000'
    ctx.fillText('A', pxX, pyY)
  }

  function generateTraps() {
    const arr = []
    if (!state) return arr
    const seed = state.turn || 0
    for (let i = 0; i < Math.min(12, 4 + Math.floor((state.ai?.corruption || 0) / 10)); i++) {
      const x = 1 + ((seed + i * 17) % mapSize)
      const y = 1 + ((seed + i * 31) % mapSize)
      if (x === pos[0] && y === pos[1]) continue
      arr.push([x, y])
    }
    return arr
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, marginTop: 24 }}>
        <div>
          <canvas ref={canvasRef} width={720} height={720} style={{ width: '100%', height: 720, borderRadius: 12, background: '#030303' }} />
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button onClick={() => sendAction('move')} style={{ padding: 8 }}>Move</button>
            <button onClick={() => sendAction('interact')} style={{ padding: 8 }}>Interact</button>
            <button onClick={() => sendAction('freeze')} style={{ padding: 8 }}>Freeze</button>
            <button onClick={() => sendAction('assist')} style={{ padding: 8 }}>Assist</button>
          </div>
          <div style={{ marginTop: 12 }}>
            <pre style={{ whiteSpace: 'pre-wrap', background: '#000', color: '#fff', padding: 12, borderRadius: 8 }}>{state ? JSON.stringify(state, null, 2) : 'no state'}</pre>
          </div>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 300, height: 300 }}>
            <Dice size={300} rollTo={serverRoll} onRollRequest={() => sendAction({ type: 'roll_request' })} onRollComplete={(v) => setRoll(v)} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={doRoll} style={{ padding: 10, minWidth: 96 }}>Roll</button>
            <div style={{ padding: 10, minWidth: 48, textAlign: 'center', background: '#111', color: '#fff', borderRadius: 6 }}>{roll ?? '-'}</div>
          </div>
          <div style={{ width: '100%', marginTop: 8 }}>
            <h4 style={{ margin: 6 }}>Operator Controls</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={() => sendAction('freeze')} style={{ padding: 10 }}>Freeze Trap</button>
              <button onClick={() => sendAction('assist')} style={{ padding: 10 }}>Assist</button>
              <button onClick={() => sendAction('interact')} style={{ padding: 10 }}>Interact</button>
              <button onClick={() => sendAction({ type: 'roll', value: Math.floor(Math.random() * 20) + 1 })} style={{ padding: 10 }}>Force Roll</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
