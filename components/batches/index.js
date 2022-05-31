import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { BigNumber, utils } from 'ethers'
import { TailSpin, ThreeDots } from 'react-loader-spinner'
import { BiRightArrowCircle, BiCheckCircle } from 'react-icons/bi'
import { HiOutlineClock } from 'react-icons/hi'
import { TiArrowRight } from 'react-icons/ti'

// import PendingCommands from './pending-commands'
import Datatable from '../datatable'
import EnsProfile from '../ens-profile'
import Image from '../Image'
import Copy from '../copy'
import TimeAgo from '../time-ago'
import { axelard } from '../../lib/api/executor'
import { batches as getBatches, fieldsToObj } from '../../lib/api/index'
import { chain_manager } from '../../lib/object/chain'
import { number_format, ellipse, equals_ignore_case, to_json, params_to_obj, loader_color, sleep } from '../../lib/utils'

const LIMIT = 100

export default () => {
  const { preferences, evm_chains, assets } = useSelector(state => ({ preferences: state.preferences, evm_chains: state.evm_chains, assets: state.assets }), shallowEqual)
  const { theme } = { ...preferences }
  const { evm_chains_data } = { ...evm_chains }
  const { assets_data } = { ...assets }

  const router = useRouter()
  const { pathname, asPath } = { ...router }

  const [data, setData] = useState(null)
  const [offset, setOffet] = useState(0)
  const [fetchTrigger, setFetchTrigger] = useState(null)
  const [fetching, setFetching] = useState(false)
  const [filters, setFilters] = useState(null)
  const [types, setTypes] = useState(null)
  const [filterTypes, setFilterTypes] = useState(null)

  useEffect(() => {
    if (asPath) {
      const params = params_to_obj(asPath?.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))
      const { chain, batchId, keyId, type, status, fromTime, toTime } = { ...params }
      setFilters({
        chain,
        batchId,
        keyId,
        type,
        status: ['signed', 'signing'].includes(status?.toLowerCase()) ? status.toLowerCase() : undefined,
        time: fromTime && toTime && [moment(Number(fromTime)), moment(Number(toTime))],
      })
      setFetchTrigger(moment().valueOf())
    }
  }, [asPath])

  useEffect(() => {
    const triggering = is_interval => {
      setFetchTrigger(is_interval ? moment().valueOf() : typeof fetchTrigger === 'number' ? null : 0)
    }
    triggering()
    const interval = setInterval(() => triggering(true), 5 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [evm_chains_data, pathname, filters])

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
          size = LIMIT
        const from = fetchTrigger === 'true' || fetchTrigger === 1 ? _data.length : 0
        response
        const must = [], must_not = []
        if (filters) {
          const { chain, batchId, keyId, type, status, time } = { ...filters }
          if (chain) {
            must.push({ match: { chain } })
          }
          if (batchId) {
            must.push({ match: { batch_id: batchId } })
          }
          if (keyId) {
            must.push({ match: { key_id: keyId } })
          }
          if (type) {
            must.push({ match: { 'commands.type': type } })
          }
          if (status) {
            switch (status) {
              case 'signed':
              case 'signing':
                must.push({ match: { status: `BATCHED_COMMANDS_STATUS_${status}` } })
                break
              default:
                break
            }
          }
          if (time?.length > 1) {
            must.push({ range: { 'created_at.ms': { gte: time[0].valueOf(), lte: time[1].valueOf() } } })
          }
        }
        const response = await getBatches({
          query: {
            bool: {
              must,
              must_not,
            },
          },
          size,
          from,
          sort: [{ 'created_at.ms': 'desc' }],
          fields: ['batch_id', 'chain', 'key_id', 'commands.*', 'status', 'created_at.*'],
          _source: false,
        })
        if (response) {
          response = _.orderBy(_.uniqBy(_.concat(_data, response.data?.map(d => {
            d = fieldsToObj(d)
            const { batch_id, chain, key_id, status } = { ...d }
              return {
              ...d,
              batch_id: Array.isArray(batch_id) ? _.last(batch_id) : batch_id,
              chain: Array.isArray(chain) ? _.last(chain) : chain,
              key_id: Array.isArray(key_id) ? _.last(key_id) : key_id,
              status: Array.isArray(status) ? _.last(status) : status,
              created_at: {
                ms: d?.created_at?.ms ? d.created_at.ms : Array.isArray(d?.['created_at.ms']) ?
                  _.last(d['created_at.ms']) : d?.['created_at.ms'],
                ...(Array.isArray(d?.created_at) ? _.last(d.created_at) : d?.created_at),
              },
            }
          }) || []), 'batch_id'), ['created_at.ms'], ['desc'])
          response = await updateSigningBatches(response, true)
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

  useEffect(() => {
    if (data) {
      setTypes(_.countBy(_.uniqBy(data, 'batch_id').flatMap(b => b?.commands?.map(c => c?.type) || []).filter(t => t)))
    }
  }, [data])

  const updateSigningBatches = async (_data = [], is_after_search) => {
    const data = _.cloneDeep(_data)?.filter(b => ['BATCHED_COMMANDS_STATUS_SIGNING'].includes(b?.status))
    if (data?.length > 0) {
      if (is_after_search) {
        await sleep(0.5 * 1000)
      }
      for (let i = 0; i < data.length; i++) {
        const d = data[i]
        const { chain, batch_id, created_at } = { ...d }
        const params = {
          cmd: `axelard q evm batched-commands ${chain} ${batch_id} -oj`,
          cache: true,
          cache_timeout: 1,
        }
        if (created_at?.ms) {
          params.created_at = Number(created_at.ms) / 1000
        }
        const response = await axelard(params)
        const batch_data = to_json(response?.stdout)
        if (batch_data) {
          const data_index = _data.findIndex(b => equals_ignore_case(b?.batch_id, batch_id))
          if (data_index > -1) {
            _data[data_index] = batch_data
          }
        }
        await sleep(0.5 * 1000)
      }
      if (!is_after_search) {
        await sleep(0.5 * 1000)
      }
    }
    return _data
  }

  const data_filtered = data?.filter(d => !(filterTypes?.length > 0) || d?.commands?.findIndex(c => filterTypes.includes(c?.type)) > -1 || (filterTypes.includes('undefined') && !(d?.commands?.length > 0)))

  return (
    data ?
      <div className="grid gap-2">
        <div className="flex flex-col sm:flex-row items-center justify-between space-x-2 mb-2">
          <div className="flex flex-wrap items-center">
            {evm_chains_data?.map((c, i) => (
              <div
                key={i}
                className="my-1 mr-1.5"
              >
                {/*<PendingCommands chain={c} />*/}
              </div>
            ))}
          </div>
          <div className="block sm:flex sm:flex-wrap items-center justify-end overflow-x-auto space-x-1">
            {Object.entries({ ...types }).map(([k, v]) => (
              <div
                key={k}
                onClick={() => setFilterTypes(_.uniq(filterTypes?.includes(k) ? filterTypes.filter(t => !equals_ignore_case(t, k)) : _.concat(filterTypes || [], k)))}
                className={`max-w-min bg-trasparent ${filterTypes?.includes(k) ? 'bg-slate-200 dark:bg-slate-800 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium'} rounded-lg cursor-pointer whitespace-nowrap flex items-center space-x-1.5 text-xs ml-1 mb-1 py-0.5 px-1.5`}
                style={{ textTransform: 'none' }}
              >
                <span>
                  {k === 'undefined' ?
                    'Unknown' : k
                  }
                </span>
                <span className="text-blue-600 dark:text-blue-400">
                  {number_format(v, '0,0')}
                </span>
              </div>
            ))}
          </div>
        </div>
        <Datatable
          columns={[
            {
              Header: 'Batch ID',
              accessor: 'batch_id',
              disableSortBy: true,
              Cell: props => (
                <div className="flex items-center space-x-1 mb-3">
                  <Link href={`/batch/${props.row.original.chain}/${props.value}`}>
                    <a className="uppercase text-blue-600 dark:text-white font-bold">
                      {ellipse(props.value)}
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
              Header: 'Chain',
              accessor: 'chain',
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
              Header: 'Key ID',
              accessor: 'key_id',
              disableSortBy: true,
              Cell: props => (
                props.value && (
                  <Copy
                    value={props.value}
                    title={<span className="cursor-pointer text-slate-400 dark:text-slate-600 font-semibold">
                      {ellipse(props.value, 16)}
                    </span>}
                    size={18}
                  />
                )
              ),
            },
            {
              Header: 'Commands',
              accessor: 'commands',
              disableSortBy: true,
              Cell: props => {
                const chain_data = evm_chains_data?.find(c => equals_ignore_case(c?.id, props.row.original.chain))
                return assets_data && (
                  props.value?.length > 0 ?
                    <div className="flex flex-col space-y-2.5 mb-4">
                      {props.value.filter(c => c).map((c, i) => {
                        const { params, type } = { ...c }
                        const { symbol, amount, name, decimals, cap, account, salt, newOwners, newOperators, newThreshold } = { ...params }
                        const asset_data = assets_data?.find(a => equals_ignore_case(a?.symbol, symbol) || a?.contracts?.findIndex(_c => _c?.chain_id === chain_data?.chain_id && equals_ignore_case(_c.symbol, symbol)) > -1)
                        const contract_data = asset_data?.contracts?.find(_c => _c.chain_id === chain_data?.chain_id)
                        const _decimals = contract_data?.decimals || asset_data?.decimals || 18
                        const _symbol = contract_data?.symbol || asset_data?.symbol || symbol
                        const image = contract_data?.image || asset_data?.image
                        return (
                          <div
                            key={i}
                            className="flex items-center space-x-2"
                          >
                            <div className="max-w-min bg-slate-100 dark:bg-slate-900 rounded-lg capitalize font-semibold py-1 px-2">
                              {type}
                            </div>
                            {symbol && (
                              <div className="min-w-max max-w-min bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center sm:justify-end space-x-1.5 py-1 px-2.5">
                                {image && (
                                  <Image
                                    src={image}
                                    className="w-5 h-5 rounded-full"
                                  />
                                )}
                                <span className="text-sm font-semibold">
                                  {amount && (
                                    <span className="mr-1">
                                      {number_format(utils.formatUnits(BigNumber.from(amount), _decimals), '0,0.000', true)}
                                    </span>
                                  )}
                                  <span>
                                    {_symbol}
                                  </span>
                                </span>
                              </div>
                            )}
                            {name && (
                              <div className="flex flex-col">
                                <span className="font-semibold">
                                  {name}
                                </span>
                                <div className="flex items-center space-x-1.5">
                                  {decimals && (
                                    <span className="text-slate-400 dark:text-slate-600 text-xs">
                                      decimals: {number_format(decimals, '0,0')}
                                    </span>
                                  )}
                                  {cap && (
                                    <span className="text-slate-400 dark:text-slate-600 text-xs">
                                      cap: {number_format(cap, '0,0')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            {account ?
                              <>
                                <BiRightArrowCircle size={20} />
                                <div className="flex items-center space-x-1">
                                  <EnsProfile
                                    address={account}
                                    fallback={account && (
                                      <Copy
                                        value={account}
                                        title={<span className="text-slate-400 dark:text-slate-200 text-sm">
                                          <span className="xl:hidden">
                                            {ellipse(account, 6)}
                                          </span>
                                          <span className="hidden xl:block">
                                            {ellipse(account, 8)}
                                          </span>
                                        </span>}
                                        size={18}
                                      />
                                    )}
                                  />
                                  {chain_data?.explorer?.url && (
                                    <a
                                      href={`${chain_data.explorer.url}${chain_data.explorer.address_path?.replace('{address}', account)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="min-w-max text-blue-600 dark:text-white"
                                    >
                                      {chain_data.explorer.icon ?
                                        <Image
                                          src={chain_data.explorer.icon}
                                          className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                        />
                                        :
                                        <TiArrowRight size={16} className="transform -rotate-45" />
                                      }
                                    </a>
                                  )}
                                </div>
                              </>
                              :
                              salt && (
                                <div className="flex items-center space-x-1">
                                  <span className="text-slate-400 dark:text-slate-600 font-medium">
                                    Salt:
                                  </span>
                                  <Copy
                                    value={salt}
                                    title={<span className="text-slate-400 dark:text-slate-600 text-xs font-semibold">
                                      {ellipse(salt, 8)}
                                    </span>}
                                  />
                                </div>
                              )
                            }
                            {newOwners && (
                              <div className="max-w-min bg-slate-100 dark:bg-slate-900 rounded-lg space-x-1 py-1 px-2">
                                <span className="font-semibold">
                                  {number_format(newOwners.split(';').length, '0,0')}
                                </span>
                                <span className="font-medium">
                                  New Owners
                                </span>
                              </div>
                            )}
                            {newOperators && (
                              <div className="max-w-min bg-slate-100 dark:bg-slate-900 rounded-lg space-x-1 py-1 px-2">
                                <span className="font-semibold">
                                  {number_format(newOperators.split(';').length, '0,0')}
                                </span>
                                <span className="font-medium">
                                  New Operators
                                </span>
                              </div>
                            )}
                            {newThreshold && (
                              <div className="flex items-center space-x-1">
                                <span className="font-medium">
                                  Threshold:
                                </span>
                                <span className="text-slate-600 dark:text-slate-400 text-xs font-semibold">
                                  {number_format(newThreshold, '0,0')}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    :
                    <span>
                      -
                    </span>
                )
              },
            },
            {
              Header: 'Status',
              accessor: 'status',
              disableSortBy: true,
              Cell: props => (
                props.value && (
                  <div className={`max-w-min ${equals_ignore_case(props.value, 'BATCHED_COMMANDS_STATUS_SIGNED') ? 'bg-green-500 dark:bg-green-600 text-white' : 'bg-slate-100 dark:bg-slate-900'} rounded-lg uppercase flex items-center text-xs lg:text-sm font-semibold space-x-1 -mt-0.5 py-0.5 px-1.5`}>
                    {equals_ignore_case(props.value, 'BATCHED_COMMANDS_STATUS_SIGNED') ?
                      <BiCheckCircle size={20} />
                      :
                      <HiOutlineClock size={20} />
                    }
                    <span className="capitalize">
                      {props.value?.replace('BATCHED_COMMANDS_STATUS_', '').toLowerCase()}
                    </span>
                  </div>
                )
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
          data={data_filtered}
          noPagination={data_filtered.length <= 10}
          defaultPageSize={50}
          className="min-h-full no-border"
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