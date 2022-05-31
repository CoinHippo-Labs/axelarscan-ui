import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { TailSpin, ThreeDots } from 'react-loader-spinner'

import Datatable from '../datatable'
import ValidatorProfile from '../validator-profile'
import Copy from '../copy'
import TimeAgo from '../time-ago'
import { blocks as getBlocks } from '../../lib/api/index'
import { number_format, ellipse, equals_ignore_case, loader_color } from '../../lib/utils'

const LIMIT = 100

export default ({ n }) => {
  const { preferences, assets, validators } = useSelector(state => ({ preferences: state.preferences, assets: state.assets, validators: state.validators }), shallowEqual)
  const { theme } = { ...preferences }
  const { assets_data } = { ...assets }
  const { validators_data } = { ...validators }
  
  const [data, setData] = useState(null)
  const [offset, setOffet] = useState(0)
  const [fetchTrigger, setFetchTrigger] = useState(null)
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    const triggering = is_interval => {
      setFetchTrigger(is_interval ? moment().valueOf() : typeof fetchTrigger === 'number' ? null : 0)
    }
    triggering()
    const interval = setInterval(() => triggering(true), 0.1 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (!controller.signal.aborted) {
        setFetching(true)
        if (!fetchTrigger) {
          setData(null)
          setOffet(0)
        }
        const _data = !fetchTrigger ? [] : (data || []),
          size = n || LIMIT
        const from = fetchTrigger === 'true' || fetchTrigger === 1 ? _data.length : 0
        let response = await getBlocks({
          size,
          from,
          sort: [{ height: 'desc' }],
        })
        if (response) {
          response = _.orderBy(_.uniqBy(_.concat(_data, response?.data || []), 'height'), ['height'], ['desc'])
          setData(response)
        }
        else if (!fetchTrigger) {
          setData([])
        }
        setFetching(false)
      }
    }
    getData()
    return () => {
      controller?.abort()
    }
  }, [fetchTrigger])

  return (
    data ?
      <div className="min-h-full grid gap-2">
        <Datatable
          columns={[
            {
              Header: 'Height',
              accessor: 'height',
              disableSortBy: true,
              Cell: props => (
                <Link href={`/block/${props.value}`}>
                  <a className="text-blue-600 dark:text-white font-bold">
                    {number_format(props.value, '0,0')}
                  </a>
                </Link>
              ),
            },
            {
              Header: 'Block Hash',
              accessor: 'hash',
              disableSortBy: true,
              Cell: props => (
                <Link href={`/block/${props.row.original.height}`}>
                  <a className="uppercase text-slate-400 dark:text-slate-600 font-medium">
                    {ellipse(props.value, n ? 6 : 10)}
                  </a>
                </Link>
              ),
            },
            {
              Header: 'Proposer',
              accessor: 'proposer_address',
              disableSortBy: true,
              Cell: props => (
                props.row.original.operator_address ?
                  <div className={`min-w-max flex items-${props.row.original.validator_description?.moniker ? 'start' : 'center'} space-x-2`}>
                    <Link href={`/validator/${props.row.original.operator_address}`}>
                      <a>
                        <ValidatorProfile validator_description={props.row.original.validator_description} />
                      </a>
                    </Link>
                    <div className="flex flex-col">
                      {props.row.original.validator_description?.moniker && (
                        <Link href={`/validator/${props.row.original.operator_address}`}>
                          <a className="text-blue-600 dark:text-white font-bold">
                            {ellipse(props.row.original.validator_description.moniker, 12)}
                          </a>
                        </Link>
                      )}
                      <div className="flex items-center space-x-1">
                        <Link href={`/validator/${props.row.original.operator_address}`}>
                          <a className="text-slate-400 dark:text-slate-600 font-medium">
                            {ellipse(props.row.original.operator_address, 6, process.env.NEXT_PUBLIC_PREFIX_VALIDATOR)}
                          </a>
                        </Link>
                        <Copy value={props.row.original.operator_address} />
                      </div>
                    </div>
                  </div>
                  :
                  <Copy
                    value={props.value}
                    title={<span className="cursor-pointer text-slate-400 dark:text-slate-600 font-semibold">
                      {ellipse(props.value, 8, process.env.NEXT_PUBLIC_PREFIX_CONSENSUS)}
                    </span>}
                    size={18}
                  />
              ),
            },
            {
              Header: 'TXs',
              accessor: 'num_txs',
              disableSortBy: true,
              Cell: props => (
                <div className="text-right">
                  <span className="font-mono font-semibold">
                    {props.value > -1 ?
                      number_format(props.value, '0,0') : '-'
                    }
                  </span>
                </div>
              ),
              headerClassName: 'justify-end text-right',
            },
            {
              Header: 'Time',
              accessor: 'time',
              disableSortBy: true,
              Cell: props => (
                <TimeAgo
                  time={props.value}
                  title={`Block: ${number_format(props.row.original.height, '0,0')}`}
                  className="ml-auto"
                />
              ),
              headerClassName: 'justify-end text-right',
            },
          ]}
          data={data.filter((d, i) => !n || i < n).map((d, i) => {
            const validator_data = validators_data?.find(v => equals_ignore_case(v?.consensus_address, d?.proposer_address))
            const { operator_address, description } = { ...validator_data }
            return {
              ...d,
              operator_address,
              validator_description: description,
            }
          })}
          noPagination={true}
          defaultPageSize={100}
          className="min-h-full no-border"
        />
        {data.length > 0 && !n && (
          !fetching ?
            <button
              onClick={() => {
                setOffet(data.length)
                setFetchTrigger(typeof fetchTrigger === 'number' ? true : 1)
              }}
              className="max-w-min hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg whitespace-nowrap font-medium hover:font-bold mx-auto py-1.5 px-2.5"
            >
              Load more
            </button>
            :
            <div className="flex justify-center p-1.5">
              <ThreeDots color={loader_color(theme)} width="24" height="24" />
            </div>
        )}
      </div>
      :
      <TailSpin color={loader_color(theme)} width="32" height="32" />
  )
}