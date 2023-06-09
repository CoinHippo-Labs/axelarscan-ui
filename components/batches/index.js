import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { BigNumber, utils } from 'ethers'
import { ProgressBar, ColorRing } from 'react-loader-spinner'
import { BiRightArrowCircle, BiCheckCircle, BiXCircle } from 'react-icons/bi'
import { MdOutlineWatchLater } from 'react-icons/md'
import { TiArrowRight } from 'react-icons/ti'

import PendingCommands from './pending-commands'
import Datatable from '../datatable'
import EnsProfile from '../ens-profile'
import Image from '../image'
import Copy from '../copy'
import TimeAgo from '../time-ago'
import { batched_commands } from '../../lib/api/lcd'
import { batches as getBatches } from '../../lib/api/batches'
import { getChain, chainManager } from '../../lib/object/chain'
import { number_format, ellipse, equalsIgnoreCase, to_json, params_to_obj, loader_color, sleep } from '../../lib/utils'

const LIMIT = 25

export default () => {
  const {
    preferences,
    evm_chains,
    cosmos_chains,
    assets,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
        evm_chains: state.evm_chains,
        cosmos_chains: state.cosmos_chains,
        assets: state.assets,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    evm_chains_data,
  } = { ...evm_chains }
  const {
    cosmos_chains_data,
  } = { ...cosmos_chains }
  const {
    assets_data,
  } = { ...assets }

  const router = useRouter()
  const {
    pathname,
    asPath,
  } = { ...router }

  const [data, setData] = useState(null)
  const [total, setTotal] = useState(null)
  const [offset, setOffet] = useState(0)
  const [fetchTrigger, setFetchTrigger] = useState(null)
  const [fetching, setFetching] = useState(false)
  const [filters, setFilters] = useState(null)
  const [types, setTypes] = useState(null)
  const [filterTypes, setFilterTypes] = useState(null)

  useEffect(
    () => {
      if (asPath) {
        const params = params_to_obj(asPath.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))

        const {
          batchId,
          commandId,
          chain,
          keyId,
          type,
          status,
          fromTime,
          toTime,
        } = { ...params }

        setFilters(
          {
            batchId,
            commandId,
            chain,
            keyId,
            type,
            status:
              [
                'executed',
                'unexecuted',
                'signed',
                'signing',
                'aborted',
              ]
              .includes(status?.toLowerCase()) ?
                status.toLowerCase() :
                undefined,
            time: fromTime && toTime && [moment(Number(fromTime)), moment(Number(toTime))],
          }
        )
      }
    },
    [asPath],
  )

  useEffect(
    () => {
      const triggering = is_interval => setFetchTrigger(is_interval ? moment().valueOf() : typeof fetchTrigger === 'number' ? null : 0)

      if (evm_chains_data && pathname && filters) {
        triggering()
      }

      const interval = setInterval(() => triggering(true), 5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [evm_chains_data, pathname, filters],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (filters) {
          setFetching(true)

          if (!fetchTrigger) {
            setTotal(null)
            setData(null)
            setOffet(0)
          }

          const _data = !fetchTrigger ? [] : data || []
          const size = LIMIT
          const from = fetchTrigger === true || fetchTrigger === 1 ? _data.length : 0

          const {
            chain,
            batchId,
            commandId,
            keyId,
            type,
            status,
            time,
          } = { ...filters }

          let response =
            await getBatches(
              {
                chain,
                batchId,
                commandId,
                keyId,
                type,
                status,
                fromTime: _.head(time)?.unix(),
                toTime: _.last(time)?.unix(),
                from,
                size,
              },
            )

          if (response) {
            const {
              total,
            } = { ...response }

            setTotal(total)

            if (['signing', 'unexecuted'].includes(status)) {
              updateSigningBatches(response.data, true)
            }

            response =
              _.orderBy(
                _.uniqBy(
                  _.concat(
                    (response.data || [])
                      .map(d => {
                        const {
                          batch_id,
                          chain,
                          key_id,
                          status,
                          created_at,
                        } = { ...d }
                        const {
                          ms,
                        } = { ...created_at }

                        return {
                          ...d,
                          batch_id: Array.isArray(batch_id) ? _.last(batch_id) : batch_id,
                          chain: Array.isArray(chain) ? _.last(chain) : chain,
                          key_id: Array.isArray(key_id) ? _.last(key_id) : key_id,
                          status: Array.isArray(status) ? _.last(status) : status,
                          created_at: {
                            ms: ms ? ms : Array.isArray(d?.['created_at.ms']) ? _.last(d['created_at.ms']) : d?.['created_at.ms'],
                            ...(Array.isArray(created_at) ? _.last(created_at) : created_at),
                          },
                        }
                      }),
                    _data,
                  ),
                  'batch_id',
                ),
                ['created_at.ms'],
                ['desc'],
              )

            if (!['signing', 'unexecuted'].includes(status)) {
              response = await updateSigningBatches(response, true)
            }

            setData(response)
          }
          else if (!fetchTrigger) {
            setTotal(0)
            setData([])
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
        setTypes(
          _.countBy(
            _.uniqBy(data, 'batch_id')
              .flatMap(b => (b?.commands || []).map(c => c?.type))
              .filter(t => t)
          )
        )
      }
    },
    [data],
  )

  const updateSigningBatches = async (
    _data = [],
    is_after_search,
  ) => {

    const data =
      (_.cloneDeep(_data) || [])
        .filter(b =>
          ['BATCHED_COMMANDS_STATUS_SIGNING'].includes(b?.status) ||
          (['BATCHED_COMMANDS_STATUS_SIGNED'].includes(b?.status) && (b.commands || []).findIndex(c => !c?.executed) > -1) ||
          (b.commands || []).length < 1
        )

    if (data.length > 0) {
      if (is_after_search) {
        await sleep(0.5 * 1000)
      }

      for (const d of data) {
        const {
          chain,
          batch_id,
          created_at,
        } = { ...d }

        const {
          ms,
        } = { ...created_at }

        const response =
          await batched_commands(
            chain,
            batch_id,
            { created_at: ms ? Number(ms) / 1000 : undefined },
          )

        const batch_data = { ...response }

        if (batch_data) {
          const data_index = _data.findIndex(b => equalsIgnoreCase(b?.batch_id, batch_id))

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

  const chains_data = _.concat(evm_chains_data, cosmos_chains_data)

  const data_filtered =
    data &&
    data.filter(d =>
      !(filterTypes?.length > 0) ||
      (d?.commands || []).findIndex(c => filterTypes.includes(c?.type)) > -1 ||
      (filterTypes.includes('undefined') && !(d?.commands?.length > 0))
    )

  return (
    data ?
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between space-y-2 sm:space-y-0 space-x-0 sm:space-x-2 -mt-0.5">
          <div className="space-y-1.5">
            {
              typeof total === 'number' &&
              (
                <div className="flex items-center space-x-1.5 sm:mb-1">
                  <span className="tracking-wider text-sm font-semibold">
                    {number_format(total, '0,0')}
                  </span>
                  <span className="tracking-wider text-sm">
                    Results
                  </span>
                </div>
              )
            }
            <div className="flex flex-wrap items-center">
              {(evm_chains_data || [])
                .filter(c => !c?.no_inflation && !c?.deprecated)
                .map((c, i) => (
                  <div
                    key={i}
                    className="mb-1 mr-1.5"
                  >
                    <PendingCommands chain_data={c} />
                  </div>
                ))
              }
            </div>
          </div>
          <div className="overflow-x-auto block sm:flex sm:flex-wrap items-center justify-start sm:justify-end sm:space-x-2.5">
            {Object.entries({ ...types })
              .map(([k, v]) => (
                <div
                  key={k}
                  onClick={() => setFilterTypes(_.uniq(filterTypes?.includes(k) ? filterTypes.filter(t => !equalsIgnoreCase(t, k)) : _.concat(filterTypes || [], k)))}
                  className={`max-w-min bg-trasparent ${filterTypes?.includes(k) ? 'font-bold' : 'text-slate-400 hover:text-black dark:text-slate-600 dark:hover:text-white hover:font-medium'} cursor-pointer whitespace-nowrap flex items-center text-xs space-x-1 mr-1 mt-1`}
                  style={{ textTransform: 'none' }}
                >
                  <span>
                    {k === 'undefined' ? 'Unknown' : k}
                  </span>
                  <span className="text-blue-500 dark:text-white">
                    {number_format(v, '0,0')}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
        <Datatable
          columns={
            [
              {
                Header: 'Batch ID',
                accessor: 'batch_id',
                disableSortBy: true,
                Cell: props => {
                  const {
                    value,
                  } = { ...props }

                  const {
                    chain,
                    commands,
                  } = { ...props.row.original }

                  const _types =
                    _.countBy(
                      _.uniqBy(commands || [], 'id')
                        .map(c => c?.type)
                        .filter(t => t)
                    )

                  return (
                    <div className="flex flex-col space-y-2 mb-3">
                      <div className="flex items-center space-x-1">
                        <Link href={`/batch/${chain}/${value}`}>
                          <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                          >
                            {ellipse(value, 10)}
                          </a>
                        </Link>
                        <Copy
                          value={value}
                        />
                      </div>
                      <div className="overflow-x-auto block sm:flex sm:flex-wrap items-center justify-start">
                        {Object.entries({ ..._types })
                          .map(([k, v]) => (
                            <div
                              key={k}
                              className="max-w-min bg-trasparent rounded-lg whitespace-nowrap flex items-center text-xs text-slate-600 dark:text-slate-400 font-medium space-x-1.5 mr-3 mb-1"
                              style={{ textTransform: 'none' }}
                            >
                              <span>
                                {k === 'undefined' ? 'Unknown' : k}
                              </span>
                              <span className="text-blue-500 dark:text-white">
                                {number_format(v, '0,0')}
                              </span>
                            </div>
                          ))
                        }
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
                  const {
                    value,
                  } = { ...props }

                  const name = chainManager.name(value, chains_data)
                  const image = chainManager.image(value, chains_data)

                  return (
                    image ?
                      <Image
                        title={name}
                        src={image}
                        className="w-6 h-6 rounded-full"
                      /> :
                      <span className="font-medium">
                        {name}
                      </span>
                  )
                },
              },
              {
                Header: 'Key ID',
                accessor: 'key_id',
                disableSortBy: true,
                Cell: props => (
                  props.value &&
                  (
                    <Copy
                      size={16}
                      value={props.value}
                      title={
                        <span className="cursor-pointer text-slate-400 dark:text-slate-600 text-xs font-medium">
                          {ellipse(props.value, 16)}
                        </span>
                      }
                    />
                  )
                ),
                headerClassName: 'whitespace-nowrap',
              },
              {
                Header: 'Commands',
                accessor: 'commands',
                disableSortBy: true,
                Cell: props => {
                  const {
                    value,
                  } = { ...props }

                  const {
                    batch_id,
                    chain,
                  } = { ...props.row.original }

                  const chain_data = getChain(chain, chains_data)

                  const {
                    chain_id,
                    explorer,
                  } = { ...chain_data }

                  return (
                    assets_data &&
                    (value?.length > 0 ?
                      <div className="flex flex-col space-y-2.5 mb-4">
                        {_.slice(value, 0, 10)
                          .filter(c => c)
                          .map((c, i) => {
                            const {
                              id,
                              params,
                              type,
                              deposit_address,
                              executed,
                              transactionHash,
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
                            let {
                              symbol,
                              decimals,
                            } = { ...params }

                            const asset_data = (assets_data || []).find(a => equalsIgnoreCase(a?.symbol, symbol) || (a?.contracts || []).findIndex(_c => _c?.chain_id === chain_id && equalsIgnoreCase(_c.symbol, symbol)) > -1)

                            const {
                              contracts,
                            } = { ...asset_data }

                            const contract_data = (contracts || []).find(_c => _c.chain_id === chain_id)

                            let {
                              image,
                            } = { ...contract_data }

                            decimals = contract_data?.decimals || asset_data?.decimals || decimals || 18
                            symbol = contract_data?.symbol || asset_data?.symbol || symbol
                            image = image || asset_data?.image

                            const source_chain_data = getChain(sourceChain, chains_data)

                            const transfer_id = parseInt(id, 16)

                            const typeComponent = (
                              <div
                                title={executed ? 'Executed' : ''}
                                className={`w-fit max-w-min ${executed ? 'bg-green-200 dark:bg-green-300 border-2 border-green-400 dark:border-green-600 text-green-500 dark:text-green-700 font-semibold py-0.5 px-1.5' : 'bg-slate-100 dark:bg-slate-900 font-medium py-1 px-2'} rounded-lg capitalize text-xs mb-1 mr-2`}
                              >
                                {type}
                              </div>
                            )

                            return (
                              <div
                                key={i}
                                className="flex flex-wrap items-center"
                              >
                                {
                                  typeComponent &&
                                  (
                                    transactionHash && explorer ?
                                      <a
                                        href={`${explorer.url}${explorer.transaction_path?.replace('{tx}', transactionHash)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                                      >
                                        {typeComponent}
                                      </a> :
                                      typeComponent
                                  )
                                }
                                {
                                  source_chain_data &&
                                  (
                                    <div className="flex items-center space-x-1 mb-1 mr-2">
                                      {source_chain_data.image ?
                                        <Image
                                          src={source_chain_data.image}
                                          className="w-5 h-5 rounded-full"
                                        /> :
                                        <span className="font-medium">
                                          {source_chain_data.name}
                                        </span>
                                      }
                                      {
                                        sourceTxHash &&
                                        (
                                          <div className="flex items-center space-x-1">
                                            <Link href={`/gmp/${sourceTxHash}`}>
                                              <a
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                                              >
                                                GMP
                                              </a>
                                            </Link>
                                            {
                                              source_chain_data.explorer?.url &&
                                              (
                                                <a
                                                  href={`${source_chain_data.explorer.url}${source_chain_data.explorer.transaction_path?.replace('{tx}', sourceTxHash)}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="min-w-max text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400"
                                                >
                                                  {source_chain_data.explorer.icon ?
                                                    <Image
                                                      src={source_chain_data.explorer.icon}
                                                      className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                                    /> :
                                                    <TiArrowRight
                                                      size={16}
                                                      className="transform -rotate-45"
                                                    />
                                                  }
                                                </a>
                                              )
                                            }
                                          </div>
                                        )
                                      }
                                      {
                                        contractAddress &&
                                        (
                                          <>
                                            <BiRightArrowCircle
                                              size={18}
                                            />
                                            <div className="flex items-center space-x-1">
                                              <EnsProfile
                                                address={contractAddress}
                                                fallback={
                                                  contractAddress &&
                                                  (
                                                    <Copy
                                                      value={contractAddress}
                                                      title={
                                                        <span className="cursor-pointer text-slate-400 dark:text-slate-200 text-sm">
                                                          <span className="xl:hidden">
                                                            {ellipse(contractAddress, 6)}
                                                          </span>
                                                          <span className="hidden xl:block">
                                                            {ellipse(contractAddress, 8)}
                                                          </span>
                                                        </span>
                                                      }
                                                    />
                                                  )
                                                }
                                                className="tracking-wider text-black dark:text-white text-sm font-medium"
                                              />
                                              {
                                                explorer?.url &&
                                                (
                                                  <a
                                                    href={`${explorer.url}${explorer.address_path?.replace('{address}', contractAddress)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="min-w-max text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400"
                                                  >
                                                    {explorer.icon ?
                                                      <Image
                                                        src={explorer.icon}
                                                        className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                                      /> :
                                                      <TiArrowRight
                                                        size={16}
                                                        className="transform -rotate-45"
                                                      />
                                                    }
                                                  </a>
                                                )
                                              }
                                            </div>
                                          </>
                                        )
                                      }
                                    </div>
                                  )
                                }
                                {
                                  symbol && !['approveContractCall'].includes(type) &&
                                  (
                                    <div className="min-w-max max-w-min flex items-center justify-center sm:justify-end space-x-1.5 mb-1 mr-2">
                                      {
                                        image &&
                                        (
                                          <Image
                                            src={image}
                                            className="w-5 h-5 rounded-full"
                                          />
                                        )
                                      }
                                      <span className="text-sm font-medium">
                                        {
                                          amount > 0 &&
                                          (
                                            <span className="mr-1">
                                              {number_format(utils.formatUnits(BigNumber.from(amount), decimals), '0,0.000000', true)}
                                            </span>
                                          )
                                        }
                                        <span>
                                          {symbol}
                                        </span>
                                      </span>
                                    </div>
                                  )
                                }
                                {
                                  ['mintToken'].includes(type) && typeof transfer_id === 'number' &&
                                  (
                                    <div className="flex items-center space-x-1 mb-1 mr-2">
                                      <Link href={`/transfer?transfer_id=${transfer_id}`}>
                                        <a
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                                        >
                                          Transfer
                                        </a>
                                      </Link>
                                    </div>
                                  )
                                }
                                {
                                  name &&
                                  (
                                    <div className="flex flex-col mb-1 mr-2">
                                      <span className="font-medium">
                                        {name}
                                      </span>
                                      <div className="flex items-center space-x-1.5">
                                        {
                                          decimals &&
                                          (
                                            <span className="text-slate-400 dark:text-slate-600 text-xs space-x-1">
                                              <span className="font-medium">
                                                decimals:
                                              </span>
                                              <span>
                                                {number_format(decimals, '0,0')}
                                              </span>
                                            </span>
                                          )
                                        }
                                        {
                                          cap &&
                                          (
                                            <span className="text-slate-400 dark:text-slate-600 text-xs space-x-1">
                                              <span className="font-medium">
                                                cap:
                                              </span>
                                              <span>
                                                {number_format(cap, '0,0')}
                                              </span>
                                            </span>
                                          )
                                        }
                                      </div>
                                    </div>
                                  )
                                }
                                {account ?
                                  <div className="flex items-center space-x-1 mb-1 mr-2">
                                    <BiRightArrowCircle
                                      size={18}
                                    />
                                    <div className="flex items-center space-x-1">
                                      <EnsProfile
                                        address={account}
                                        fallback={
                                          account &&
                                          (
                                            <Copy
                                              value={account}
                                              title={
                                                <span className="cursor-pointer text-slate-400 dark:text-slate-200 text-xs">
                                                  <span className="xl:hidden">
                                                    {ellipse(account, 6)}
                                                  </span>
                                                  <span className="hidden xl:block">
                                                    {ellipse(account, 8)}
                                                  </span>
                                                </span>
                                              }
                                            />
                                          )
                                        }
                                        className="tracking-wider text-black dark:text-white text-sm font-medium"
                                      />
                                      {
                                        explorer?.url &&
                                        (
                                          <a
                                            href={`${explorer.url}${explorer.address_path?.replace('{address}', account)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="min-w-max text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400"
                                          >
                                            {explorer.icon ?
                                              <Image
                                                src={explorer.icon}
                                                className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                              /> :
                                              <TiArrowRight
                                                size={16}
                                                className="transform -rotate-45"
                                              />
                                            }
                                          </a>
                                        )
                                      }
                                    </div>
                                  </div> :
                                  salt &&
                                  (
                                    <div className="flex items-center space-x-1 mb-1 mr-2">
                                      <span className="text-slate-400 dark:text-slate-600 font-medium">
                                        {deposit_address ? 'Deposit address' : 'Salt'}:
                                      </span>
                                      {deposit_address ?
                                        <>
                                          <a
                                            href={`/account/${deposit_address}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-slate-400 dark:text-slate-600 text-xs font-medium"
                                          >
                                            {ellipse(deposit_address, 8)}
                                          </a>
                                          <Copy
                                            value={deposit_address}
                                          />
                                        </> :
                                        <Copy
                                          value={salt}
                                          title={
                                            <span className="text-slate-400 dark:text-slate-600 text-xs font-medium">
                                              {ellipse(salt, 8)}
                                            </span>
                                          }
                                        />
                                      }
                                    </div>
                                  )
                                }
                                {
                                  newOwners &&
                                  (
                                    <div className="max-w-min bg-slate-100 dark:bg-slate-900 rounded-lg space-x-1 py-1 px-2 mb-1 mr-2">
                                      <span className="text-xs font-medium">
                                        {number_format(newOwners.split(';').length, '0,0')}
                                      </span>
                                      <span className="text-xs font-medium">
                                        New Owners
                                      </span>
                                    </div>
                                  )
                                }
                                {
                                  newOperators &&
                                  (
                                    <div className="max-w-min bg-slate-100 dark:bg-slate-900 rounded-lg space-x-1 py-1 px-2 mb-1 mr-2">
                                      <span className="text-xs font-medium">
                                        {number_format(newOperators.split(';').length, '0,0')}
                                      </span>
                                      <span className="text-xs font-medium">
                                        New Operators
                                      </span>
                                      {
                                        newWeights &&
                                        (
                                          <span className="text-xs font-medium">
                                            [{number_format(_.sum(newWeights.split(';').map(w => Number(w))), '0,0')}]
                                          </span>
                                        )
                                      }
                                    </div>
                                  )
                                }
                                {
                                  newThreshold &&
                                  (
                                    <div className="flex items-center space-x-1 mb-1 mr-2">
                                      <span className="text-xs font-medium">
                                        Threshold:
                                      </span>
                                      <span className="text-slate-600 dark:text-slate-400 text-xs font-medium">
                                        {number_format(newThreshold, '0,0')}
                                      </span>
                                    </div>
                                  )
                                }
                              </div>
                            )
                          })
                        }
                        {
                          value.length > 10 &&
                          (
                            <Link href={`/batch/${chain}/${batch_id}`}>
                              <a
                                target="_blank"
                                rel="noopener noreferrer"
                                className="whitespace-nowrap text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium space-x-1 ml-1"
                              >
                                <span>
                                  and
                                </span>
                                <span>
                                  {number_format(value.length - 10, '0,0')}
                                </span>
                                <span>
                                  more
                                </span>
                              </a>
                            </Link>
                          )
                        }
                      </div> :
                      <span>
                        -
                      </span>
                    )
                  )
                },
              },
              {
                Header: 'Status',
                accessor: 'status',
                disableSortBy: true,
                Cell: props => {
                  const {
                    value,
                  } = { ...props }

                  const {
                    commands,
                  } = { ...props.row.original }

                  const executed = commands && commands.length === commands.filter(c => c?.executed).length

                  return (
                    value &&
                    (
                      <div className={`max-w-min ${executed ? 'bg-green-200 dark:bg-green-300 border-2 border-green-400 dark:border-green-600 text-green-500 dark:text-green-700' : 'bg-slate-100 dark:bg-slate-800'} rounded-lg flex items-center space-x-1 py-0.5 px-1.5`}>
                        {equalsIgnoreCase(value, 'BATCHED_COMMANDS_STATUS_SIGNED') || executed ?
                          <BiCheckCircle
                            size={18}
                          /> :
                          equalsIgnoreCase(value, 'BATCHED_COMMANDS_STATUS_SIGNING') ?
                            <MdOutlineWatchLater
                              size={18}
                            /> :
                            <BiXCircle
                              size={18}
                            />
                        }
                        <span className="capitalize text-xs font-semibold">
                          {(executed ? 'Executed' : value.replace('BATCHED_COMMANDS_STATUS_', '')).toLowerCase()}
                        </span>
                      </div>
                    )
                  )
                },
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
            ]
          }
          data={data_filtered}
          noPagination={data_filtered.length <= 10}
          defaultPageSize={25}
          className="min-h-full no-border"
        />
        {
          data.length > 0 && (typeof total !== 'number' || data.length < total) &&
          (!fetching ?
            <div className="flex justify-center">
              <button
                onClick={
                  () => {
                    setOffet(data.length)
                    setFetchTrigger(typeof fetchTrigger === 'number' ? true : 1)
                  }
                }
                className="max-w-min whitespace-nowrap text-slate-400 hover:text-blue-500 dark:text-slate-600 dark:hover:text-blue-500 font-normal hover:font-medium mx-auto"
              >
                Load more
              </button>
            </div> :
            <div className="flex justify-center">
              <ColorRing
                color={loader_color(theme)}
                width="32"
                height="32"
              />
            </div>
          )
        }
      </div> :
      <ProgressBar
        borderColor={loader_color(theme)}
        width="36"
        height="36"
      />
  )
}