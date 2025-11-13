import React, { useEffect, useRef } from 'react'

export default function Game() {
  const containerRef = useRef(null)

  useEffect(() => {
    const scripts = [
      'data/l_New_Layer_1.js',
      'data/l_New_Layer_2.js',
      'data/l_New_Layer_8.js',
      'data/l_Back_Tiles.js',
      'data/l_Decorations.js',
      'data/l_Front_Tiles.js',
      'data/l_Shrooms.js',
      'data/l_Collisions.js',
      'data/l_Grass.js',
      'data/l_Trees.js',
      'data/l_Gems.js',
      'data/collisions.js',
      'js/utils.js',
      'classes/CollisionBlock.js',
      'classes/Platform.js',
      'classes/Player.js',
      'classes/Oposum.js',
      'classes/Eagle.js',
      'classes/Sprite.js',
      'classes/Heart.js',
      'js/index.js',
      'js/eventListeners.js'
    ]
    const base = '/@fs/Users/siddhantdubey/Documents/Signesture/src/components/sunnyland-platformer/'
    scripts.forEach(src => {
      const tag = document.createElement('script')
      tag.src = base + src
      tag.async = false
      containerRef.current.appendChild(tag)
    })
  }, [])

  return (
    <div ref={containerRef} style={{ background: 'black', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0;border:0;font:inherit;vertical-align:baseline}body{background:black;margin:0}canvas{width:1024px;height:576px}`}</style>
      <canvas width={1024} height={576} style={{ imageRendering: 'pixelated' }}></canvas>
      <p style={{ color: 'white', fontFamily: 'sans-serif', margin: '8px' }}>WASD to move, Spacebar to roll / attack</p>
    </div>
  )
}
