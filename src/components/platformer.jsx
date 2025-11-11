import React, { useRef, useEffect, useState } from 'react'
import playerSrc from '../assets/player.png'
import objectSrc from '../assets/object.png'
import mainAudioSrc from '../assets/main.mp3'
import rollAudioSrc from '../assets/roll.mp3'
import Dice from './dice'

export default function Platformer({ width = 720, height = 420, speed = 160 }) {
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const objRef = useRef(null)
  const [loaded, setLoaded] = useState(false)
  const [objLoaded, setObjLoaded] = useState(false)
  const [objectClicked, setObjectClicked] = useState(false)
  const [serverRoll, setServerRoll] = useState(null)
  const hideTimeoutRef = useRef(null)
  const mainAudioRef = useRef(null)
  const rollAudioRef = useRef(null)

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (mainAudioRef.current) {
        try { mainAudioRef.current.pause() } catch (e) {}
      }
    }
  }, [])

  useEffect(() => {
    if (serverRoll == null) return
    const ra = rollAudioRef.current
    if (!ra) return
    try {
      ra.pause()
      ra.currentTime = 0
      ra.volume = 1
      ra.play().catch(() => {})
    } catch (e) {}
  }, [serverRoll])

  const activeKeys = useKeyboard()

  useEffect(() => {
    const img = new Image()
    img.src = playerSrc
    imgRef.current = img
    img.onload = () => setLoaded(true)

    const oimg = new Image()
    oimg.src = objectSrc
    objRef.current = oimg
    oimg.onload = () => setObjLoaded(true)
    mainAudioRef.current = new Audio(mainAudioSrc)
    mainAudioRef.current.loop = true
    mainAudioRef.current.volume = 0.25
    mainAudioRef.current.play().catch(() => {})

    rollAudioRef.current = new Audio(rollAudioSrc)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf = null

    const world = {
      camX: 0,
      camY: 0,
      speed: speed,
      tiles: [],
      spawnX: 0,
      objects: [ { x: 600, y: height - 140, w: 64, h: 64 } ]
    }

    const player = {
      x: 140,
      y: height - 80,
      w: 40,
      h: 56,
      vx: 0,
      vy: 0,
      onGround: false
    }

    function ensureTiles() {
      while (world.spawnX < world.camX + width + 400) {
        const gap = Math.random() < 0.12 ? 120 + Math.random() * 200 : 0
        const wtile = 80 + Math.floor(Math.random() * 3) * 40
        const y = height - (40 + Math.floor(Math.random() * 3) * 20)
        world.tiles.push({ x: world.spawnX + gap, y, w: wtile, h: 20 })
        world.spawnX += gap + wtile
      }
    }

    function step(dt) {
      const keys = activeKeys
      if ((keys.KeyW || keys.Space) && player.onGround) player.vy = -700
      if (keys.ArrowLeft || keys.KeyA) player.vx -= 800 * dt
      if (keys.ArrowRight || keys.KeyD) player.vx += 800 * dt

      player.vx *= Math.exp(-6 * dt)

      player.vy += 1400 * dt
      player.x += player.vx * dt
      player.y += player.vy * dt

      player.onGround = false
      for (let t of world.tiles) {
        const tx = t.x - world.camX
        const ty = t.y
        if (player.x + player.w > tx && player.x < tx + t.w) {
          const py = player.y + player.h
          if (py > ty && player.y < ty + t.h && player.vy >= 0) {
            player.y = ty - player.h
            player.vy = 0
            player.onGround = true
          }
        }
      }

      if (player.y > height + 200) {
        player.y = height - 200
        player.vy = 0
        player.x = 140
        world.tiles = []
        world.spawnX = 0
        world.camX = 0
        world.camY = 0
      }

      const desiredCamX = Math.max(0, player.x - width * 0.3)
      world.camX += (desiredCamX - world.camX) * Math.min(1, 8 * dt)

      const desiredCamY = Math.max(0, player.y - height * 0.45 + player.h * 0.5)
      if (desiredCamY > world.camY + 1) {
        world.camY += (desiredCamY - world.camY) * Math.min(1, 6 * dt)
      }

      const leftBound = world.camX - 200
      while (world.tiles.length && world.tiles[0].x + world.tiles[0].w < leftBound) world.tiles.shift()
    }

    function render() {
      ctx.fillStyle = '#67b3ff'
      ctx.fillRect(0, 0, width, height)

      ctx.fillStyle = '#17a34a'
      for (let t of world.tiles) {
        const tx = Math.round(t.x - world.camX)
        const ty = Math.round(t.y - world.camY)
        ctx.fillRect(tx, ty, t.w, t.h)
      }

      for (let o of world.objects) {
        const ox = Math.round(o.x - world.camX)
        const oy = Math.round(o.y - world.camY)
        if (objRef.current && objLoaded) ctx.drawImage(objRef.current, ox, oy, o.w, o.h)
        else {
          ctx.fillStyle = '#aa7744'
          ctx.fillRect(ox, oy, o.w, o.h)
        }
      }

      if (loaded && imgRef.current) {
        ctx.drawImage(imgRef.current, Math.round(player.x - world.camX), Math.round(player.y - world.camY), player.w, player.h)
      } else {
        ctx.fillStyle = '#fff'
        ctx.fillRect(Math.round(player.x - world.camX), Math.round(player.y - world.camY), player.w, player.h)
      }
    }

    let last = performance.now()
    function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      ensureTiles()
      step(dt)
      render()
      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    function onClick(e) {
      const rect = canvas.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const worldX = cx * (canvas.width / rect.width) + world.camX
      const worldY = cy * (canvas.height / rect.height) + world.camY
      for (let o of world.objects) {
        if (worldX >= o.x && worldX <= o.x + o.w && worldY >= o.y && worldY <= o.y + o.h) {
          setObjectClicked(true)
          fetch('/action', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ player: 'A', action: { type: 'roll_request' } }) }).then(r => r.json()).then(d => {
            if (d.outcome && d.outcome.roll_value) setServerRoll(d.outcome.roll_value)
          }).catch(() => {})
          break
        }
      }
    }

    canvas.addEventListener('click', onClick)
    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('click', onClick)
    }
  }, [loaded, width, height, speed])

  return (
    <div style={{ position: 'relative' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ width: '100%', height }} />
      {objectClicked && (
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
          <Dice size={600} rollTo={serverRoll} onRollRequest={() => {
            setServerRoll(null)
            fetch('/action', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ player: 'A', action: { type: 'roll_request' } }) }).then(r => r.json()).then(d => {
              if (d.outcome && d.outcome.roll_value) setServerRoll(d.outcome.roll_value)
            }).catch(() => {})
          }} onRollComplete={() => {
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
            hideTimeoutRef.current = setTimeout(() => {
              setObjectClicked(false)
              setServerRoll(null)
              hideTimeoutRef.current = null
            }, 1500)
          }} />
        </div>
      )}
    </div>
  )
}

function useKeyboard() {
  const keys = useRef({})
  useEffect(() => {
    function down(e) { keys.current[e.code] = true }
    function up(e) { keys.current[e.code] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])
  return keys.current
}
