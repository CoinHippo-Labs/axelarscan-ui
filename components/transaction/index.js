import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import Info from './info'
import Logs from './logs'
import { transaction as getTransaction } from '../../lib/api/cosmos'

export default () => {
  const { assets } = useSelector(state => ({ assets: state.assets }), shallowEqual)
  const { assets_data } = { ...assets }

  const router = useRouter()
  const { query } = { ...router }
  const { tx } = { ...query }

  const [transaction, setTransaction] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (tx && assets_data) {
        if (!controller.signal.aborted) {
          const response = await getTransaction(tx, null, assets_data)
          if (response) {
            setTransaction({
              data: { ...response.data },
              tx,
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
  }, [tx, assets_data])

  return (
    <div className="space-y-4 mt-2 mb-6 mx-auto">
      <Info data={transaction?.tx === tx && transaction?.data} />
      <Logs data={transaction?.tx === tx && transaction?.data} />
    </div>
  )
}