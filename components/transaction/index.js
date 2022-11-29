import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import Info from './info'
import Data from './data'
import { getTransaction } from '../../lib/api/lcd'

export default () => {
  const {
    assets,
  } = useSelector(state =>
    (
      {
        assets: state.assets,
      }
    ),
    shallowEqual,
  )
  const {
    assets_data,
  } = { ...assets }

  const router = useRouter()
  const {
    query,
  } = { ...router }
  const {
    tx,
  } = { ...query }

  const [data, setData] = useState(null)

  useEffect(
    () => {
      const getData = async () => {
        if (
          tx &&
          assets_data
        ) {
          const response =
            await getTransaction(
              tx,
              null,
              assets_data,
            )

          if (response) {
            setData(
              {
                data: response,
                tx,
              }
            )
          }
        }
      }

      getData()

      const interval =
        setInterval(() =>
          getData(),
          5 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [tx, assets_data],
  )

  const matched = data?.tx === tx

  const _data = data?.data

  return (
    <div className="space-y-8 mt-2 mb-6 mx-auto">
      <Info
        data={
          matched &&
          _data
        }
      />
      <Data
        data={
          matched &&
          _data
        }
      />
    </div>
  )
}