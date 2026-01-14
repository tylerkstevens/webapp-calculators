import { lazy, Suspense, ComponentType } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'

// Lazy load calculator pages for code splitting
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

// Wrapper for lazy-loaded route components
function LazyRoute({ component: Component }: { component: ComponentType }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<LazyRoute component={Home} />} />
        <Route path="hashrate" element={<LazyRoute component={HashrateHeating} />} />
        <Route path="solar" element={<LazyRoute component={SolarMonetization} />} />
      </Route>
    </Routes>
  )
}

export default App
