import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import HashrateHeating from './pages/HashrateHeating'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="hashrate" element={<HashrateHeating />} />
      </Route>
    </Routes>
  )
}

export default App
