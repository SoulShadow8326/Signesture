
import React, { useEffect, useState } from 'react'
import Platformer from '../components/platformer'

export default function Game() {
  const [size, setSize] = useState({ w: typeof window !== 'undefined' ? window.innerWidth : 800, h: typeof window !== 'undefined' ? window.innerHeight : 600 })

  useEffect(() => {
    function onResize() {
      setSize({ w: window.innerWidth, h: window.innerHeight })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', margin: 0 }}>
      <Platformer width={size.w} height={size.h} />
    </div>
  )
}
