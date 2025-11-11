import React, { useRef, useEffect } from 'react'
import './dice.css'

export default function Dice({ size = 160, rollTo = null, onRollRequest = null, onRollComplete = null }) {
	const canvasRef = useRef(null)
	const stateRef = useRef({ rx: 0.6, ry: 0.4, rz: 0, vx: 0, vy: 0, vz: 0, animating: false, lastResult: null, animStart: 0, animDur: 0, animFrom: null, animTo: null })

	function shortestAngleDiff(a, b) {
		let d = b - a
		while (d > Math.PI) d -= Math.PI * 2
		while (d < -Math.PI) d += Math.PI * 2
		return d
	}

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

		function computeFaceNormals() {
			const normals = []
			for (let i = 0; i < faces.length; i++) {
				const f = faces[i]
				const a = verts[f[0]]
				const b = verts[f[1]]
				const c = verts[f[2]]
				const ux = b[0] - a[0]; const uy = b[1] - a[1]; const uz = b[2] - a[2]
				const vx = c[0] - a[0]; const vy = c[1] - a[1]; const vz = c[2] - a[2]
				const nx = uy * vz - uz * vy; const ny = uz * vx - ux * vz; const nz = ux * vy - uy * vx
				const nl = Math.hypot(nx, ny, nz) || 1
				normals.push([nx / nl, ny / nl, nz / nl])
			}
			return normals
		}

		const faceNormals = computeFaceNormals()

		function rotationMatrixFromAxisAngle(axis, angle) {
			const [x, y, z] = axis
			const c = Math.cos(angle); const s = Math.sin(angle)
			const t = 1 - c
			return [
				[t * x * x + c, t * x * y - s * z, t * x * z + s * y],
				[t * x * y + s * z, t * y * y + c, t * y * z - s * x],
				[t * x * z - s * y, t * y * z + s * x, t * z * z + c]
			]
		}

		function normalize(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l] }

		function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] }

		function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] }

		function matrixMultiplyVec(m, v) { return [m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2], m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]] }

		function matrixToEulerZYX(R) {
			const r20 = R[2][0]
			const ry = Math.asin(Math.max(-1, Math.min(1, -r20)))
			const cy = Math.cos(ry)
			let rx = 0
			let rz = 0
			if (Math.abs(cy) > 1e-6) {
				rx = Math.atan2(R[2][1], R[2][2])
				rz = Math.atan2(R[1][0], R[0][0])
			} else {
				rx = Math.atan2(-R[0][1], R[1][1])
				rz = 0
			}
			return [rx, ry, rz]
		}

		function rotationFromAToB(a, b) {
			const an = normalize(a)
			const bn = normalize(b)
			const c = dot(an, bn)
			if (c > 0.999999) return [[1,0,0],[0,1,0],[0,0,1]]
			if (c < -0.999999) {
				let axis = cross(an, [1,0,0])
				if (Math.hypot(axis[0], axis[1], axis[2]) < 1e-6) axis = cross(an, [0,1,0])
				axis = normalize(axis)
				return rotationMatrixFromAxisAngle(axis, Math.PI)
			}
			const v = cross(an, bn)
			const s = Math.hypot(v[0], v[1], v[2])
			const k = [[0, -v[2], v[1]],[v[2], 0, -v[0]],[-v[1], v[0], 0]]
			const I = [[1,0,0],[0,1,0],[0,0,1]]
			const k2 = [
				[k[0][0] * k[0][0] + k[0][1] * k[1][0] + k[0][2] * k[2][0], 0,0],[0,0,0],[0,0,0]
			]
			const K = k
			const KK = [
				[K[0][0]*K[0][0] + K[0][1]*K[1][0] + K[0][2]*K[2][0], K[0][0]*K[0][1] + K[0][1]*K[1][1] + K[0][2]*K[2][1], K[0][0]*K[0][2] + K[0][1]*K[1][2] + K[0][2]*K[2][2]],
				[K[1][0]*K[0][0] + K[1][1]*K[1][0] + K[1][2]*K[2][0], K[1][0]*K[0][1] + K[1][1]*K[1][1] + K[1][2]*K[2][1], K[1][0]*K[0][2] + K[1][1]*K[1][2] + K[1][2]*K[2][2]],
				[K[2][0]*K[0][0] + K[2][1]*K[1][0] + K[2][2]*K[2][0], K[2][0]*K[0][1] + K[2][1]*K[1][1] + K[2][2]*K[2][1], K[2][0]*K[0][2] + K[2][1]*K[1][2] + K[2][2]*K[2][2]]
			]
			const cVal = c
			const sVal = s
			const R = [
				[I[0][0] + K[0][0] + (1 / (1 + cVal)) * (K[0][0]*K[0][0] + K[0][1]*K[1][0] + K[0][2]*K[2][0]), I[0][1] + K[0][1] + (1 / (1 + cVal)) * (K[0][0]*K[0][1] + K[0][1]*K[1][1] + K[0][2]*K[2][1]), I[0][2] + K[0][2] + (1 / (1 + cVal)) * (K[0][0]*K[0][2] + K[0][1]*K[1][2] + K[0][2]*K[2][2])],
				[I[1][0] + K[1][0] + (1 / (1 + cVal)) * (K[1][0]*K[0][0] + K[1][1]*K[1][0] + K[1][2]*K[2][0]), I[1][1] + K[1][1] + (1 / (1 + cVal)) * (K[1][0]*K[0][1] + K[1][1]*K[1][1] + K[1][2]*K[2][1]), I[1][2] + K[1][2] + (1 / (1 + cVal)) * (K[1][0]*K[0][2] + K[1][1]*K[1][2] + K[1][2]*K[2][2])],
				[I[2][0] + K[2][0] + (1 / (1 + cVal)) * (K[2][0]*K[0][0] + K[2][1]*K[1][0] + K[2][2]*K[2][0]), I[2][1] + K[2][1] + (1 / (1 + cVal)) * (K[2][0]*K[0][1] + K[2][1]*K[1][1] + K[2][2]*K[2][1]), I[2][2] + K[2][2] + (1 / (1 + cVal)) * (K[2][0]*K[0][2] + K[2][1]*K[1][2] + K[2][2]*K[2][2])]
			]
			return R
		}

		function ease(t) { return 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, t))) }

		function shortestAngleDiff(a, b) {
			let d = b - a
			while (d > Math.PI) d -= Math.PI * 2
			while (d < -Math.PI) d += Math.PI * 2
			return d
		}

		function render() {
			const st = stateRef.current
			const { rx, ry, rz } = st
			const ratio = window.devicePixelRatio || 1
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

			if (!st.animating && st.lastResult) {
				const v = st.lastResult
				ctx.save()
				ctx.fillStyle = 'rgba(0,0,0,0.6)'
				ctx.beginPath()
				ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.18, 0, Math.PI * 2)
				ctx.fill()
				ctx.fillStyle = '#fff'
				ctx.font = `${Math.max(20, Math.floor(size * 0.2))}px sans-serif`
				ctx.textAlign = 'center'
				ctx.textBaseline = 'middle'
				ctx.fillText(v, w / 2, h / 2)
				ctx.restore()
			}
		}

    

			function step() {
				const st = stateRef.current
				const now = performance.now()
				if (st.animating && st.animFrom && st.animTo) {
					const t = Math.max(0, Math.min(1, (now - st.animStart) / st.animDur))
					const e = ease(t)
					const dx = shortestAngleDiff(st.animFrom.rx, st.animTo.rx)
					const dy = shortestAngleDiff(st.animFrom.ry, st.animTo.ry)
					const dz = shortestAngleDiff(st.animFrom.rz, st.animTo.rz)
					st.rx = st.animFrom.rx + dx * e
					st.ry = st.animFrom.ry + dy * e
					st.rz = st.animFrom.rz + dz * e
					if (t >= 1) {
						st.animating = false
						st.lastResult = st.animTo.result
						if (typeof onRollComplete === 'function') onRollComplete(st.lastResult)
					}
				} else {
					st.rx += st.vx
					st.ry += st.vy
					st.rz += st.vz
					st.vx *= 0.985
					st.vy *= 0.985
					st.vz *= 0.985
					if (Math.abs(st.vx) < 0.00001) st.vx = 0
					if (Math.abs(st.vy) < 0.00001) st.vy = 0
					if (Math.abs(st.vz) < 0.00001) st.vz = 0
				}
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
	}, [size, onRollComplete])

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		function onPointerDown() {
			if (typeof onRollRequest === 'function') {
				onRollRequest()
				return
			}
			const stPointer = stateRef.current
			stPointer.vx += (Math.random() * 2 - 1) * 0.25
			stPointer.vy += (Math.random() * 2 - 1) * 0.25
			stPointer.vz += (Math.random() * 2 - 1) * 0.25
		}
		canvas.addEventListener('pointerdown', onPointerDown)
		return () => canvas.removeEventListener('pointerdown', onPointerDown)
	}, [onRollRequest])

	useEffect(() => {
		if (rollTo == null) return
		const stLocal = stateRef.current
		const pad = Math.max(12, Math.round(size * 0.18))
		const d = (1 + Math.sqrt(5)) / 2
		const verts = [
			[-1, d, 0], [1, d, 0], [-1, -d, 0], [1, -d, 0], [0, -1, d], [0, 1, d], [0, -1, -d], [0, 1, -d], [d, 0, -1], [d, 0, 1], [-d, 0, -1], [-d, 0, 1]
		]
		const faces = [
			[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
		]
		function computeFaceNormalsLocal() {
			const normals = []
			for (let i = 0; i < faces.length; i++) {
				const f = faces[i]
				const a = verts[f[0]]
				const b = verts[f[1]]
				const c = verts[f[2]]
				const ux = b[0] - a[0]; const uy = b[1] - a[1]; const uz = b[2] - a[2]
				const vx = c[0] - a[0]; const vy = c[1] - a[1]; const vz = c[2] - a[2]
				const nx = uy * vz - uz * vy; const ny = uz * vx - ux * vz; const nz = ux * vy - uy * vx
				const nl = Math.hypot(nx, ny, nz) || 1
				normals.push([nx / nl, ny / nl, nz / nl])
			}
			return normals
		}
		const faceNormals = computeFaceNormalsLocal()
		const idx = Math.max(0, Math.min(19, rollTo - 1))
		const n = faceNormals[idx]
		const target = [0, 0, -1]
		function normalize(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l] }
		function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] }
		function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] }
		function rotationMatrixFromAxisAngle(axis, angle) {
			const [x, y, z] = axis
			const c = Math.cos(angle); const s = Math.sin(angle)
			const t = 1 - c
			return [
				[t * x * x + c, t * x * y - s * z, t * x * z + s * y],
				[t * x * y + s * z, t * y * y + c, t * y * z - s * x],
				[t * x * z - s * y, t * y * z + s * x, t * z * z + c]
			]
		}
		function rotationFromAToB(a, b) {
			const an = normalize(a)
			const bn = normalize(b)
			const c = dot(an, bn)
			if (c > 0.999999) return [[1,0,0],[0,1,0],[0,0,1]]
			if (c < -0.999999) {
				let axis = cross(an, [1,0,0])
				if (Math.hypot(axis[0], axis[1], axis[2]) < 1e-6) axis = cross(an, [0,1,0])
				const axn = normalize(axis)
				return rotationMatrixFromAxisAngle(axn, Math.PI)
			}
			const v = cross(an, bn)
			const s = Math.hypot(v[0], v[1], v[2])
			const K = [[0, -v[2], v[1]],[v[2], 0, -v[0]],[-v[1], v[0], 0]]
			const cVal = c
			const R = [
				[1 + K[0][0] + (1 / (1 + cVal)) * (K[0][0]*K[0][0] + K[0][1]*K[1][0] + K[0][2]*K[2][0]), K[0][1] + (1 / (1 + cVal)) * (K[0][0]*K[0][1] + K[0][1]*K[1][1] + K[0][2]*K[2][1]), K[0][2] + (1 / (1 + cVal)) * (K[0][0]*K[0][2] + K[0][1]*K[1][2] + K[0][2]*K[2][2])],
				[K[1][0] + (1 / (1 + cVal)) * (K[1][0]*K[0][0] + K[1][1]*K[1][0] + K[1][2]*K[2][0]), 1 + K[1][1] + (1 / (1 + cVal)) * (K[1][0]*K[0][1] + K[1][1]*K[1][1] + K[1][2]*K[2][1]), K[1][2] + (1 / (1 + cVal)) * (K[1][0]*K[0][2] + K[1][1]*K[1][2] + K[1][2]*K[2][2])],
				[K[2][0] + (1 / (1 + cVal)) * (K[2][0]*K[0][0] + K[2][1]*K[1][0] + K[2][2]*K[2][0]), K[2][1] + (1 / (1 + cVal)) * (K[2][0]*K[0][1] + K[2][1]*K[1][1] + K[2][2]*K[2][1]), 1 + K[2][2] + (1 / (1 + cVal)) * (K[2][0]*K[0][2] + K[2][1]*K[1][2] + K[2][2]*K[2][2])]
			]
			return R
		}
		function matrixToEulerZYX(R) {
			const r20 = R[2][0]
			const ry = Math.asin(Math.max(-1, Math.min(1, -r20)))
			const cy = Math.cos(ry)
			let rx = 0
			let rz = 0
			if (Math.abs(cy) > 1e-6) {
				rx = Math.atan2(R[2][1], R[2][2])
				rz = Math.atan2(R[1][0], R[0][0])
			} else {
				rx = Math.atan2(-R[0][1], R[1][1])
				rz = 0
			}
			return [rx, ry, rz]
		}

		const R = rotationFromAToB(n, target)
		const [trx, try_, trz] = matrixToEulerZYX(R)
		const cur = { rx: stLocal.rx, ry: stLocal.ry, rz: stLocal.rz }
		const dx = shortestAngleDiff(cur.rx, trx)
		const dy = shortestAngleDiff(cur.ry, try_)
		const dz = shortestAngleDiff(cur.rz, trz)
		const spins = 2 + Math.floor(Math.random() * 4)
		const sgn = x => x === 0 ? (Math.random() < 0.5 ? 1 : -1) : (x > 0 ? 1 : -1)
		const trxTarget = cur.rx + dx + sgn(dx) * spins * Math.PI * 2
		const tryTarget = cur.ry + dy + sgn(dy) * spins * Math.PI * 2
		const trzTarget = cur.rz + dz + sgn(dz) * spins * Math.PI * 2
		stLocal.animating = true
		stLocal.animStart = performance.now()
		stLocal.animDur = 1000 + spins * 450
		stLocal.animFrom = { rx: cur.rx, ry: cur.ry, rz: cur.rz }
		stLocal.animTo = { rx: trxTarget, ry: tryTarget, rz: trzTarget, result: rollTo }
	}, [rollTo, size])

	return (
		<div style={{ width: size, height: size, display: 'inline-block', overflow: 'visible' }}>
			<canvas ref={canvasRef} style={{ display: 'block', touchAction: 'none', cursor: 'pointer', background: 'transparent', border: 'none', borderRadius: 0 }} />
		</div>
	)
}
