import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import HashrateHeating from './pages/HashrateHeating'
import SolarMonetization from './pages/SolarMonetization'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="hashrate" element={<HashrateHeating />} />
        <Route path="solar" element={<SolarMonetization />} />
      </Route>
    </Routes>
  )
}

export default App
