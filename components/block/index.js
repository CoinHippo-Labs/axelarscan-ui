import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'

import Info from './info'
import Transactions from '../transactions'
import { block as getBlock } from '../../lib/api/cosmos'

export default () => {
  const router = useRouter()
  const { query } = { ...router }
  const { height } = { ...query }

  const [block, setBlock] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (height) {
        if (!controller.signal.aborted) {
          const response = await getBlock(height)
          if (response) {
            setBlock({
              data: { ...response.data },
              height,
            })
          }
        }
      }
    }
    getData()
    const interval = setInterval(() => getData(), 5 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [height])

  return (
    <div className="space-y-4 mt-2 mb-6 mx-auto">
      <Info data={block?.height === height && block?.data} />
      <Transactions />
    </div>
  )
}