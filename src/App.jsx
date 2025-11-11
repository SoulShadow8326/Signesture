import './App.css'
import Dice from './components/dice'

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/home'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/dice"
          element={
            <div style={{ marginTop: 20, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
              <Dice size={240} />
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
