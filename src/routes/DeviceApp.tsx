import { Routes, Route } from 'react-router-dom'

function DeviceApp() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Routes>
        <Route path="/" element={<div>Device App - Coming Soon</div>} />
      </Routes>
    </div>
  )
}

export default DeviceApp
