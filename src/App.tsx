import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'

// Lazy load calculator pages for code splitting
// Each page will be in its own chunk, loaded only when visited
const Home = lazy(() => import('./pages/Home'))
const HashrateHeating = lazy(() => import('./pages/HashrateHeating'))
const SolarMonetization = lazy(() => import('./pages/SolarMonetization'))

// Loading fallback for lazy-loaded pages
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-surface-600 dark:text-surface-400 text-sm">Loading...</span>
      </div>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={
          <Suspense fallback={<PageLoader />}>
            <Home />
          </Suspense>
        } />
        <Route path="hashrate" element={
          <Suspense fallback={<PageLoader />}>
            <HashrateHeating />
          </Suspense>
        } />
        <Route path="solar" element={
          <Suspense fallback={<PageLoader />}>
            <SolarMonetization />
          </Suspense>
        } />
      </Route>
    </Routes>
  )
}

export default App
