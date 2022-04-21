import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import StackGrid from 'react-stack-grid'
import _ from 'lodash'
import moment from 'moment'
import Loader from 'react-loader-spinner'
import { BiServer } from 'react-icons/bi'

import Widget from '../widget'

import { historical } from '../../lib/api/opensearch'
import { block as getBlock } from '../../lib/api/cosmos'
import { numberFormat } from '../../lib/utils'

const snapshot_block_size = Number(process.env.NEXT_PUBLIC_SNAPSHOT_BLOCK_SIZE)

export default function Snapshots({ n = 100 }) {
  const { preferences, status } = useSelector(state => ({ preferences: state.preferences, status: state.status }), shallowEqual)
  const { theme } = { ...preferences }
  const { status_data } = { ...status }

  const [snapshots, setSnapshots] = useState(null)
  const [timer, setTimer] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    const getData = async is_interval => {
      if (status_data && (!snapshots || !status_data.is_interval || is_interval)) {
        if (!controller.signal.aborted) {
          const latestBlock = Number(status_data.latest_block_height)
          const snapshot_block = latestBlock - (latestBlock % snapshot_block_size)
          let response

          if (latestBlock >= snapshot_block_size) {
            response = await historical({
              aggs: {
                historical: {
                  terms: { field: 'snapshot_block', size: n },
                },
              },
              query: {
                bool: {
                  must: [
                    { range: { snapshot_block: { gte: snapshot_block - (n * snapshot_block_size) + 1, lte: snapshot_block } } },
                  ],
                },
              },
            })
          }

          let data = _.orderBy(Object.entries(response?.data || {}).map(([key, value], i) => {
            return {
              snapshot_block: Number(key),
              num_validators: value,
              time: snapshots?.data?.find(s => s.snapshot_block === Number(key))?.time,
            }
          }), ['snapshot_block'], ['desc'])

          while (!(data[0]?.snapshot_block >= latestBlock)) {
            data = _.concat({ snapshot_block: (data[0]?.snapshot_block || 0) + snapshot_block_size, processing: !((data[0]?.snapshot_block || 0) + snapshot_block_size >= latestBlock) ? true : undefined }, data)
          }

          setSnapshots({ data })

          for (let i = 0; i < data.length; i++) {
              const snapshot = data[i]

              if (snapshot?.snapshot_block < latestBlock && !snapshot?.time) {
                const _response = await getBlock(snapshot?.snapshot_block)

                snapshot.time = _response?.data?.time ? moment(_response.data.time).valueOf() : 'N/A'

                data[i] = snapshot

                setSnapshots({ data })
              }
          }
        }
      }
    }

    getData()

    const interval = setInterval(() => getData(true), 5 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [status_data])

  useEffect(() => {
    const run = async () => setTimer(moment().unix())
    if (!timer) {
      run()
    }
    const interval = setInterval(() => run(), 0.5 * 1000)
    return () => clearInterval(interval)
  }, [timer])

  const latestBlock = status_data && Number(status_data.latest_block_height)

  const widgets = (snapshots ?
    snapshots.data.map((snapshot, i) => { return { ...snapshot, i } })
    :
    [...Array(20).keys()].map(i => { return { i, skeleton: true } })
  ).map((snapshot, i) => (
    <Widget
      key={i}
      className={`${!latestBlock || (snapshot.snapshot_block <= latestBlock && !snapshot.processing) ? '' : 'bg-gray-100 dark:bg-gray-800'} dark:border-gray-900 shadow-xl mt-4 sm:mt-0`}
    >
      {!snapshot.skeleton ?
        <div className="flex flex-col">
          <div className="flex items-center text-gray-400 dark:text-gray-600">
            <span className="capitalize text-sm">Snapshot Block</span>
            {typeof snapshot?.num_validators === 'number' ?
              <span className="flex items-center text-gray-400 dark:text-gray-600 text-xs space-x-1 ml-auto">
                <span>{numberFormat(snapshot.num_validators, '0,0')}</span>
                <BiServer size={16} className="stroke-current" className="mb-0.5" />
              </span>
              :
              snapshot.processing ?
                <Loader type="BallTriangle" color={theme === 'dark' ? 'white' : '#3B82F6'} width="20" height="20" className="ml-auto" />
                :
                null
            }
          </div>
          <div className="font-mono text-3xl font-semibold text-center my-2">
            {numberFormat(snapshot.snapshot_block, '0,0')}
          </div>
          <div className="text-gray-400 dark:text-gray-600 text-xs text-center">
            {snapshot.snapshot_block > latestBlock ?
              <div className="space-x-1">
                <span>the next snapshot in</span>
                <span className="text-gray-900 dark:text-white">{numberFormat(snapshot.snapshot_block - latestBlock, '0,0')}</span>
                <span>block{snapshot.snapshot_block - latestBlock > 1 ? 's' : ''}</span>
              </div>
              :
              <div className="flex items-center justify-center space-x-1">
                <span className="font-medium">Block Time:</span>
                {typeof snapshot.time === 'number' ?
                  <span>{moment(snapshot.time).format('MMM D, YYYY h:mm:ss A z')}</span>
                  :
                  snapshot.time ?
                    <span>{snapshot.time}</span>
                    :
                    <div className="skeleton w-32 h-4" />
                }
              </div>
            }
          </div>
        </div>
        :
        <div className="flex flex-col">
          <div className="flex items-center">
            <div className="skeleton w-24 h-4" />
            <div className="skeleton w-12 h-4 ml-auto" />
          </div>
          <div className="skeleton w-32 h-8 my-4 mx-auto" />
          <div className="skeleton w-40 h-4 mx-auto" />
        </div>}
    </Widget>
  )).map((widget, i) => (
    snapshots?.data?.[i]?.time && !snapshots?.data?.[i]?.processing ?
      <Link key={i} href={`/validators/snapshot/${snapshots.data[i].snapshot_block}`}>
        <a>
          {widget}
        </a>
      </Link>
      :
      <div key={i}>
        {widget}
      </div>
  ))

  return (
    <div className="my-2 sm:my-4">
      <StackGrid
        columnWidth={336}
        gutterWidth={12}
        gutterHeight={12}
        className="hidden sm:block"
      >
        {widgets}
      </StackGrid>
      <div className="block sm:hidden space-y-3">
        {widgets}
      </div>
    </div>
  )
}