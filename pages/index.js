import { useRouter } from 'next/router'

import Dashboard from '../components/dashboard'

import { isMatchRoute } from '../lib/routes'

export default function Index() {
  const router = useRouter()
  const { pathname, asPath } = { ...router }
  const _asPath = asPath.includes('?') ? asPath.substring(0, asPath.indexOf('?')) : asPath

  if (typeof window !== 'undefined' && pathname !== _asPath) {
    router.push(isMatchRoute(_asPath) ? asPath : '/')
  }

  if (typeof window === 'undefined' || pathname !== _asPath) {
    return (
      <span className="min-h-screen" />
    )
  }

  return (
    <>
      <div className="max-w-8xl mx-auto">
        <Dashboard />
      </div>
      <div className="hidden dark:bg-black bg-yellow-500 h-full h-5/6" />
    </>
  )
}