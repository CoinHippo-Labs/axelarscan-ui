import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import BigNumber from 'bignumber.js'
import { Img } from 'react-image'
import { Oval, ThreeDots } from 'react-loader-spinner'
import { TiArrowRight } from 'react-icons/ti'
import { MdRefresh } from 'react-icons/md'
import { RiKeyFill } from 'react-icons/ri'

import Modal from '../modals/modal-info'
import Datatable from '../datatable'
import Copy from '../copy'

import { axelard } from '../../lib/api/executor'
import { domains, getENS } from '../../lib/api/ens'
import { type } from '../../lib/object/id'
import { chainTitle } from '../../lib/object/chain'
import { numberFormat, ellipseAddress, convertToJson } from '../../lib/utils'

import { ENS_DATA } from '../../reducers/types'

export default function PendingCommands({ chain }) {
  const dispatch = useDispatch()
  const { preferences, assets, ens } = useSelector(state => ({ preferences: state.preferences, assets: state.assets, ens: state.ens }), shallowEqual)
  const { theme } = { ...preferences }
  const { assets_data } = { ...assets }
  const { ens_data } = { ...ens }

  const [loading, setLoading] = useState(null)
  const [refreshTrigger, setRefreshTrigger] = useState(null)
  const [commandsData, setCommandsData] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    const getData = async is_interval => {
      if (chain) {
        if (!controller.signal.aborted) {
          setLoading(true)
          if (!is_interval) {
            setCommandsData(null)
          }

          const response = await axelard({ cmd: `axelard q evm pending-commands ${chain.id} -oj` })
          const data = convertToJson(response?.stdout)?.commands || []

          setCommandsData({ data })
          setLoading(false)

          if (data) {
            if (!controller.signal.aborted && !is_interval) {
              const evmAddresses = _.uniq(data.flatMap(c => _.concat(c?.params?.account, c?.params?.newOwners?.split(';'), c?.params?.newOperators?.split(';'))).filter(a => type(a) === 'evm' && !ens_data?.[a?.toLowerCase()]))
              if (evmAddresses.length > 0) {
                let ensData
                const addressChunk = _.chunk(evmAddresses, 50)

                for (let i = 0; i < addressChunk.length; i++) {
                  const domainsResponse = await domains({ where: `{ resolvedAddress_in: [${addressChunk[i].map(id => `"${id?.toLowerCase()}"`).join(',')}] }` })
                  ensData = _.concat(ensData || [], domainsResponse?.data || [])
                }

                if (ensData?.length > 0) {
                  const ensResponses = {}
                  for (let i = 0; i < evmAddresses.length; i++) {
                    const evmAddress = evmAddresses[i]?.toLowerCase()
                    const resolvedAddresses = ensData.filter(d => d?.resolvedAddress?.id?.toLowerCase() === evmAddress)
                    if (resolvedAddresses.length > 1) {
                      ensResponses[evmAddress] = await getENS(evmAddress)
                    }
                    else if (resolvedAddresses.length < 1) {
                      ensData.push({ resolvedAddress: { id: evmAddress } })
                    }
                  }

                  dispatch({
                    type: ENS_DATA,
                    value: Object.fromEntries(ensData.filter(d => !ensResponses?.[d?.resolvedAddress?.id?.toLowerCase()]?.reverseRecord || d?.name === ensResponses?.[d?.resolvedAddress?.id?.toLowerCase()].reverseRecord).map(d => [d?.resolvedAddress?.id?.toLowerCase(), { ...d }])),
                  })
                }
              }
            }
          }
        }
      }
    }

    getData()

    const interval = setInterval(() => getData(true), 0.25 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [chain, refreshTrigger])

  const key_id = commandsData?.data?.find(c => c?.key_id)?.key_id

  const refreshButton = (
    <button
      disabled={!commandsData}
      onClick={() => setRefreshTrigger(moment().valueOf())}
      className={`${!commandsData ? 'cursor-not-allowed text-gray-400 dark:text-gray-600' : 'hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'} rounded-full ml-auto p-1.5`}
    >
      {commandsData ?
        <MdRefresh size={16} />
        :
        <Oval color={theme === 'dark' ? '#F9FAFB' : '#3B82F6'} width="16" height="16" />
      }
    </button>
  )

  return (
    <div className="flex items-center space-x-1">
      <Modal
        buttonTitle={<div className="flex items-center space-x-2">
          <Img
            src={chain?.image}
            alt=""
            className="w-5 h-5 rounded-full"
          />
          {commandsData && (
            <span className="font-mono font-semibold">{numberFormat(commandsData.data?.length || 0, '0,0')}</span>
          )}
          {loading && (
            <ThreeDots color={theme === 'dark' ? '#F9FAFB' : '#3B82F6'} width="20" height="20" />
          )}
        </div>}
        buttonClassName="bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-700 hover:text-black dark:text-gray-300 dark:hover:text-white rounded-2xl shadow flex items-center justify-center text-base space-x-1.5 py-1 px-2.5"
        title={<div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Img
              src={chain?.image}
              alt=""
              className="w-8 h-8 rounded-full"
            />
            {key_id ?
              <div className="flex items-center text-gray-700 dark:text-gray-300 space-x-2">
                <RiKeyFill size={20} className="mb-0.5 ml-0.5" />
                <span className="font-mono text-base font-medium">{key_id}</span>
              </div>
              :
              <span className="font-semibold">{chainTitle(chain)}</span>
            }
          </div>
          {refreshButton}
        </div>}
        body={<>
          <Datatable
            columns={[
              {
                Header: 'Command ID',
                accessor: 'id',
                disableSortBy: true,
                Cell: props => (
                  !props.row.original.skeleton ?
                    <Copy
                      text={props.value}
                      copyTitle={<span className="uppercase text-gray-400 dark:text-gray-600 text-xs font-normal">
                        {ellipseAddress(props.value, 8)}
                      </span>}
                    />
                    :
                    <div className="skeleton w-36 h-5" />
                ),
              },
              {
                Header: 'Type',
                accessor: 'type',
                disableSortBy: true,
                Cell: props => (
                  !props.row.original.skeleton ?
                    props.value ?
                      <div className="max-w-min bg-gray-100 dark:bg-gray-900 rounded-xl capitalize font-semibold -mt-1 -ml-2.5 py-1 px-2.5">
                        {props.value}
                      </div>
                      :
                      <span className="text-gray-400 dark:text-gray-600 font-light">Unknown</span>
                    :
                    <div className="skeleton w-24 h-5" />
                ),
              },
              {
                Header: 'Account',
                accessor: 'params.account',
                disableSortBy: true,
                Cell: props => {
                  const chainData = chain

                  return !props.row.original.skeleton ?
                    props.value ?
                      <div className="flex items-center space-x-1">
                        <Copy
                          text={props.value}
                          copyTitle={<span className="normal-case text-gray-700 dark:text-gray-300 text-xs font-medium">
                            {ellipseAddress(ens_data?.[props.value?.toLowerCase()]?.name || props.value, 8)}
                          </span>}
                        />
                        {chainData?.explorer?.url && (
                          <a
                            href={`${chainData.explorer.url}${chainData.explorer.address_path?.replace('{address}', props.value)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-w-max text-blue-600 dark:text-white"
                          >
                            {chainData.explorer.icon ?
                              <Img
                                src={chainData.explorer.icon}
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
                      props.row.original.params?.salt ?
                        <div className="flex items-center space-x-1.5">
                          <span className="font-semibold">Salt:</span>
                          <Copy
                            text={props.row.original.params.salt}
                            copyTitle={<span className="normal-case text-gray-700 dark:text-gray-300 text-xs font-medium">
                              {ellipseAddress(props.row.original.params.salt, 8)}
                            </span>}
                          />
                        </div>
                        :
                        props.row.original.params?.newOwners ?
                          <div className="max-w-xl flex flex-wrap">
                            {props.row.original.params.newOwners.split(';').map((owner, i) => (
                              <div key={i} className="flex items-center space-x-1 mb-1 mr-2.5">
                                <Copy
                                  text={owner}
                                  copyTitle={<span className="normal-case text-gray-700 dark:text-gray-300 text-xs font-medium">
                                    {ellipseAddress(ens_data?.[owner?.toLowerCase()]?.name || owner, 8)}
                                  </span>}
                                />
                                {chainData?.explorer?.url && (
                                  <a
                                    href={`${chainData.explorer.url}${chainData.explorer.address_path?.replace('{address}', owner)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="min-w-max text-blue-600 dark:text-white"
                                  >
                                    {chainData.explorer.icon ?
                                      <Img
                                        src={chainData.explorer.icon}
                                        alt=""
                                        className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                      />
                                      :
                                      <TiArrowRight size={16} className="transform -rotate-45" />
                                    }
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                          :
                          props.row.original.params?.newOperators ?
                            <div className="max-w-xl flex flex-wrap">
                              {props.row.original.params.newOperators.split(';').map((operator, i) => (
                                <div key={i} className="flex items-center space-x-1 mb-1 mr-2.5">
                                  <Copy
                                    text={operator}
                                    copyTitle={<span className="normal-case text-gray-700 dark:text-gray-300 text-xs font-medium">
                                      {ellipseAddress(ens_data?.[operator?.toLowerCase()]?.name || operator, 8)}
                                    </span>}
                                  />
                                  {chainData?.explorer?.url && (
                                    <a
                                      href={`${chainData.explorer.url}${chainData.explorer.address_path?.replace('{address}', operator)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="min-w-max text-blue-600 dark:text-white"
                                    >
                                      {chainData.explorer.icon ?
                                        <Img
                                          src={chainData.explorer.icon}
                                          alt=""
                                          className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                        />
                                        :
                                        <TiArrowRight size={16} className="transform -rotate-45" />
                                      }
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                            :
                            props.row.original.params?.name ?
                              <div className="flex flex-col">
                                <span className="font-semibold">{props.row.original.params.name}</span>
                                <div className="flex items-center space-x-1.5">
                                  {props.row.original.params.decimals && (
                                    <span className="text-gray-400 dark:text-gray-600 text-xs">decimals: {numberFormat(props.row.original.params.decimals, '0,0')}</span>
                                  )}
                                  {props.row.original.params.cap && (
                                    <span className="text-gray-400 dark:text-gray-600 text-xs">cap: {numberFormat(props.row.original.params.cap, '0,0')}</span>
                                  )}
                                </div>
                              </div>
                              :
                              <span className="text-gray-400 dark:text-gray-600 font-light">Unknown</span>
                    :
                    <div className="skeleton w-40 h-5" />
                },
              },
              {
                Header: 'Amount',
                accessor: 'params.amount',
                disableSortBy: true,
                Cell: props => {
                  const chainData = chain
                  const asset = assets_data?.find(a => a?.symbol?.toLowerCase() === props.row.original.params?.symbol?.toLowerCase() || a?.contracts?.findIndex(c => c?.chain_id === chainData?.chain_id && c.symbol?.toLowerCase() === props.row.original.params?.symbol?.toLowerCase()) > -1)
                  const contract = asset?.contracts?.find(c => c?.chain_id === chainData?.chain_id)

                  return !props.row.original.skeleton ?
                    <div className="flex items-center space-x-2 -mt-1 mr-1.5">
                      {props.row.original.params?.symbol ?
                        <div className="min-w-max max-w-min bg-gray-100 dark:bg-gray-900 rounded-2xl flex items-center space-x-2 ml-auto py-1 px-2.5">
                          {asset?.image && (
                            <Img
                              src={asset.image}
                              alt=""
                              className="w-5 h-5 rounded-full"
                            />
                          )}
                          <span className="flex items-center text-gray-700 dark:text-gray-300 text-sm font-semibold">
                            {props.value && (
                              <span className="font-mono mr-1.5">
                                {numberFormat(BigNumber(props.value).shiftedBy(-(contract?.contract_decimals || 6)).toNumber(), '0,0.00000000', true)}
                              </span>
                            )}
                            <span className="normal-case">{props.row.original.params?.symbol || asset?.symbol}</span>
                          </span>
                        </div>
                        :
                        props.row.original.params?.newThreshold ?
                          <div className="flex items-center space-x-1.5 mt-1 ml-auto mr-2.5">
                            <span className="font-semibold">Threshold:</span>
                            <span className="normal-case text-gray-700 dark:text-gray-300 text-xs font-medium">
                              {numberFormat(props.row.original.params.newThreshold, '0,0')}
                            </span>
                          </div> 
                          :
                          null
                      }
                    </div>
                    :
                    <div className="skeleton w-28 h-5 ml-auto mr-4" />
                },
                headerClassName: 'justify-end text-right mr-4',
              },
              {
                Header: 'Max Gas Cost',
                accessor: 'max_gas_cost',
                disableSortBy: true,
                Cell: props => (
                  !props.row.original.skeleton ?
                    <div className="font-mono text-gray-700 dark:text-gray-300 text-right">
                      {props.value ? numberFormat(props.value, '0,0.00000000', true) : '-'}
                    </div>
                    :
                    <div className="skeleton w-24 h-5 ml-auto" />
                ),
                headerClassName: 'whitespace-nowrap justify-end text-right',
              },
            ]}
            data={commandsData ?
              commandsData.data?.map((batch, i) => { return { ...batch, i } }) || []
              :
              [...Array(3).keys()].map(i => { return { i, skeleton: true } })
            }
            noPagination={!commandsData || commandsData.data?.length <= 10 ? true : false}
            defaultPageSize={10}
            className="min-h-full small no-border"
          />
          {commandsData && !(commandsData.data?.length > 0) && (
            <div className="bg-gray-100 dark:bg-gray-900 rounded-xl text-gray-300 dark:text-gray-500 text-base font-medium italic text-center my-4 py-4">
              No Pending Commands
            </div>
          )}
        </>}
        confirmButtonTitle="Ok"
        className="max-w-full"
      />
    </div>
  )
}