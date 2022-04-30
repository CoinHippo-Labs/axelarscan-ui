import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import {Img } from 'react-image'
import Loader from 'react-loader-spinner'
import { TiArrowRight } from 'react-icons/ti'
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa'

import VotesFilter from './votes-filter'
import Datatable from '../datatable'
import Copy from '../copy'
import Popover from '../popover'

import { evmVotes as getEvmVotes } from '../../lib/api/opensearch'
import { chain_manager } from '../../lib/object/chain'
import { paramsToObject, numberFormat, ellipseAddress, sleep } from '../../lib/utils'

const PAGE_SIZE = 100
const MAX_PAGE = 50

export default function EVMVotes({ className }) {
  const { preferences, chains, validators } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, validators: state.validators }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { validators_data } = { ...validators }

  const router = useRouter()
  const { pathname, asPath } = { ...router }

  const [page, setPage] = useState(0)
  const [moreLoading, setMoreLoading] = useState(false)
  const [votes, setVotes] = useState(null)
  const [votesTrigger, setVotesTrigger] = useState(null)
  const [votesFilter, setVotesFilter] = useState(null)

  useEffect(() => {
    if (asPath && !votesFilter) {
      const query = paramsToObject(asPath?.indexOf('?') > -1 && asPath?.substring(asPath.indexOf('?') + 1))
      if (query) {
        let filter
        if (query.transaction_id) {
          filter = { ...filter, transaction_id: query.transaction_id }
        }
        if (query.poll_id) {
          filter = { ...filter, poll_id: query.poll_id }
        }
        if (query.voter) {
          filter = { ...filter, sender: query.voter }
        }
        if (query.from && query.to) {
          filter = { ...filter, time: [moment(Number(query.from)), moment(Number(query.to))] }
        }
        if (query.chain) {
          filter = { ...filter, sender_chain: query.chain }
        }
        if (['yes', 'no'].includes(query.vote?.toLowerCase())) {
          filter = { ...filter, confirmed: query.vote.toLowerCase() }
        }
        if (filter) {
          setVotesFilter(filter)
        }
      }
      setVotesTrigger(moment().valueOf())
    }
  }, [asPath])

  useEffect(() => {
    const controller = new AbortController()

    const getData = async is_interval => {
      if (!controller.signal.aborted) {
        if (page && !is_interval) {
          setMoreLoading(true)
        }

        if (!is_interval && votesTrigger && typeof votesTrigger !== 'boolean') {
          setVotes(null)

          if (votes && votes.data?.length < 1) {
            await sleep(0.5 * 1000)
          }
        }

        let data = page === 0 ? [] : _.cloneDeep(votes?.data), _page = page
        let size = PAGE_SIZE
        const must = [], must_not = []
        let searchParams
        if (votesFilter) {
          if (votesFilter.transaction_id) {
            must.push({ match: { transaction_id: votesFilter.transaction_id } })
            searchParams = { ...searchParams, transaction_id: votesFilter.transaction_id }
          }
          if (votesFilter.poll_id) {
            must.push({ match: { poll_id: votesFilter.poll_id } })
            searchParams = { ...searchParams, poll_id: votesFilter.poll_id }
          }
          if (votesFilter.sender) {
            must.push({ match: { sender: votesFilter.sender } })
            searchParams = { ...searchParams, voter: votesFilter.sender }
          }
          if (votesFilter.time?.length > 1) {
            must.push({ range: { 'created_at.ms': { gte: votesFilter.time[0].valueOf(), lte: votesFilter.time[1].valueOf() } } })
            searchParams = { ...searchParams, from: votesFilter.time[0].valueOf(), to: votesFilter.time[1].valueOf() }
          }
          if (votesFilter.sender_chain) {
            must.push({ match: { sender_chain: votesFilter.sender_chain } })
            searchParams = { ...searchParams, chain: votesFilter.sender_chain }
          }
          if (['yes', 'no'].includes(votesFilter.confirmed)) {
            must.push({ match: { confirmed: votesFilter.confirmed === 'yes' } })
            searchParams = { ...searchParams, vote: votesFilter.confirmed }
          }
        }

        if (searchParams) {
          router.push(`${pathname}?${Object.entries(searchParams).map(([k, v]) => `${k}=${v}`).join('&')}`)
        }

        const query = {
          bool: {
            must,
            must_not,
          },
        }

        while (_page <= page) {
          if (!controller.signal.aborted) {
            const params = {
              size,
              from: _page * size,
              sort: [{ 'created_at.ms': 'desc' }],
              query,
            }
            const response = await getEvmVotes(params)
            data = _.orderBy(Object.entries(_.groupBy(_.uniqBy(_.concat(data || [], response?.data || []), 'txhash'), 'poll_id')).map(([k, v]) => { return { poll_id: k, votes: _.orderBy(v?.map(_v => { return { ..._v, order: _v?.vote_confirmed ? 0 : _v?.poll_initial ? 1 : -1 } }), ['order', 'created_at.ms'], ['asc', 'desc']), created_at: _.minBy(v, 'created_at.ms')?.created_at?.ms } }), ['created_at'], ['desc']).flatMap(p => p.votes)
            _page++
          }
        }

        setVotes({ data })

        if (page && !is_interval) {
          setMoreLoading(false)
        }
      }
    }

    if (votesTrigger) {
      getData()
    }

    const interval = setInterval(() => getData(true), 30 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [votesTrigger])

  return (
    <>
      <div className="flex items-center justify-end -mt-12 mb-4 mr-2">
        <VotesFilter
          applied={Object.values(votesFilter || {}).filter(v => v).length > 0}
          disabled={!chains_data}
          initialFilter={votesFilter}
          updateFilter={f => {
            setVotesFilter(f)
            setVotesTrigger(moment().valueOf())
            setPage(0)
          }}
        />
      </div>
      <Datatable
        columns={[
          {
            Header: 'Transaction ID',
            accessor: 'transaction_id',
            disableSortBy: true,
            Cell: props => {
              const chain = chains_data?.find(c => c?.id === props.row.original.sender_chain)
              return !props.row.original.skeleton ?
                <div className="flex items-center space-x-1 mb-4">
                  <Copy
                    text={props.value}
                    copyTitle={<span className="uppercase text-gray-400 dark:text-gray-600 text-2xs font-medium">
                      {ellipseAddress(props.value, 8)}
                    </span>}
                  />
                  {chain?.explorer?.url && (
                    <a
                      href={`${chain.explorer.url}${chain.explorer.transaction_path?.replace('{tx}', props.value)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-max flex items-center text-blue-600 dark:text-white"
                    >
                      {chain.explorer.icon ?
                        <Img
                          src={chain.explorer.icon}
                          alt=""
                          className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                        />
                        :
                        <TiArrowRight size={16} className="transform -rotate-45" />
                      }
                    </a>
                  )}
                </div>
                :
                <div className="skeleton w-48 h-4 mb-4" />
            },
          },
          {
            Header: 'Poll ID',
            accessor: 'poll_id',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                <Copy
                  text={props.value}
                  copyTitle={<span className="uppercase text-gray-400 dark:text-gray-600 text-2xs font-medium">
                    {ellipseAddress(props.value, 16)}
                  </span>}
                />
                :
                <div className="skeleton w-48 h-4" />
            ),
          },
          {
            Header: 'Height',
            accessor: 'height',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                <Link href={`/block/${props.value}`}>
                  <a className="text-blue-500 dark:text-gray-400 font-medium">
                    {numberFormat(props.value, '0,0')}
                  </a>
                </Link>
                :
                <div className="skeleton w-16 h-4" />
            ),
          },
          {
            Header: 'Chain',
            accessor: 'sender_chain',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                props.value ?
                  <img
                    alt=""
                    src={chain_manager.image(props.value, chains_data)}
                    className="w-6 h-6 rounded-full -mt-0.5"
                  />
                  :
                  '-'
                :
                <div className="skeleton w-6 h-6 rounded-full -mt-0.5" />
            ),
          },
          {
            Header: 'Voter',
            accessor: 'sender',
            disableSortBy: true,
            Cell: props => {
              const validator_data = validators_data?.find(v => v?.broadcaster_address === props.value)

              return !props.row.original.skeleton ?
                validator_data ?
                  <div className={`min-w-max flex items-${props.value ? 'start' : 'center'} space-x-2 -mt-0.5`}>
                    <Link href={`/validator/${validator_data.operator_address}`}>
                      <a>
                        {validator_data.description?.image ?
                          <img
                            src={validator_data.description.image}
                            alt=""
                            className="w-6 h-6 rounded-full"
                          />
                          :
                          <div className="skeleton w-6 h-6 rounded-full" />
                        }
                      </a>
                    </Link>
                    <div className="flex flex-col">
                      {validator_data.description?.moniker && (
                        <Link href={`/validator/${validator_data.operator_address}`}>
                          <a className="text-blue-600 dark:text-white font-medium">
                            {ellipseAddress(validator_data.description.moniker, 16) || validator_data.operator_address}
                          </a>
                        </Link>
                      )}
                      <span className="flex items-center space-x-1">
                        <Link href={`/validator/${validator_data.operator_address}`}>
                          <a className="text-gray-400 dark:text-gray-600 font-light">
                            {process.env.NEXT_PUBLIC_PREFIX_VALIDATOR}{ellipseAddress(validator_data.operator_address?.replace(process.env.NEXT_PUBLIC_PREFIX_VALIDATOR, ''), 8)}
                          </a>
                        </Link>
                        <Copy text={validator_data.operator_address} />
                      </span>
                    </div>
                  </div>
                  :
                  <div className="flex items-center space-x-1">
                    <Link href={`/account/${props.value}`}>
                      <a className="text-blue-600 dark:text-white font-medium">
                        {ellipseAddress(props.value)}
                      </a>
                    </Link>
                    <Copy text={props.value} />
                  </div>
                :
                <div className="flex items-start space-x-2 -mt-0.5">
                  <div className="skeleton w-6 h-6 rounded-full" />
                  <div className="flex flex-col space-y-1.5">
                    <div className="skeleton w-24 h-4" />
                    <div className="skeleton w-32 h-3" />
                  </div>
                </div>
            },
          },
          {
            Header: 'Vote',
            accessor: 'confirmed',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center space-x-1">
                    {props.value ?
                      <span className="flex items-center text-green-600 dark:text-green-400 space-x-1">
                        <FaCheckCircle size={16} />
                        <span className="font-semibold">Yes</span>
                      </span>
                      :
                      <span className="flex items-center text-red-600 dark:text-red-400 space-x-1">
                        <FaTimesCircle size={16} />
                        <span className="font-semibold">No</span>
                      </span>
                    }
                  </div>
                  {props.row.original.vote_confirmed ?
                    <div className="max-w-min bg-green-100 dark:bg-green-600 rounded-lg border border-green-600 text-2xs font-medium p-1">
                      Succeed
                    </div>
                    :
                    !props.row.original.poll_initial ?
                      <div className="max-w-min bg-gray-100 dark:bg-gray-900 rounded-lg text-gray-400 dark:text-gray-600 text-2xs font-medium py-1 px-1.5">
                        Concluded
                      </div>
                      :
                      null
                  }
                </div>
                :
                <div className="skeleton w-12 h-4" />
            ),
          },
          {
            Header: 'Tx Hash',
            accessor: 'txhash',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="flex items-center space-x-1">
                  <Link href={`/tx/${props.value}`}>
                    <a className="uppercase text-blue-600 dark:text-white font-medium">
                      {ellipseAddress(Array.isArray(props.value) ? _.last(props.value) : props.value)}
                    </a>
                  </Link>
                  <Copy text={Array.isArray(props.value) ? _.last(props.value) : props.value} />
                </div>
                :
                <div className="skeleton w-48 h-4" />
            ),
          },
          {
            Header: 'Time',
            accessor: 'created_at.ms',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                <Popover
                  placement="top"
                  title={<span className="normal-case">TX Time</span>}
                  content={<div className="w-36 text-xs">{moment(Array.isArray(props.value) ? _.last(props.value) : props.value).format('MMM D, YYYY h:mm:ss A')}</div>}
                  titleClassName="h-8"
                  className="ml-auto"
                >
                  <div className="text-right">
                    <span className="normal-case text-gray-400 dark:text-gray-600 font-normal">
                      {Number(moment().diff(moment(Array.isArray(props.value) ? _.last(props.value) : props.value), 'second')) > 59 ?
                        moment(Array.isArray(props.value) ? _.last(props.value) : props.value).fromNow()
                        :
                        <>{moment().diff(moment(Array.isArray(props.value) ? _.last(props.value) : props.value), 'second')}s ago</>
                      }
                    </span>
                  </div>
                </Popover>
                :
                <div className="skeleton w-24 h-4 ml-auto" />
            ),
            headerClassName: 'justify-end text-right',
          },
        ]}
        data={votes ?
          votes.data?.map((v, i) => { return { ...v, i } }) || []
          :
          [...Array(25).keys()].map(i => { return { i, skeleton: true } })
        }
        noPagination={false}
        defaultPageSize={PAGE_SIZE}
        className={`${className}`}
      />
      {votes && !(votes.data?.length > 0) && (
        <div className="bg-white dark:bg-gray-900 rounded-xl text-gray-300 dark:text-gray-500 text-base font-medium italic text-center my-4 mx-2 py-2">
          No Votes
        </div>
      )}
      {!moreLoading && page < MAX_PAGE && (
        <div
          onClick={() => {
            setPage(page + 1)
            setVotesTrigger(true)
          }}
          className="btn btn-default btn-rounded max-w-max bg-trasparent bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer text-gray-900 dark:text-white font-semibold mb-8 mx-auto"
        >
          Load More
        </div>
      )}
      {moreLoading && (
        <div className="flex justify-center mb-8">
          <Loader type="ThreeDots" color={theme === 'dark' ? 'white' : '#3B82F6'} width="32" height="32" />
        </div>
      )}
    </>
  )
}