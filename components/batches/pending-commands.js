import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import moment from 'moment'
import { BigNumber, utils } from 'ethers'
import { TailSpin, ThreeDots, Oval } from 'react-loader-spinner'
import { MdRefresh } from 'react-icons/md'
import { TiArrowRight } from 'react-icons/ti'

import Modal from '../modals'
import Datatable from '../datatable'
import EnsProfile from '../ens-profile'
import Image from '../image'
import Copy from '../copy'
import { axelard } from '../../lib/api/cli'
import { number_format, ellipse, equals_ignore_case, to_json, loader_color } from '../../lib/utils'

export default ({ chain_data }) => {
  const { preferences, assets } = useSelector(state => ({ preferences: state.preferences, assets: state.assets }), shallowEqual)
  const { theme } = { ...preferences }
  const { assets_data } = { ...assets }

  const [data, setData] = useState(null)
  const [fetching, setFetching] = useState(null)
  const [fetchTrigger, setFetchTrigger] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const getData = async is_interval => {
      if (chain_data) {
        if (!controller.signal.aborted) {
          setFetching(true)
          if (!is_interval) {
            setData(null)
          }
          const response = await axelard({
            cmd: `axelard q evm pending-commands ${chain_data.id} -oj`,
          })
          setData(to_json(response?.stdout)?.commands || [])
          setFetching(false)
        }
      }
    }
    getData()
    const interval = setInterval(() => getData(true), 0.25 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [chain_data, fetchTrigger])

  const key_id = data?.find(d => d?.key_id)?.key_id
  const refreshButton = (
    <button
      disabled={!data}
      onClick={() => setFetchTrigger(moment().valueOf())}
      className={`${!data ? 'cursor-not-allowed text-slate-400 dark:text-slate-600' : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'} rounded-full ml-auto p-1.5`}
    >
      {data ?
        <MdRefresh size={16} /> :
        <Oval color={loader_color(theme)} width="16" height="16" />
      }
    </button>
  )

  return (
    <Modal
      buttonTitle={<div className="flex items-center space-x-1">
        {chain_data?.image && (
          <Image
            src={chain_data.image}
            className="w-4 h-4 rounded-full"
          />
        )}
        {data && (
          <span className="text-xs font-bold">
            ({number_format(data.length || 0, '0,0')})
          </span>
        )}
        {fetching && (
          <ThreeDots color={loader_color(theme)} width="16" height="16" />
        )}
      </div>}
      buttonClassName="bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-lg text-base space-x-1.5 py-1 px-2"
      title={<div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {chain_data?.image && (
            <Image
              src={chain_data.image}
              className="w-7 h-7 rounded-full"
            />
          )}
          <span className="font-bold">
            {key_id || chain_data?.name}
          </span>
        </div>
        {refreshButton}
      </div>}
      body={data ?
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
          data={data}
          noPagination={data <= 10}
          defaultPageSize={10}
          className="min-h-full small no-border"
        />
        :
        <TailSpin color={loader_color(theme)} width="32" height="32" />
      }
      confirmButtonTitle="Ok"
      modalClassName="max-w-full"
    />
  )
}