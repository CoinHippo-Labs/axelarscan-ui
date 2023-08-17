import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Chip, Tooltip } from '@material-tailwind/react'
import _ from 'lodash'
import moment from 'moment'
import { BsArrowRightShort } from 'react-icons/bs'

import Filters from './filters'
import Spinner from '../spinner'
import Datatable from '../datatable'
import NumberDisplay from '../number'
import Image from '../image'
import Copy from '../copy'
import AccountProfile from '../profile/account'
import ExplorerLink from '../explorer/link'
import TimeAgo from '../time/timeAgo'
import { searchBatches } from '../../lib/api/batches'
import { batchedCommands } from '../../lib/api/lcd'
import { getChainData, getAssetData } from '../../lib/config'
import { formatUnits } from '../../lib/number'
import { split, toArray, ellipse, equalsIgnoreCase, getQueryParams, sleep } from '../../lib/utils'

const PAGE_SIZE = 25
const PENDING_STATUSES = ['signing', 'unexecuted']
const NUM_COMMANDS_TRUNCATE = 10

export default () => {
  const { chains, assets } = useSelector(state => ({ chains: state.chains, assets: state.assets }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }

  const router = useRouter()
  const { pathname, asPath } = { ...router }

  const [data, setData] = useState(null)
  const [total, setTotal] = useState(null)
  const [offset, setOffset] = useState(0)
  const [filters, setFilters] = useState(null)
  const [fetchTrigger, setFetchTrigger] = useState(null)
  const [fetching, setFetching] = useState(false)
  const [types, setTypes] = useState(null)
  const [typesFiltered, setTypesFiltered] = useState(null)

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
        if (pathname && chains_data && filters && (!is_interval || !fetching)) {
          setFetchTrigger(is_interval ? moment().valueOf() : typeof fetchTrigger === 'number' ? null : 0)
        }
      }

      trigger()
      const interval = setInterval(() => trigger(true), 5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [pathname, chains_data, filters],
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
          const { status } = { ...filters }
          const response = await searchBatches({ ...filters, size, from })

          if (response) {
            const { total } = { ...response }
            let { data } = { ...response }
            setTotal(total)
            if (PENDING_STATUSES.includes(status)) {
              updateBatches(data)
            }
            data = _.orderBy(_.uniqBy(_.concat(toArray(data), _data), 'batch_id'), ['created_at.ms'], ['desc'])
            if (!PENDING_STATUSES.includes(status)) {
              data = await updateBatches(data)
            }
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

  useEffect(
    () => {
      if (data) {
        setTypes(_.countBy(toArray(_.uniqBy(data, 'batch_id').flatMap(d => toArray(d.commands).map(c => c.type)))))
      }
    },
    [data],
  )

  const updateBatches = async data => {
    const _data = _.cloneDeep(toArray(data)).filter(d => d.status === 'BATCHED_COMMANDS_STATUS_SIGNING' || (d.status === 'BATCHED_COMMANDS_STATUS_SIGNED' && toArray(d.commands).findIndex(c => !c.executed) > -1) || toArray(d.commands).length < 1)

    for (const d of _data) {
      const { batch_id, chain, created_at } = { ...d }
      const { ms } = { ...created_at }
      await sleep(0.5 * 1000)
      const response = await batchedCommands(chain, batch_id, { index: true, created_at: ms ? Number(ms) / 1000 : undefined })

      if (response) {
        const index = data.findIndex(d => equalsIgnoreCase(d.batch_id, batch_id))
        if (index > -1) {
          data[index] = response
        }
      }
    }

    return data
  }

  const dataFiltered = toArray(data).filter(d => toArray(typesFiltered).length < 1 || toArray(d.commands).findIndex(c => typesFiltered.includes(c.type)) > -1)

  return (
    <div className="children">
      {data ?
        <div className="space-y-2 sm:space-y-4 mt-4 sm:mt-6 mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0 space-x-0 sm:space-x-3 px-3">
            <div className="space-y-0.5">
              <div className="text-lg font-bold">
                EVM Batches
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
              <Filters />
              <div className="overflow-x-auto flex flex-wrap items-center justify-start sm:justify-end">
                {Object.entries({ ...types }).map(([k, v]) => (
                  <div
                    key={k}
                    onClick={() => setTypesFiltered(_.uniq(toArray(typesFiltered).includes(k) ? typesFiltered.filter(t => !equalsIgnoreCase(t, k)) : _.concat(toArray(typesFiltered), k)))}
                    className={`min-w-max ${toArray(typesFiltered).includes(k) ? 'text-blue-400 dark:text-white font-semibold' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 font-medium'} cursor-pointer whitespace-nowrap flex items-center text-xs sm:text-sm space-x-1 sm:ml-3 mr-3 sm:mr-0`}
                  >
                    <span>{k}</span>
                    <NumberDisplay
                      value={v}
                      format="0,0"
                      className="text-blue-400 dark:text-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="px-3">
            <Datatable
              columns={[
                {
                  Header: 'Batch ID',
                  accessor: 'batch_id',
                  disableSortBy: true,
                  Cell: props => {
                    const { value, row } = { ...props }
                    const { chain, commands } = { ...row.original }
                    const types = _.countBy(toArray(_.uniqBy(toArray(commands), 'id').map(c => c.type)))
                    return (
                      <div className="flex flex-col mb-6">
                        <div className="flex items-center space-x-1">
                          <Link
                            href={`/evm-batch/${chain}/${value}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 dark:text-blue-500 font-semibold"
                          >
                            {ellipse(value, 10)}
                          </Link>
                          <Copy value={value} />
                        </div>
                        <div className="overflow-x-auto flex flex-wrap items-center">
                          {Object.entries({ ...types }).map(([k, v]) => (
                            <div key={k} className="min-w-max whitespace-nowrap flex items-center text-slate-400 dark:text-slate-500 text-xs space-x-1 mr-2">
                              <span>{k}</span>
                              <NumberDisplay
                                value={v}
                                format="0,0"
                                className="text-blue-400 dark:text-white"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  },
                  headerClassName: 'whitespace-nowrap',
                },
                {
                  Header: 'Chain',
                  accessor: 'chain',
                  disableSortBy: true,
                  Cell: props => {
                    const { value } = { ...props }
                    const { name, image } = { ...getChainData(value, chains_data) }
                    return (
                      <Tooltip content={name}>
                        <div className="w-fit">
                          <Image
                            src={image}
                            width={24}
                            height={24}
                            className="3xl:w-8 3xl:h-8 rounded-full"
                          />
                        </div>
                      </Tooltip>
                    )
                  },
                },
                {
                  Header: 'Key ID',
                  accessor: 'key_id',
                  disableSortBy: true,
                  Cell: props => props.value && (
                    <Copy
                      size={14}
                      value={props.value}
                      title={
                        <span className="cursor-pointer text-slate-400 dark:text-slate-500 text-2xs">
                          {ellipse(props.value, 10)}
                        </span>
                      }
                    />
                  ),
                  headerClassName: 'whitespace-nowrap',
                },
                {
                  Header: 'Commands',
                  accessor: 'commands',
                  disableSortBy: true,
                  Cell: props => {
                    const { value, row } = { ...props }
                    const { batch_id, chain } = { ...row.original }
                    const { explorer } = { ...getChainData(chain, chains_data) }
                    const { url, transaction_path } = { ...explorer }
                    return assets_data && (
                      toArray(value).length > 0 ?
                        <div className="min-w-max flex flex-col space-y-2.5 mb-6">
                          {_.slice(toArray(value), 0, NUM_COMMANDS_TRUNCATE).map((c, i) => {
                            const {
                              id,
                              type,
                              params,
                              deposit_address,
                              transactionHash,
                              executed,
                            } = { ...c }
                            const {
                              amount,
                              name,
                              cap,
                              account,
                              salt,
                              newOwners,
                              newOperators,
                              newWeights,
                              newThreshold,
                              sourceChain,
                              sourceTxHash,
                              contractAddress,
                            } = { ...params }
                            let { symbol, decimals } = { ...params }

                            const transfer_id = parseInt(id, 16)
                            const asset_data = getAssetData(symbol, assets_data)
                            const { addresses } = { ...asset_data }

                            const token_data = addresses?.[chain]
                            symbol = token_data?.symbol || asset_data?.symbol || symbol
                            decimals = token_data?.decimals || asset_data?.decimals || decimals || 18
                            const image = token_data?.image || asset_data?.image

                            const source_chain_data = getChainData(sourceChain, chains_data)
                            const typeComponent = (
                              <Tooltip placement="top-start" content={executed ? 'Executed' : 'Unexecuted'}>
                                <Chip
                                  color={executed ? 'green' : 'cyan'}
                                  value={type}
                                  className="chip normal-case text-2xs font-medium mr-2 py-0 px-2"
                                />
                              </Tooltip>
                            )

                            return (
                              <div key={i} className="flex flex-wrap items-start">
                                {transactionHash && url ?
                                  <a
                                    href={`${url}${transaction_path?.replace('{tx}', transactionHash)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {typeComponent}
                                  </a> :
                                  typeComponent
                                }
                                {symbol && !['approveContractCall'].includes(type) && (
                                  <div className="min-w-max max-w-min flex items-center justify-center space-x-1 mr-2">
                                    {image && (
                                      <Image
                                        src={image}
                                        width={20}
                                        height={20}
                                      />
                                    )}
                                    {!!(amount) && (
                                      <NumberDisplay
                                        value={formatUnits(amount, decimals)}
                                        format="0,0.000000"
                                      />
                                    )}
                                    <span className="text-sm font-medium">
                                      {symbol}
                                    </span>
                                  </div>
                                )}
                                {source_chain_data && (
                                  <div className="flex items-start space-x-1 mr-2">
                                    <Tooltip content={source_chain_data.name}>
                                      <div className="w-fit">
                                        <Image
                                          src={source_chain_data.image}
                                          width={20}
                                          height={20}
                                          className="rounded-full"
                                        />
                                      </div>
                                    </Tooltip>
                                    {sourceTxHash && (
                                      <div className="flex items-center space-x-1">
                                        <Link
                                          href={`/gmp/${sourceTxHash}${source_chain_data.chain_type === 'cosmos' && id ? `?command_id=${id}` : ''}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-400 dark:text-blue-500 font-medium"
                                        >
                                          GMP
                                        </Link>
                                        {source_chain_data.chain_type !== 'cosmos' && <ExplorerLink value={sourceTxHash} explorer={source_chain_data.explorer} />}
                                      </div>
                                    )}
                                    {contractAddress && (
                                      <>
                                        <BsArrowRightShort size={18} />
                                        <div className="flex items-center space-x-1">
                                          <AccountProfile address={contractAddress} explorer={explorer} chain={chain} />
                                          <ExplorerLink value={contractAddress} explorer={explorer} />
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                                {type === 'mintToken' && typeof transfer_id === 'number' && (
                                  <div className="flex items-center space-x-1 mr-1">
                                    <Link
                                      href={`/transfer?transfer_id=${transfer_id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 dark:text-blue-500 font-medium"
                                    >
                                      Transfer
                                    </Link>
                                  </div>
                                )}
                                {name && (
                                  <div className="flex flex-col mr-2">
                                    <span className="text-sm font-semibold">
                                      {name}
                                    </span>
                                    <div className="flex items-center space-x-1">
                                      {decimals && (
                                        <NumberDisplay
                                          value={decimals}
                                          format="0,0"
                                          prefix="Decimals: "
                                          className="text-slate-600 dark:text-slate-200 text-xs font-medium"
                                        />
                                      )}
                                      {cap && (
                                        <NumberDisplay
                                          value={cap}
                                          format="0,0"
                                          prefix="Cap: "
                                          className="text-slate-600 dark:text-slate-200 text-xs font-medium"
                                        />
                                      )}
                                    </div>
                                  </div>
                                )}
                                {account ?
                                  <div className="flex items-center space-x-1 mr-2">
                                    <BsArrowRightShort size={18} />
                                    <div className="flex items-center space-x-1">
                                      <AccountProfile address={account} explorer={explorer} chain={chain} />
                                      <ExplorerLink value={account} explorer={explorer} />
                                    </div>
                                  </div> :
                                  salt && (
                                    <div className="flex items-center space-x-1 mr-2">
                                      <span className="text-slate-400 dark:text-slate-500 text-sm font-medium">{deposit_address ? 'Deposit address' : 'Salt'}:</span>
                                      {deposit_address ?
                                        <>
                                          <a
                                            href={`/account/${deposit_address}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-slate-400 dark:text-slate-500 text-sm font-medium"
                                          >
                                            {ellipse(deposit_address, 8)}
                                          </a>
                                          <Copy value={deposit_address} />
                                        </> :
                                        <Copy
                                          value={salt}
                                          title={
                                            <span className="text-slate-400 dark:text-slate-500 text-sm font-medium">
                                              {ellipse(salt, 8)}
                                            </span>
                                          }
                                        />
                                      }
                                    </div>
                                  )
                                }
                                {newOwners && (
                                  <NumberDisplay
                                    value={split(newOwners, 'normal', ';').length}
                                    format="0,0"
                                    suffix={' New Owners'}
                                    noTooltip={true}
                                    className="bg-slate-50 dark:bg-slate-900 rounded whitespace-nowrap text-black dark:text-white text-xs font-medium mr-2 py-0.5 px-1.5"
                                  />
                                )}
                                {newOperators && (
                                  <div className="flex items-center mr-2">
                                    <NumberDisplay
                                      value={split(newOperators, 'normal', ';').length}
                                      format="0,0"
                                      suffix={' New Operators'}
                                      noTooltip={true}
                                      className="bg-slate-50 dark:bg-slate-900 rounded whitespace-nowrap text-black dark:text-white text-xs font-medium mr-1 py-0.5 px-1.5"
                                    />
                                    {newWeights && (
                                      <NumberDisplay
                                        value={_.sum(split(newWeights, 'normal', ';').map(w => Number(w)))}
                                        format="0,0"
                                        noTooltip={true}
                                        className="text-slate-600 dark:text-slate-200 text-xs font-medium"
                                      />
                                    )}
                                  </div>
                                )}
                                {newThreshold && (
                                  <NumberDisplay
                                    value={newThreshold}
                                    format="0,0"
                                    prefix={'Threshold: '}
                                    noTooltip={true}
                                    className="text-xs font-medium mr-2"
                                  />
                                )}
                              </div>
                            )
                          })}
                          {toArray(value).length > NUM_COMMANDS_TRUNCATE && (
                            <Link
                              href={`/evm-batch/${chain}/${batch_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="whitespace-nowrap text-blue-400 dark:text-blue-500 font-medium"
                            >
                              <NumberDisplay
                                value={toArray(value).length - NUM_COMMANDS_TRUNCATE}
                                format="0,0"
                                prefix={'and '}
                                suffix={' more'}
                              />
                            </Link>
                          )}
                        </div> :
                        '-'
                    )
                  },
                },
                {
                  Header: 'Status',
                  accessor: 'status',
                  disableSortBy: true,
                  Cell: props => {
                    const { value, row } = { ...props }
                    const { commands } = { ...row.original }
                    const executed = toArray(commands).length === toArray(commands).filter(c => c.executed).length
                    return value && (
                      <Chip
                        color={executed ? 'green' : equalsIgnoreCase(value, 'BATCHED_COMMANDS_STATUS_SIGNED') ? 'teal' : equalsIgnoreCase(value, 'BATCHED_COMMANDS_STATUS_SIGNING') ? 'blue' : 'red'}
                        value={executed ? 'Executed' : value.replace('BATCHED_COMMANDS_STATUS_', '')}
                        className="chip normal-case text-2xs font-medium py-0 px-1.5"
                      />
                    )
                  },
                },
                {
                  Header: 'Time',
                  accessor: 'created_at.ms',
                  disableSortBy: true,
                  Cell: props => props.value && (
                    <div className="flex justify-end">
                      <TimeAgo time={props.value / 1000} className="text-slate-400 dark:text-slate-500 text-xs font-medium" />
                    </div>
                  ),
                  headerClassName: 'justify-end text-right',
                },
              ]}
              data={dataFiltered}
              defaultPageSize={PAGE_SIZE}
              noPagination={dataFiltered.length < PAGE_SIZE}
              extra={
                data.length >= PAGE_SIZE && (typeof total !== 'number' || data.length < total) && (
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
        <div className="loading">
          <Spinner name="Blocks" />
        </div>
      }
    </div>
  )
}