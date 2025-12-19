import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import HashrateHeating from './pages/HashrateHeating'
// Hidden for now - Phase 2+
// import SolarMonetization from './pages/SolarMonetization'
// import HeatPlusSolar from './pages/HeatPlusSolar'
// import ExergyAudit from './pages/ExergyAudit'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="hashrate" element={<HashrateHeating />} />
        {/* Hidden for now - Phase 2+ */}
        {/* <Route path="solar" element={<SolarMonetization />} /> */}
        {/* <Route path="combined" element={<HeatPlusSolar />} /> */}
        {/* <Route path="audit" element={<ExergyAudit />} /> */}
      </Route>
    </Routes>
  )
}

export default App
