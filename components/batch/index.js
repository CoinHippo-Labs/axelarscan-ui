import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { BigNumber, utils } from 'ethers'
import { TailSpin } from 'react-loader-spinner'
import { BiCheckCircle } from 'react-icons/bi'
import { HiOutlineClock } from 'react-icons/hi'
import { RiKeyFill } from 'react-icons/ri'
import { TiArrowRight } from 'react-icons/ti'
import { BsFillArrowLeftCircleFill } from 'react-icons/bs'

import Datatable from '../datatable'
import EnsProfile from '../ens-profile'
import Image from '../image'
import Copy from '../copy'
import { axelard } from '../../lib/api/executor'
import { number_format, ellipse, equals_ignore_case, to_json, loader_color } from '../../lib/utils'

export default () => {
  const { preferences, evm_chains, assets } = useSelector(state => ({ preferences: state.preferences, evm_chains: state.evm_chains, assets: state.assets }), shallowEqual)
  const { theme } = { ...preferences }
  const { evm_chains_data } = { ...evm_chains }
  const { assets_data } = { ...assets }

  const router = useRouter()
  const { pathname, query } = { ...router }
  const { chain, id } = { ...query }

  const [data, setData] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const getData = async is_interval => {
      if (chain && id) {
        if (!controller.signal.aborted) {
          const response = await axelard({
            cmd: `axelard q evm batched-commands ${chain} ${id} -oj`,
            cache: true,
            cache_timeout: 1,
          })
          setData({
            data: { ...to_json(response?.stdout) },
            chain,
            id,
          })
        }
      }
    }
    getData()
    const interval = setInterval(() => getData(true), 3 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [chain, id])

  const chain_data = evm_chains_data?.find(c => equals_ignore_case(c?.id, chain))
  const { key_id, status, created_at, commands, signature, prev_batched_commands_id } = { ...data?.data }

  return (
    <div className="space-y-6 mb-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {chain_data?.image && (
              <Image
                src={chain_data.image}
                alt=""
                className="w-6 h-6 rounded-full"
              />
            )}
            <span className="text-base font-bold">
              {chain_data?.name}
            </span>
          </div>
          {status && (
            <div className={`max-w-min ${equals_ignore_case(status, 'BATCHED_COMMANDS_STATUS_SIGNED') ? 'bg-green-500 dark:bg-green-600 text-white' : 'bg-slate-100 dark:bg-slate-900'} rounded-lg uppercase flex items-center text-xs lg:text-sm font-semibold space-x-1 py-0.5 px-1.5`}>
              {equals_ignore_case(status, 'BATCHED_COMMANDS_STATUS_SIGNED') ?
                <BiCheckCircle size={20} />
                :
                <HiOutlineClock size={20} />
              }
              <span className="capitalize">
                {status.replace('BATCHED_COMMANDS_STATUS_', '').toLowerCase()}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
          {equals_ignore_case(data?.id, id) ?
            <div className="flex items-center text-slate-700 dark:text-slate-300 space-x-2">
              <RiKeyFill size={20} />
              <span className="text-base font-medium">
                {key_id || 'Unknown'}
              </span>
            </div>
            :
            <div className="skeleton w-48 h-6" />
          }
          {equals_ignore_case(data?.id, id) ?
            created_at && (
              <div className="text-slate-400 dark:text-slate-600">
                {moment(created_at.ms).format('MMM D, YYYY h:mm:ss A')}
              </div>
            )
            :
            <div className="skeleton w-32 h-6" />
          }
        </div>
      </div>
      {commands ?
        <Datatable
          columns={[
            {
              Header: 'Command ID',
              accessor: 'id',
              disableSortBy: true,
              Cell: props => (
                <Copy
                  value={props.value}
                  title={<span className="uppercase text-slate-400 dark:text-slate-600 text-xs font-semibold">
                    {ellipse(props.value, 8)}
                  </span>}
                />
              ),
              headerClassName: 'whitespace-nowrap',
            },
            {
              Header: 'Type',
              accessor: 'type',
              disableSortBy: true,
              Cell: props => (
                props.value ?
                  <div className="max-w-min bg-slate-100 dark:bg-slate-900 rounded-lg capitalize font-semibold py-1 px-2">
                    {props.value}
                  </div>
                  :
                  <span className="text-slate-400 dark:text-slate-600">
                    Unknown
                  </span>
              ),
            },
            {
              Header: 'Account',
              accessor: 'params.account',
              disableSortBy: true,
              Cell: props => (
                props.value ?
                  <div className="flex items-center space-x-1">
                    <EnsProfile
                      address={props.value}
                      fallback={props.value && (
                        <Copy
                          value={props.value}
                          title={<span className="text-slate-400 dark:text-slate-200 text-sm">
                            <span className="xl:hidden">
                              {ellipse(props.value, 6)}
                            </span>
                            <span className="hidden xl:block">
                              {ellipse(props.value, 8)}
                            </span>
                          </span>}
                          size={18}
                        />
                      )}
                    />
                    {chain_data?.explorer?.url && (
                      <a
                        href={`${chain_data.explorer.url}${chain_data.explorer.address_path?.replace('{address}', props.value)}`}
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
                  </div> :
                  props.row.original.params?.salt ?
                    <div className="flex items-center space-x-1">
                      <span className="text-slate-400 dark:text-slate-600 font-medium">
                        Salt:
                      </span>
                      <Copy
                        value={props.row.original.params.salt}
                        title={<span className="text-slate-400 dark:text-slate-600 text-xs font-semibold">
                          {ellipse(props.row.original.params.salt, 8)}
                        </span>}
                      />
                    </div> :
                    props.row.original.params?.newOwners || props.row.original.params?.newOperators ?
                      <div className="max-w-xl flex flex-wrap">
                        {(props.row.original.params?.newOwners || props.row.original.params?.newOperators).split(';').map((o, i) => (
                          <div
                            key={i}
                            className="flex items-center space-x-1 mb-1 mr-2"
                          >
                            <EnsProfile
                              address={o}
                              fallback={o && (
                                <Copy
                                  value={o}
                                  title={<span className="text-slate-400 dark:text-slate-200 text-sm">
                                    <span className="xl:hidden">
                                      {ellipse(o, 6)}
                                    </span>
                                    <span className="hidden xl:block">
                                      {ellipse(o, 8)}
                                    </span>
                                  </span>}
                                  size={18}
                                />
                              )}
                            />
                            {chain_data?.explorer?.url && (
                              <a
                                href={`${chain_data.explorer.url}${chain_data.explorer.address_path?.replace('{address}', o)}`}
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
                        ))}
                      </div> :
                      props.row.original.params?.name ?
                        <div className="flex flex-col">
                          <span className="font-semibold">
                            {props.row.original.params.name}
                          </span>
                          <div className="flex items-center space-x-1.5">
                            {props.row.original.params.decimals && (
                              <span className="text-slate-400 dark:text-slate-600 text-xs">
                                decimals: {number_format(props.row.original.params.decimals, '0,0')}
                              </span>
                            )}
                            {props.row.original.params.cap && (
                              <span className="text-slate-400 dark:text-slate-600 text-xs">
                                cap: {number_format(props.row.original.params.cap, '0,0')}
                              </span>
                            )}
                          </div>
                        </div> :
                        <span className="text-slate-400 dark:text-slate-600">
                          Unknown
                        </span>
              ),
            },
            {
              Header: 'Amount',
              accessor: 'params.amount',
              disableSortBy: true,
              Cell: props => {
                const { params } = { ...props.row.original }
                const { symbol, amount, newThreshold } = { ...params }
                const asset_data = assets_data?.find(a => equals_ignore_case(a?.symbol, symbol) || a?.contracts?.findIndex(_c => _c?.chain_id === chain_data?.chain_id && equals_ignore_case(_c.symbol, symbol)) > -1)
                const contract_data = asset_data?.contracts?.find(_c => _c.chain_id === chain_data?.chain_id)
                const _decimals = contract_data?.decimals || asset_data?.decimals || 18
                const _symbol = contract_data?.symbol || asset_data?.symbol || symbol
                const image = contract_data?.image || asset_data?.image
                return (
                  <div className="flex items-center space-x-2">
                    {symbol ?
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
                      :
                      newThreshold && (
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">
                            Threshold:
                          </span>
                          <span className="text-slate-600 dark:text-slate-400 text-xs font-semibold">
                            {number_format(newThreshold, '0,0')}
                          </span>
                        </div>
                      )
                    }
                  </div>
                )
              },
            },
            {
              Header: 'Max Gas Cost',
              accessor: 'max_gas_cost',
              disableSortBy: true,
              Cell: props => (
                <div className="font-medium text-right">
                  {number_format(props.value, '0,0.00000000', true)}
                </div>
              ),
              headerClassName: 'whitespace-nowrap justify-end text-right',
            },
          ]}
          data={commands}
          noPagination={commands.length <= 10}
          defaultPageSize={10}
          className="min-h-full small no-border"
        />
        :
        <TailSpin color={loader_color(theme)} width="32" height="32" />
      }
      <div className="space-y-2">
        <span className="text-base font-semibold">
          Data
        </span>
        {equals_ignore_case(data?.id, id) ?
          data?.data?.data ?
            <div className="flex items-start">
              <div className="w-full bg-slate-100 dark:bg-slate-900 break-all rounded-xl text-slate-400 dark:text-slate-600 text-xs lg:text-sm mr-2 p-4">
                {data.data.data}
              </div>
              <div className="mt-4">
                <Copy
                  value={data.data.data}
                  size={20}
                />
              </div>
            </div>
            :
            <span className="text-xs lg:text-base">
              -
            </span>
          :
          <TailSpin color={loader_color(theme)} width="32" height="32" />
        }
      </div>
      <div className="space-y-2">
        <span className="text-base font-semibold">
          Execute Data
        </span>
        {equals_ignore_case(data?.id, id) ?
          data?.data?.execute_data ?
            <div className="flex items-start">
              <div className="w-full bg-slate-100 dark:bg-slate-900 break-all rounded-xl text-slate-400 dark:text-slate-600 text-xs lg:text-sm mr-2 p-4">
                {data.data.execute_data}
              </div>
              <div className="mt-4">
                <Copy
                  value={data.data.execute_data}
                  size={20}
                />
              </div>
            </div>
            :
            <span className="text-xs lg:text-base">
              -
            </span>
          :
          <TailSpin color={loader_color(theme)} width="32" height="32" />
        }
      </div>
      <div className="space-y-2">
        <span className="text-base font-semibold">
          Signature
        </span>
        {equals_ignore_case(data?.id, id) ?
          signature ?
            <div className="flex flex-col space-y-1.5">
              {signature.map((s, i) => (
                <div
                  key={i}
                  className="max-w-min bg-slate-100 dark:bg-slate-900 rounded-lg py-1 px-2"
                >
                  <Copy
                    value={s}
                    title={<span className="cursor-pointer text-slate-600 dark:text-slate-400 text-xs font-semibold">
                      <span className="lg:hidden">
                        {ellipse(s, 20)}
                      </span>
                      <span className="hidden lg:block">
                        {s}
                      </span>
                    </span>}
                    size={18}
                  />
                </div>
              ))}
            </div>
            :
            <span className="text-xs lg:text-base">
              -
            </span>
          :
          <TailSpin color={loader_color(theme)} width="32" height="32" />
        }
      </div>
      {equals_ignore_case(data?.id, id) && prev_batched_commands_id && (
        <div>
          <Link href={`${pathname?.replace('[chain]', chain).replace('[id]', prev_batched_commands_id)}`}>
            <a className="flex items-center text-blue-600 dark:text-white space-x-2">
              <BsFillArrowLeftCircleFill size={20} />
              <span className="font-semibold">
                Previous Batch
              </span>
            </a>
          </Link>
          <div className="ml-7">
            <Copy
              value={prev_batched_commands_id}
              title={<span className="cursor-pointer text-slate-400 dark:text-slate-600 font-semibold">
                {ellipse(prev_batched_commands_id, 8)}
              </span>}
              size={18}
            />
          </div>
        </div>
      )}
    </div>
  )
}