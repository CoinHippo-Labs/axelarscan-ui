import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default () => {
  const router = useRouter()
  const { pathname } = { ...router }

  useEffect(() => {
    router.push(`${pathname}/search`)
  }, [])

  return null
}