import React from 'react'
import './home.css'

export default function Home() {
  return (
    <div>
      <main className="hero">
          <div className="hero-visual">
            <div className="title">SIGNESTURE</div>
          </div>
        <div className="hero-inner">
          <div className="hero-copy">
            <h2 className="hero-h">Two players cooperate to escape a hostile AI facility</h2>
            <p className="hero-p">Player A (Captured) is inside the game world. Player B (Operator) is outside and controls the environment using hand gestures. They must communicate and coordinate to survive.</p>
            <div className="cta-row">
              <a href="/game" className="btn">Play Demo</a>
              <button className="btn ghost">Learn More</button>
            </div>
          </div>
        </div>
      </main>

      <section className="cards">
        <article className="card">
          <h3>Level 1: The Awakening</h3>
          <p>Player A learns movement and interaction while Player B learns marking paths and opening doors.</p>
        </article>
        <article className="card">
          <h3>Level 2: Timing Hall</h3>
          <p>Alternating spike floors require precise freezing of traps and timing to pass.</p>
        </article>
        <article className="card">
          <h3>Level 3: Laser Corridor</h3>
          <p>Rotate obstacles to block beams so Player A can pass.</p>
        </article>
        <article className="card">
          <h3>Final: Core Chamber</h3>
          <p>The AI jams controls; gestures become time-sensitive and collaboration is essential.</p>
        </article>
      </section>

      <section className="features">
        <div className="feature">
          <h4>Interactive</h4>
          <p>Real-time collaboration with gesture-based controls.</p>
        </div>
        <div className="feature">
          <h4>Dynamic</h4>
          <p>AI adapts to actions and player input for emergent challenges.</p>
        </div>
        <div className="feature">
          <h4>Collaborative</h4>
          <p>Players must trust and coordinate to escape together.</p>
        </div>
      </section>

      <div className="footer">
        <p>Signesture — a cooperative gesture-driven escape experience.</p>
      </div>
    </div>
  )
}
