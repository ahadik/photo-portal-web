import { Routes, Route, Navigate } from 'react-router-dom'
import DeviceApp from '~/routes/DeviceApp'
import AdminApp from '~/routes/AdminApp'

function App() {
  return (
    <Routes>
      <Route path="/device/*" element={<DeviceApp />} />
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="/" element={<Navigate to="/device" replace />} />
    </Routes>
  )
}

export default App
