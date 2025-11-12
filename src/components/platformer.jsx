import React, { useRef, useEffect, useState } from 'react'
import playerSrc from '../assets/player.png'
import objectSrc from '../assets/object.png'
import grassSrc from '../assets/grass.png'
import dirtSrc from '../assets/dirt.png'
import mainAudioSrc from '../assets/main.mp3'
import rollAudioSrc from '../assets/roll.mp3'
import Dice from './dice'

export default function Platformer({ width = 720, height = 420, speed = 160 }) {
  const TILE = 32
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const objRef = useRef(null)
  const grassRef = useRef(null)
  const dirtRef = useRef(null)
  const [loaded, setLoaded] = useState(false)
  const [objLoaded, setObjLoaded] = useState(false)
  const [grassLoaded, setGrassLoaded] = useState(false)
  const [dirtLoaded, setDirtLoaded] = useState(false)
  const [objectClicked, setObjectClicked] = useState(false)
  const [serverRoll, setServerRoll] = useState(null)
  const [currentLevel, setCurrentLevel] = useState(1)
  const [narrative, setNarrative] = useState("Welcome, Architect. Let's test your creation.")
  const [showNarrative, setShowNarrative] = useState(true)
  const [actionRoll, setActionRoll] = useState(null)
  const [rollOutcome, setRollOutcome] = useState(null)
  const hideTimeoutRef = useRef(null)
  const mainAudioRef = useRef(null)
  const rollAudioRef = useRef(null)

  const levels = [
    {
      name: "The Awakening",
      description: "Navigate the first hallways, guided by faint light signals.",
      mechanics: "simple_navigation",
      goal: "Reach the end of the hallway."
    },
    {
      name: "Timing Hall",
      description: "Floors shift into spike patterns. Time your movements.",
      mechanics: "timing_spikes",
      goal: "Cross the hall without falling into spikes."
    },
    {
      name: "Laser Corridor",
      description: "Rotating laser grids form mazes. Avoid the beams.",
      mechanics: "laser_maze",
      goal: "Navigate through the corridor."
    },
    {
      name: "Circuit Puzzle",
      description: "Align energy nodes and connect terminals.",
      mechanics: "puzzle",
      goal: "Solve the circuit puzzle."
    },
    {
      name: "Core Chamber",
      description: "Override the AI simultaneously.",
      mechanics: "final",
      goal: "Reach the Core Node and override."
    }
  ]

  const levelMaps = {
    1: {
      tiles: [
        { x: 0, y: height - 32, w: 1200, h: 32 },
        { x: 400, y: height - 140, w: 100, h: 32 },
        { x: 800, y: height - 240, w: 100, h: 32 }
      ],
      objects: [{ x: 1000, y: height - 280, w: 64, h: 64, type: 'light' }],
      spikes: [],
      lasers: [],
      spawnX: 140,
      spawnY: height - 80
    },
    2: {
      tiles: [
        { x: 0, y: height - 32, w: 1300, h: 32 }
      ],
      objects: [{ x: 1200, y: height - 80, w: 64, h: 64, type: 'goal' }],
  spikes: [{ x: 600, y: height - 32, w: 100, h: 32, active: true }],
      lasers: [],
      spawnX: 140,
      spawnY: height - 80
    },
    3: {
      tiles: [
        { x: 0, y: height - 32, w: 1400, h: 32 },
        { x: 200, y: height - 140, w: 100, h: 32 },
        { x: 500, y: height - 240, w: 100, h: 32 },
        { x: 800, y: height - 140, w: 100, h: 32 },
        { x: 1100, y: height - 240, w: 100, h: 32 }
      ],
      objects: [{ x: 1300, y: height - 280, w: 64, h: 64, type: 'goal' }],
      spikes: [],
      lasers: [
        { x: 350, y: height - 200, w: 20, h: 200, angle: 0 },
        { x: 650, y: height - 200, w: 20, h: 200, angle: Math.PI / 4 },
        { x: 950, y: height - 200, w: 20, h: 200, angle: Math.PI / 2 }
      ],
      spawnX: 140,
      spawnY: height - 80
    },
    4: {
      tiles: [
        { x: 0, y: height - 32, w: 1600, h: 32 },
        { x: 300, y: height - 140, w: 100, h: 32 },
        { x: 600, y: height - 240, w: 100, h: 32 },
        { x: 900, y: height - 140, w: 100, h: 32 },
        { x: 1200, y: height - 240, w: 100, h: 32 }
      ],
      objects: [
        { x: 400, y: height - 180, w: 64, h: 64, type: 'node' },
        { x: 700, y: height - 280, w: 64, h: 64, type: 'terminal' },
        { x: 1000, y: height - 180, w: 64, h: 64, type: 'node' },
        { x: 1300, y: height - 280, w: 64, h: 64, type: 'terminal' }
      ],
      spikes: [],
      lasers: [],
      spawnX: 140,
      spawnY: height - 80
    },
    5: {
      tiles: [
        { x: 0, y: height - 32, w: 1000, h: 32 },
        { x: 200, y: height - 140, w: 100, h: 32 },
        { x: 500, y: height - 240, w: 100, h: 32 },
        { x: 800, y: height - 140, w: 100, h: 32 }
      ],
      objects: [{ x: 900, y: height - 180, w: 64, h: 64, type: 'core' }],
      spikes: [],
      lasers: [{ x: 600, y: height - 200, w: 20, h: 200, angle: 0 }],
      spawnX: 140,
      spawnY: height - 80
    }
  }

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

  const requestRoll = (action) => {
    setActionRoll(action)
    fetch('/action', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ player: 'A', action: { type: 'roll_request' } }) }).then(r => r.json()).then(d => {
      if (d.outcome && d.outcome.roll_value) {
        setServerRoll(d.outcome.roll_value)
        setRollOutcome(d.outcome.roll_value)
      }
    }).catch(() => {})
  }

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

    const gimg = new Image()
    gimg.src = grassSrc
    grassRef.current = gimg
    gimg.onload = () => setGrassLoaded(true)

    const dimg = new Image()
    dimg.src = dirtSrc
    dirtRef.current = dimg
    dimg.onload = () => setDirtLoaded(true)

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
      tiles: levelMaps[currentLevel].tiles,
      objects: levelMaps[currentLevel].objects,
      spikes: levelMaps[currentLevel].spikes,
      lasers: levelMaps[currentLevel].lasers,
      level: currentLevel
    }

    const player = {
      x: levelMaps[currentLevel].spawnX,
      y: levelMaps[currentLevel].spawnY,
      w: 40,
      h: 56,
      vx: 0,
      vy: 0,
      onGround: false
    }

    let time = 0

    function step(dt) {
      time += dt
      if (currentLevel === 2) {
        world.spikes.forEach(s => s.active = Math.floor(time / 2) % 2 === 0)
      }
      if (currentLevel === 3) {
        world.lasers.forEach(l => l.angle += dt)
      }
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
        if (player.x + player.w > t.x && player.x < t.x + t.w) {
          const py = player.y + player.h
          if (py > t.y && player.y < t.y + t.h && player.vy >= 0) {
            player.y = t.y - player.h
            player.vy = 0
            player.onGround = true
          }
        }
      }

      for (let s of world.spikes) {
        if (s.active && player.x + player.w > s.x && player.x < s.x + s.w && player.y + player.h > s.y) {
          player.y = levelMaps[currentLevel].spawnY
          player.vy = 0
          player.x = levelMaps[currentLevel].spawnX
          setNarrative("Fell into spikes. Reset.")
          setShowNarrative(true)
        }
      }

      for (let l of world.lasers) {
        const lx = l.x + Math.cos(l.angle) * l.h / 2
        const ly = l.y + Math.sin(l.angle) * l.h / 2
        if (player.x + player.w > lx - l.w / 2 && player.x < lx + l.w / 2 && player.y + player.h > ly - l.h / 2 && player.y < ly + l.h / 2) {
          player.y = levelMaps[currentLevel].spawnY
          player.vy = 0
          player.x = levelMaps[currentLevel].spawnX
          setNarrative("Hit by laser. Reset.")
          setShowNarrative(true)
        }
      }

      if (player.y > height + 200) {
        player.y = levelMaps[currentLevel].spawnY
        player.vy = 0
        player.x = levelMaps[currentLevel].spawnX
        setNarrative("Fell. Reset.")
        setShowNarrative(true)
      }

      const desiredCamX = Math.max(0, player.x - width * 0.3)
      world.camX += (desiredCamX - world.camX) * Math.min(1, 8 * dt)

      const desiredCamY = Math.max(0, player.y - height * 0.45 + player.h * 0.5)
      if (desiredCamY > world.camY + 1) {
        world.camY += (desiredCamY - world.camY) * Math.min(1, 6 * dt)
      }
    }

    function render() {
      ctx.fillStyle = '#67b3ff'
      ctx.fillRect(0, 0, width, height)

      ctx.fillStyle = '#17a34a'
      for (let t of world.tiles) {
        const tx = Math.round(t.x - world.camX)
        const ty = Math.round(t.y - world.camY)
        const cols = Math.max(1, Math.ceil(t.w / TILE))
        for (let i = 0; i < cols; i++) {
          const sx = tx + i * TILE
          if (dirtRef.current && dirtLoaded) ctx.drawImage(dirtRef.current, sx, ty, TILE, TILE)
          else ctx.fillRect(sx, ty, TILE, TILE)
          if (grassRef.current && grassLoaded) ctx.drawImage(grassRef.current, sx, ty, TILE, TILE)
        }
      }

      ctx.fillStyle = '#ff0000'
      for (let s of world.spikes) {
        if (s.active) {
          const sx = Math.round(s.x - world.camX)
          const sy = Math.round(s.y - world.camY)
          ctx.fillRect(sx, sy, s.w, s.h)
        }
      }

      ctx.fillStyle = '#ff00ff'
      for (let l of world.lasers) {
        const lx = Math.round(l.x - world.camX)
        const ly = Math.round(l.y - world.camY)
        ctx.save()
        ctx.translate(lx + l.w / 2, ly + l.h / 2)
        ctx.rotate(l.angle)
        ctx.fillRect(-l.w / 2, -l.h / 2, l.w, l.h)
        ctx.restore()
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
          requestRoll('interact')
          break
        }
      }
    }

    canvas.addEventListener('click', onClick)
    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('click', onClick)
    }
  }, [loaded, objLoaded, grassLoaded, dirtLoaded, width, height, speed, currentLevel])

  return (
    <div style={{ position: 'relative' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ width: '100%', height }} />
      {objectClicked && (
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
          <Dice size={600} rollTo={serverRoll} onRollRequest={() => {
            setServerRoll(null)
            requestRoll(actionRoll)
          }} onRollComplete={() => {
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
            hideTimeoutRef.current = setTimeout(() => {
              setObjectClicked(false)
              setServerRoll(null)
              hideTimeoutRef.current = null
              if (actionRoll === 'interact' && rollOutcome !== null) {
                const success = rollOutcome >= 10
                if (success) {
                  if (currentLevel === 1) {
                    setCurrentLevel(2)
                    setNarrative("Level 2: Timing Hall. Floors shift into spike patterns.")
                  } else if (currentLevel === 2) {
                    setCurrentLevel(3)
                    setNarrative("Level 3: Laser Corridor. Avoid the beams.")
                  } else if (currentLevel === 3) {
                    setCurrentLevel(4)
                    setNarrative("Level 4: Circuit Puzzle. Align the nodes.")
                  } else if (currentLevel === 4) {
                    setCurrentLevel(5)
                    setNarrative("Final Level: Core Chamber. Override the AI.")
                  } else if (currentLevel === 5) {
                    setNarrative("Simulation collapsed. You survived.")
                  }
                  setShowNarrative(true)
                } else {
                  setNarrative("Interaction failed. Try again.")
                  setShowNarrative(true)
                }
                setActionRoll(null)
                setRollOutcome(null)
              }
            }, 1500)
          }} />
        </div>
      ) }
      {showNarrative && (
        <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.7)', color: 'white', padding: 10, borderRadius: 5 }} onClick={() => setShowNarrative(false)}>
          <div>Level {currentLevel}: {levels[currentLevel - 1].name}</div>
          <div>{narrative}</div>
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
