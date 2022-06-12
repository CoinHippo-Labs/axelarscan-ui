import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { TailSpin, ThreeDots } from 'react-loader-spinner'
import { BiCheckCircle, BiXCircle } from 'react-icons/bi'

import Datatable from '../datatable'
import ValidatorProfile from '../validator-profile'
import Image from '../image'
import Copy from '../copy'
import TimeAgo from '../time-ago'
import { evm_votes as getEvmVotes } from '../../lib/api/index'
import { chain_manager } from '../../lib/object/chain'
import { number_format, ellipse, equals_ignore_case, params_to_obj, loader_color } from '../../lib/utils'

const LIMIT = 100

export default () => {
  const { preferences, evm_chains, validators } = useSelector(state => ({ preferences: state.preferences, evm_chains: state.evm_chains, validators: state.validators }), shallowEqual)
  const { theme } = { ...preferences }
  const { evm_chains_data } = { ...evm_chains }
  const { validators_data } = { ...validators }

  const router = useRouter()
  const { pathname, asPath } = { ...router }

  const [data, setData] = useState(null)
  const [total, setTotal] = useState(null)
  const [offset, setOffet] = useState(0)
  const [fetchTrigger, setFetchTrigger] = useState(null)
  const [fetching, setFetching] = useState(false)
  const [filters, setFilters] = useState(null)

  useEffect(() => {
    if (asPath) {
      const params = params_to_obj(asPath?.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))
      const { chain, txHash, pollId, transactionId, voter, vote, fromTime, toTime } = { ...params }
      setFilters({
        chain,
        txHash,
        pollId,
        transactionId,
        voter,
        vote: ['yes', 'no'].includes(vote?.toLowerCase()) ? vote.toLowerCase() : undefined,
        time: fromTime && toTime && [moment(Number(fromTime)), moment(Number(toTime))],
      })
      setFetchTrigger(moment().valueOf())
    }
  }, [asPath])

  useEffect(() => {
    const triggering = is_interval => {
      setFetchTrigger(is_interval ? moment().valueOf() : typeof fetchTrigger === 'number' ? null : 0)
    }
    if (evm_chains_data && pathname && filters) {
      triggering()
    }
    const interval = setInterval(() => triggering(true), 5 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [evm_chains_data, pathname, filters])

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (filters) {
        if (!controller.signal.aborted) {
          setFetching(true)
          if (!fetchTrigger) {
            setTotal(null)
            setData(null)
            setOffet(0)
          }
          const _data = !fetchTrigger ? [] : (data || []),
            size = LIMIT
          const from = fetchTrigger === 'true' || fetchTrigger === 1 ? _data.length : 0
          const must = [], must_not = []
          const { chain, txHash, pollId, transactionId, voter, vote, time } = { ...filters }
          if (chain) {
            must.push({ match: { sender_chain: chain } })
          }
          if (txHash) {
            must.push({ match: { txhash: txHash } })
          }
          if (pollId) {
            must.push({ match: { poll_id: pollId } })
          }
          if (transactionId) {
            must.push({ match: { transaction_id: transactionId } })
          }
          if (voter) {
            must.push({ match: { voter } })
          }
          if (vote) {
            switch (vote) {
              case 'yes':
              case 'no':
                must.push({ match: { vote: vote === 'yes' } })
                break
              default:
                break
            }
          }
          if (time?.length > 1) {
            must.push({ range: { 'created_at.ms': { gte: time[0].valueOf(), lte: time[1].valueOf() } } })
          }
          const response = await getEvmVotes({
            query: {
              bool: {
                must,
                must_not,
              },
            },
            size,
            from,
            sort: [{ 'created_at.ms': 'desc' }],
            track_total_hits: true,
          })
          if (response) {
            setTotal(response.total)
            response = _.orderBy(_.uniqBy(_.concat(_data, response.data?.map(d => {
              return {
                ...d,
              }
            }) || []), 'txhash'), ['created_at.ms'], ['desc'])
            setData(response)
          }
          else if (!fetchTrigger) {
            setTotal(0)
            setData([])
          }
          setFetching(false)
        }
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
        <div className="flex items-center space-x-2 -mt-4">
          <span className="text-lg font-bold">
            {number_format(total, '0,0')}
          </span>
          <span className="text-base">
            Results
          </span>
        </div>
        <Datatable
          columns={[
            {
              Header: 'Tx Hash',
              accessor: 'txhash',
              disableSortBy: true,
              Cell: props => (
                <div className="flex items-center space-x-1 mb-3">
                  <Link href={`/tx/${props.value}`}>
                    <a className="uppercase text-blue-600 dark:text-white font-bold">
                      {ellipse(props.value, 8)}
                    </a>
                  </Link>
                  <Copy
                    value={props.value}
                    size={18}
                  />
                </div>
              ),
            },
            {
              Header: 'Block',
              accessor: 'height',
              disableSortBy: true,
              Cell: props => (
                <Link href={`/block/${props.value}`}>
                  <a className="text-blue-600 dark:text-white font-semibold">
                    {number_format(props.value, '0,0')}
                  </a>
                </Link>
              ),
            },
            {
              Header: 'Chain',
              accessor: 'sender_chain',
              disableSortBy: true,
              Cell: props => (
                chain_manager.image(props.value, evm_chains_data) ?
                  <Image
                    src={chain_manager.image(props.value, evm_chains_data)}
                    className="w-6 h-6 rounded-full"
                  />
                  :
                  <span className="font-semibold">
                    {chain_manager.name(props.value, evm_chains_data)}
                  </span>
              ),
            },
            {
              Header: 'Poll ID',
              accessor: 'poll_id',
              disableSortBy: true,
              Cell: props => (
                <Copy
                  value={props.value}
                  title={<span className="cursor-pointer text-slate-400 dark:text-slate-600 font-semibold">
                    {ellipse(props.value, 8)}
                  </span>}
                  size={18}
                />
              ),
            },
            {
              Header: 'EVM Transaction ID',
              accessor: 'transaction_id',
              disableSortBy: true,
              Cell: props => {
                const chain_data = evm_chains_data?.find(c => equals_ignore_case(c?.id, props.row.original.sender_chain))
                return (
                  <div className="flex items-center space-x-1">
                    <a
                      href={`${chain_data?.explorer?.url}${chain_data?.explorer?.transaction_path?.replace('{tx}', props.value)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-white font-semibold"
                    >
                      {ellipse(props.value, 8)}
                    </a>
                    <Copy
                      value={props.value}
                      size={18}
                    />
                  </div>
                )
              },
            },
            {
              Header: 'Voter',
              accessor: 'voter',
              disableSortBy: true,
              Cell: props => {
                const validator_data = validators_data?.find(v => equals_ignore_case(v?.broadcaster_address, props.value))
                const { operator_address, description } = { ...validator_data }
                const { moniker } = { ...description }
                return validator_data ?
                  <div className={`min-w-max flex items-${moniker ? 'start' : 'center'} space-x-2`}>
                    <Link href={`/validator/${operator_address}`}>
                      <a>
                        <ValidatorProfile validator_description={description} />
                      </a>
                    </Link>
                    <div className="flex flex-col">
                      {moniker && (
                        <Link href={`/validator/${operator_address}`}>
                          <a className="text-blue-600 dark:text-white font-bold">
                            {ellipse(moniker, 12)}
                          </a>
                        </Link>
                      )}
                      <div className="flex items-center space-x-1">
                        <Link href={`/validator/${operator_address}`}>
                          <a className="text-slate-400 dark:text-slate-600 font-medium">
                            {ellipse(operator_address, 8, process.env.NEXT_PUBLIC_PREFIX_VALIDATOR)}
                          </a>
                        </Link>
                        <Copy value={operator_address} />
                      </div>
                    </div>
                  </div>
                  :
                  props.value ?
                    <div className="flex items-center space-x-1">
                      <Link href={`/account/${props.value}`}>
                        <a className="text-blue-600 dark:text-white font-medium">
                          {ellipse(props.value, 8, process.env.NEXT_PUBLIC_PREFIX_ACCOUNT)}
                        </a>
                      </Link>
                      <Copy value={props.value} />
                    </div>
                    :
                    <span>
                      -
                    </span>
              },
            },
            {
              Header: 'Vote',
              accessor: 'vote',
              disableSortBy: true,
              Cell: props => (
                <div className="flex flex-col space-y-1">
                  <div className={`flex items-center ${props.value ? 'text-green-500 dark:text-green-600' : 'text-red-500 dark:text-red-600'} space-x-1`}>
                    {props.value ?
                      <BiCheckCircle size={20} /> :
                      <BiXCircle size={20} />
                    }
                    <span className="uppercase font-bold">
                      {props.value ?
                        'yes' : 'no'
                      }
                    </span>
                  </div>
                  {(props.row.original.confirmation || !props.row.original.unconfirmed) && (
                    <div className={`max-w-min ${props.row.original.confirmation ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500 dark:border-blue-600 text-blue-500 dark:text-blue-600 font-bold' : 'bg-slate-100 dark:bg-slate-900 border border-slate-400 dark:border-slate-600 text-slate-400 dark:text-slate-600 font-medium'} rounded-lg capitalize text-xs py-0.5 px-1.5`}>
                      {props.row.original.confirmation ?
                        'succeed' : 'concluded'
                      }
                    </div>
                  )}
                </div>
              ),
            },
            {
              Header: 'Time',
              accessor: 'created_at.ms',
              disableSortBy: true,
              Cell: props => (
                <TimeAgo
                  time={props.value}
                  className="ml-auto"
                />
              ),
              headerClassName: 'justify-end text-right',
            },
          ]}
          data={data}
          noPagination={data.length <= 10}
          defaultPageSize={50}
          className="no-border"
        />
        {data.length > 0 && (
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