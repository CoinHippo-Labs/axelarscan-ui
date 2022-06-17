import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import Info from './info'
import Transactions from '../transactions'
import { block as getBlock } from '../../lib/api/cosmos'
import { base64ToBech32 } from '../../lib/object/key'

export default () => {
  const { status } = useSelector(state => ({ status: state.status }), shallowEqual)
  const { status_data } = { ...status }

  const router = useRouter()
  const { query } = { ...router }
  const { height } = { ...query }

  const [block, setBlock] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (height && status_data) {
        if (!controller.signal.aborted) {
          const response = await getBlock(height)
          if (response?.data) {
            const { latest_block_height } = { ...status_data }
            if (latest_block_height >= Number(height) + 1) {
              const _response = await getBlock(Number(height) + 1, undefined, true)
              if (_response?.data) {
                response.data.validator_addresses = _response.data.block?.last_commit?.signatures?.filter(s => s?.validator_address).map(s => base64ToBech32(s.validator_address, process.env.NEXT_PUBLIC_PREFIX_CONSENSUS))
              }
            }
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
  }, [height, status_data])

  return (
    <div className="space-y-4 mt-2 mb-6 mx-auto">
      <Info data={block?.height === height && block?.data} />
      <Transactions />
    </div>
  )
}