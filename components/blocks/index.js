import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { BsArrowRightShort } from 'react-icons/bs'

import Filters from './filters'
import Spinner from '../spinner'
import Datatable from '../datatable'
import NumberDisplay from '../number'
import Copy from '../copy'
import ValidatorProfile from '../profile/validator'
import AccountProfile from '../profile/account'
import TimeAgo from '../time/timeAgo'
import { searchBlocks } from '../../lib/api/axelar'
import { toArray, ellipse, equalsIgnoreCase, getQueryParams } from '../../lib/utils'

const PAGE_SIZE = 50

export default ({ n }) => {
  const { validators } = useSelector(state => ({ validators: state.validators }), shallowEqual)
  const { validators_data } = { ...validators }

  const router = useRouter()
  const { pathname, asPath, query } = { ...router }

  const [data, setData] = useState(null)
  const [total, setTotal] = useState(null)
  const [offset, setOffset] = useState(0)
  const [filters, setFilters] = useState(null)
  const [fetchTrigger, setFetchTrigger] = useState(null)
  const [fetching, setFetching] = useState(false)

  useEffect(
    () => {
      if (asPath) {
        setFilters({ ...getQueryParams(asPath) })
      }
    },
    [asPath],
  )

  useEffect(
    () => {
      const trigger = is_interval => {
        if (pathname && filters) {
          setFetchTrigger(is_interval ? moment().valueOf() : typeof fetchTrigger === 'number' ? null : 0)
        }
      }

      trigger()
      const interval = setInterval(() => trigger(true), (pathname.includes('/search') ? 5 : 0.1) * 60 * 1000)
      return () => clearInterval(interval)
    },
    [pathname, filters],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (filters) {
          setFetching(true)

          if (!fetchTrigger) {
            setData(null)
            setTotal(null)
            setOffset(0)
          }

          const _data = toArray(fetchTrigger && data)
          const size = PAGE_SIZE
          const from = [true, 1].includes(fetchTrigger) ? _data.length : 0
          const response = await searchBlocks({ ...filters, size, from })

          if (response) {
            const { total } = { ...response }
            let { data } = { ...response }
            setTotal(total)
            data = _.orderBy(_.uniqBy(_.concat(toArray(data), _data), 'height'), ['height'], ['desc'])
            setData(data)
          }
          else if (!fetchTrigger) {
            setData([])
            setTotal(0)
          }

          setFetching(false)
        }
      }
      getData()
    },
    [fetchTrigger],
  )

  return (
    <div className="children">
      {data ?
        <div className="space-y-2 sm:space-y-4 mt-4 sm:mt-6 mx-auto">
          {!n && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0 space-x-0 sm:space-x-3 px-3">
              <div className="space-y-0.5">
                <div className="text-lg font-bold">
                  {!pathname.includes('/search') ? 'Latest ' : ''}Blocks
                </div>
                {typeof total === 'number' && (
                  <NumberDisplay
                    value={total}
                    format="0,0"
                    suffix=" Results"
                    className="whitespace-nowrap text-slate-500 dark:text-slate-200 font-semibold"
                  />
                )}
              </div>
              <div className="flex flex-col sm:items-end space-y-1">
                {pathname.includes('/search') && <Filters />}
              </div>
            </div>
          )}
          <div className={`${!n ? 'px-3' : ''}`}>
            <Datatable
              columns={[
                {
                  Header: 'Height',
                  accessor: 'height',
                  disableSortBy: true,
                  Cell: props => {
                    const { value } = { ...props }
                    return value && (
                      <Link
                        href={`/block/${value}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 dark:text-blue-500 font-semibold"
                      >
                        <NumberDisplay
                          value={value}
                          format="0,0"
                        />
                      </Link>
                    )
                  },
                },
                {
                  Header: 'Block Hash',
                  accessor: 'hash',
                  disableSortBy: true,
                  Cell: props => {
                    const { value, row } = { ...props }
                    const { height } = { ...row.original }
                    return (
                      <Link
                        href={`/block/${height}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 dark:text-blue-500 font-medium"
                      >
                        {ellipse(value, 8)}
                      </Link>
                    )
                  },
                  headerClassName: 'whitespace-nowrap',
                },
                {
                  Header: 'Proposer',
                  accessor: 'proposer_address',
                  disableSortBy: true,
                  Cell: props => {
                    const { value } = { ...props }
                    const { operator_address, description } = { ...toArray(validators_data).find(v => equalsIgnoreCase(v.consensus_address, value)) }
                    const { moniker } = { ...description }
                    return (
                      description ?
                        <div className="min-w-max flex items-start space-x-2">
                          <Link
                            href={`/validator/${operator_address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ValidatorProfile description={description} />
                          </Link>
                          <div className="flex flex-col">
                            <Link
                              href={`/validator/${operator_address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 font-medium"
                            >
                              {ellipse(moniker, 16)}
                            </Link>
                            <div className="flex items-center space-x-1">
                              <Link
                                href={`/validator/${operator_address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 dark:text-slate-500"
                              >
                                {ellipse(operator_address, 6, 'axelarvaloper')}
                              </Link>
                              <Copy value={operator_address} />
                            </div>
                          </div>
                        </div> :
                        operator_address ?
                          <div className="flex items-center space-x-1">
                            <Link
                              href={`/validator/${operator_address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 font-medium"
                            >
                              {ellipse(operator_address, 6, 'axelarvaloper')}
                            </Link>
                            <Copy value={operator_address} />
                          </div> :
                          value ?
                            <AccountProfile address={value} url={true} /> :
                            '-'
                    )
                  },
                },
                {
                  Header: 'TXs',
                  accessor: 'num_txs',
                  disableSortBy: true,
                  Cell: props => {
                    const { value } = { ...props }
                    return value && (
                      <NumberDisplay
                        value={value}
                        format="0,0"
                        className="text-xs font-medium"
                      />
                    )
                  },
                },
                {
                  Header: 'Time',
                  accessor: 'time',
                  disableSortBy: true,
                  Cell: props => props.value && (
                    <div className="flex justify-end">
                      <TimeAgo time={props.value} className="text-slate-400 dark:text-slate-500 text-xs font-medium" />
                    </div>
                  ),
                  headerClassName: 'justify-end text-right',
                },
              ]
              .filter(c => n ? ['hash'].includes(c.accessor) : true)}
              data={data}
              defaultPageSize={n ? 10 : PAGE_SIZE}
              noPagination={data.length <= 10 || (!n && !pathname.includes('/search'))}
              extra={
                !n && data.length >= PAGE_SIZE && (typeof total !== 'number' || data.length < total) && (
                  <div className="flex justify-center">
                    {!fetching ?
                      <button
                        onClick={
                          () => {
                            setOffset(data.length)
                            setFetchTrigger(typeof fetchTrigger === 'number' ? true : 1)
                          }
                        }
                        className="flex items-center text-black dark:text-white space-x-0.5"
                      >
                        <span className="font-medium">
                          Load more
                        </span>
                        <BsArrowRightShort size={18} />
                      </button> :
                      <Spinner name="ProgressBar" width={32} height={32} />
                    }
                  </div>
                )
              }
              className="no-border no-shadow"
            />
          </div>
        </div> :
        n ?
          <div className="loading">
            <Spinner name="Blocks" />
          </div> :
          <div className="p-3">
            <Spinner name="ProgressBar" width={36} height={36} />
          </div>
      }
    </div>
  )
}