import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import Info from './info'
import Logs from './logs'
import { transfers as getTransfers } from '../../lib/api/index'

export default () => {
  const { preferences, evm_chains, cosmos_chains, assets } = useSelector(state => ({ preferences: state.preferences, evm_chains: state.evm_chains, cosmos_chains: state.cosmos_chains, assets: state.assets }), shallowEqual)
  const { theme } = { ...preferences }
  const { evm_chains_data } = { ...evm_chains }
  const { cosmos_chains_data } = { ...cosmos_chains }
  const { assets_data } = { ...assets }

  const router = useRouter()
  const { query } = { ...router }
  const { tx } = { ...query }

  const [data, setData] = useState(null)

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