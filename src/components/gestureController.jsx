import React, { useEffect, useRef } from 'react'

export default function GestureController({ onGesture, videoWidth = 640, videoHeight = 480, minFrames = 5 }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const gestureRef = useRef(null)
  const lastRef = useRef({ name: null, count: 0 })
  const runningRef = useRef(true)
  useEffect(() => {
    let raf
    async function init() {
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.js')
      const FilesetResolver = window.FilesetResolver
      const GestureRecognizer = window.GestureRecognizer
      if (!FilesetResolver || !GestureRecognizer) return
      const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm')
      gestureRef.current = await GestureRecognizer.createFromOptions(vision, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task' }, runningMode: 'VIDEO' })
      startCam()
      loop()
    }
    function startCam() {
      navigator.mediaDevices.getUserMedia({ video: true }).then(stream => { const v = videoRef.current; v.srcObject = stream; v.onloadeddata = () => {} })
    }
    function loop() {
      if (!runningRef.current) return
      predict()
      raf = requestAnimationFrame(loop)
    }
    function predict() {
      const rec = gestureRef.current
      const v = videoRef.current
      if (!rec || !v) return
      const now = Date.now()
      const res = rec.recognizeForVideo(v, now)
      draw(res)
      handle(res)
    }
    function draw(res) {
      const c = canvasRef.current
      if (!c) return
      c.width = videoWidth
      c.height = videoHeight
      const ctx = c.getContext('2d')
      ctx.clearRect(0, 0, c.width, c.height)
      if (!res || !res.landmarks) return
      const drawingUtils = new window.DrawingUtils(ctx)
      for (const lm of res.landmarks) {
        drawingUtils.drawConnectors(lm, window.GestureRecognizer.HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 })
        drawingUtils.drawLandmarks(lm, { color: '#FF0000', lineWidth: 1 })
      }
    }
    function map(cat) {
      if (cat === 'Thumb_Up') return 'right'
      if (cat === 'Thumb_Down') return 'left'
      if (cat === 'Open_Palm') return 'palm'
      if (cat === 'Pointing_Up') return 'jump_once'
      return null
    }
    function handle(res) {
      if (!res || !res.gestures || !res.gestures.length) return
      const gobj = res.gestures[0][0]
      const cat = gobj.categoryName
      const mapped = map(cat)
      if (!mapped) return
      if (mapped !== lastRef.current.name) { lastRef.current.name = mapped; lastRef.current.count = 1 } else { lastRef.current.count += 1 }
      if (lastRef.current.count >= minFrames) { if (onGesture) onGesture(mapped); lastRef.current.count = 0 }
    }
    function loadScript(src) { return new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = resolve; s.onerror = reject; document.head.appendChild(s) }) }
    init()
    return () => { runningRef.current = false; if (raf) cancelAnimationFrame(raf); try { const v = videoRef.current; v && v.srcObject && v.srcObject.getTracks().forEach(t => t.stop()) } catch (e) {} }
  }, [onGesture, videoWidth, videoHeight, minFrames])
  return (
    <div style={{ position: 'fixed', right: 8, bottom: 8, width: 160, height: 120, opacity: 0.5, pointerEvents: 'none' }}>
      <video ref={videoRef} autoPlay playsInline muted width={videoWidth} height={videoHeight} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
      <canvas ref={canvasRef} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} />
    </div>
  )
}
