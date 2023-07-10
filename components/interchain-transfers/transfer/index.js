import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'

import Info from './info'
import Details from './details'
import Spinner from '../../spinner'
import { searchTransfers } from '../../../lib/api/transfers'
import { toArray, equalsIgnoreCase } from '../../../lib/utils'

export default () => {
  const { assets } = useSelector(state => ({ assets: state.assets }), shallowEqual)
  const { assets_data } = { ...assets }

  const router = useRouter()
  const { query } = { ...router }
  const { tx, transfer_id } = { ...query }

  const [data, setData] = useState(null)

  useEffect(
    () => {
      const getData = async () => {
        if (tx && assets_data && !(matched && ['received', 'failed'].includes(data.simplified_status))) {
          const response = await searchTransfers({ txHash: tx, size: 1 })
          const _data = _.head(response?.data)
          console.log('[data]', _data)
          setData(_data)
        }
        else if (transfer_id) {
          const response = await searchTransfers({ transferId: transfer_id, size: 1 })
          const { send } = { ..._.head(response?.data) }
          const { txhash } = { ...send }
          if (txhash) {
            router.push(`/transfer/${txhash}`)
          }
          else {
            setData({})
          }
        }
      }

      getData()
      const interval = setInterval(() => getData(), 0.5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [tx, transfer_id, assets_data],
  )

  const matched = toArray([data?.send?.txhash, data?.wrap?.txhash, data?.erc20_transfer?.txhash]).findIndex(h => equalsIgnoreCase(tx, h)) > -1

  return (
    <div className="children px-3">
      {data && matched ?
        <div className="max-w-6xl space-y-4 sm:space-y-6 pt-6 sm:pt-8 mx-auto">
          {!tx ?
            <span className="text-slate-400 dark:text-slate-500 text-base">
              Transaction not found
            </span> :
            <>
              <Info data={data} />
              <Details data={data} />
            </>
          }
        </div> :
        <div className="loading">
          <Spinner name="Blocks" />
        </div>
      }
    </div>
  )
}