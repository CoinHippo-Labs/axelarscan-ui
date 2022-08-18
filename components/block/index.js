import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'

import Info from './info'
import Events from './events'
import Transactions from '../transactions'
import { getBlock } from '../../lib/api/cosmos'
import { base64ToBech32 } from '../../lib/object/key'

export default () => {
  const { status } = useSelector(state => ({ status: state.status }), shallowEqual)
  const { status_data } = { ...status }

  const router = useRouter()
  const { query } = { ...router }
  const { height } = { ...query }

  const [data, setData] = useState(null)

  useEffect(() => {
    const getData = async () => {
      if (
        height &&
        status_data
      ) {
        const response = await getBlock(height)

        if (response) {
          const {
            latest_block_height,
          } = { ...status_data }
          let {
            validator_addresses,
          } = { ...response }

          const _latest_block_height = Number(height) + 1

          if (latest_block_height >= _latest_block_height) {
            const _response = await getBlock(_latest_block_height)

            const {
              signatures,
            } = { ..._response?.block?.last_commit }

            if (signatures) {
              validator_addresses = signatures
                .filter(s => s?.validator_address)
                .map(s =>
                  base64ToBech32(
                    s.validator_address,
                    process.env.NEXT_PUBLIC_PREFIX_CONSENSUS
                  )
                )
            }
          }

          const block_events_fields = [
            'begin_block_events',
            'end_block_events',
          ]

          for (const field of block_events_fields) {
            if (Array.isArray(response?.[field])) {
              response[field] = Object.entries(
                _.groupBy(
                  response[field],
                  'type',
                )
              ).map(([k, v]) => {
                return {
                  type: _.last(k?.split('.')),
                  data: v?.map(e => {
                    const {
                      attributes,
                    } = { ...e }

                    return Object.fromEntries(
                      attributes?.map(a => {
                        const {
                          key,
                          value,
                        } = { ...a }

                        return [
                          key,
                          value,
                        ]
                      }) || []
                    )
                  })
                }
              })
              .filter(e => e.type && e.data)
            }
          }

          setData({
            ...response,
            validator_addresses,
            height,
          })
        }
      }
    }

    getData()

    return () => clearInterval(
      setInterval(() =>
        getData(),
        5 * 60 * 1000,
      )
    )
  }, [height, status_data])

  return (
    <div className="space-y-8 mt-2 mb-6 mx-auto">
      <div className="space-y-3">
        <Info
          data={
            data?.height === height &&
            { ...data?.block?.header }
          }
        />
        <Transactions />
      </div>
      <Events
        data={
          data?.height === height &&
          data
        }
      />
    </div>
  )
}