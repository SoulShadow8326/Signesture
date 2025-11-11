import React, { useRef, useEffect } from 'react'
import './dice.css'

export default function Dice({ size = 160 }) {
	const canvasRef = useRef(null)
	const stateRef = useRef({ rx: 0.6, ry: 0.4, rz: 0, vx: 0, vy: 0, vz: 0 })

		useEffect(() => {
		const canvas = canvasRef.current
		const ctx = canvas.getContext('2d')
		let raf = null

		const d = (1 + Math.sqrt(5)) / 2
		const verts = [
			[-1, d, 0], [1, d, 0], [-1, -d, 0], [1, -d, 0], [0, -1, d], [0, 1, d], [0, -1, -d], [0, 1, -d], [d, 0, -1], [d, 0, 1], [-d, 0, -1], [-d, 0, 1]
		]
		const faces = [
			[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
		]
		const faceNumbers = Array.from({ length: 20 }, (_, i) => i + 1)

		function resize() {
				const ratio = window.devicePixelRatio || 1
				const pad = Math.max(12, Math.round(size * 0.18))
				canvas.width = (size + pad * 2) * ratio
				canvas.height = (size + pad * 2) * ratio
				canvas.style.width = `${size}px`
				canvas.style.height = `${size}px`
				ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
		}

		function rotateVertex(v, rx, ry, rz) {
			let [x, y, z] = v
			let c = Math.cos(rx); let s = Math.sin(rx)
			let y1 = y * c - z * s; let z1 = y * s + z * c; y = y1; z = z1
			c = Math.cos(ry); s = Math.sin(ry)
			let x1 = x * c + z * s; z1 = -x * s + z * c; x = x1; z = z1
			c = Math.cos(rz); s = Math.sin(rz)
			let x2 = x * c - y * s; let y2 = x * s + y * c; x = x2; y = y2
			return [x, y, z]
		}

		function project(v, w, h, scale, fov = 400) {
			const [x, y, z] = v
			const zf = fov / (fov + z)
			return [w / 2 + x * scale * zf, h / 2 - y * scale * zf, z]
		}

		function render() {
			const { rx, ry, rz } = stateRef.current
			const ratio = window.devicePixelRatio || 1
			const pad = Math.max(16, Math.round(size * 0.22))
			const w = canvas.width / ratio
			const h = canvas.height / ratio
			ctx.clearRect(0, 0, w, h)
			const scale = Math.min(size, size) * 0.26

			const transformed = verts.map(v => rotateVertex(v, rx, ry, rz))

			const light = [0.5, 0.8, 0.3]

			const faceData = faces.map((f, i) => {
				const a = transformed[f[0]]
				const b = transformed[f[1]]
				const c = transformed[f[2]]
				const ux = b[0] - a[0]
				const uy = b[1] - a[1]
				const uz = b[2] - a[2]
				const vx = c[0] - a[0]
				const vy = c[1] - a[1]
				const vz = c[2] - a[2]
				const nx = uy * vz - uz * vy
				const ny = uz * vx - ux * vz
				const nz = ux * vy - uy * vx
				const nl = Math.hypot(nx, ny, nz) || 1
				const normal = [nx / nl, ny / nl, nz / nl]
				const lightIntensity = Math.max(0, normal[0] * light[0] + normal[1] * light[1] + normal[2] * light[2])
				const pa = project(a, w, h, scale)
				const pb = project(b, w, h, scale)
				const pc = project(c, w, h, scale)
				const depth = (pa[2] + pb[2] + pc[2]) / 3
				return { i, pa, pb, pc, depth, lightIntensity }
			})

			faceData.sort((x, y) => y.depth - x.depth)

					faceData.forEach(fd => {
						const shade = Math.floor(40 + fd.lightIntensity * 160)
				ctx.beginPath()
				ctx.moveTo(fd.pa[0], fd.pa[1])
				ctx.lineTo(fd.pb[0], fd.pb[1])
				ctx.lineTo(fd.pc[0], fd.pc[1])
				ctx.closePath()
				ctx.fillStyle = `rgb(${shade},${shade},${shade})`
				ctx.fill()
						ctx.strokeStyle = 'rgba(0,0,0,0.6)'
						ctx.lineWidth = Math.max(1, 1 / (ratio || 1))
				ctx.stroke()
				const cx = (fd.pa[0] + fd.pb[0] + fd.pc[0]) / 3
				const cy = (fd.pa[1] + fd.pb[1] + fd.pc[1]) / 3
				ctx.fillStyle = fd.lightIntensity > 0.45 ? '#111' : '#fff'
		ctx.font = `${Math.max(10, Math.floor(size * 0.08))}px sans-serif`
				ctx.textAlign = 'center'
				ctx.textBaseline = 'middle'
				ctx.fillText(faceNumbers[fd.i], cx, cy)
			})
		}

		function step() {
			const s = stateRef.current
			s.rx += s.vx
			s.ry += s.vy
			s.rz += s.vz
			s.vx *= 0.985
			s.vy *= 0.985
			s.vz *= 0.985
			if (Math.abs(s.vx) < 0.00001) s.vx = 0
			if (Math.abs(s.vy) < 0.00001) s.vy = 0
			if (Math.abs(s.vz) < 0.00001) s.vz = 0
			render()
			raf = requestAnimationFrame(step)
		}

		resize()
		window.addEventListener('resize', resize)
		raf = requestAnimationFrame(step)

		return () => {
			window.removeEventListener('resize', resize)
			cancelAnimationFrame(raf)
		}
	}, [size])

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		function onPointerDown() {
			const s = stateRef.current
			s.vx += (Math.random() * 2 - 1) * 0.25
			s.vy += (Math.random() * 2 - 1) * 0.25
			s.vz += (Math.random() * 2 - 1) * 0.25
		}
		canvas.addEventListener('pointerdown', onPointerDown)
		return () => canvas.removeEventListener('pointerdown', onPointerDown)
	}, [])

		return (
			<div style={{ width: size, height: size, display: 'inline-block', overflow: 'visible' }}>
				<canvas ref={canvasRef} style={{ display: 'block', touchAction: 'none', cursor: 'pointer', background: 'transparent', border: 'none', borderRadius: 0 }} />
			</div>
		)
}
