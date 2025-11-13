import React from 'react'

export default function GameRoute() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <iframe
        src="/sunnyland-platformer/index.html"
        title="Signesture"
        allow="camera; microphone; fullscreen; autoplay; clipboard-read; clipboard-write"
        sandbox="allow-same-origin allow-scripts allow-pointer-lock allow-forms allow-popups"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
      />
    </div>
  )
}
