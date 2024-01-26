'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Fragment, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Dialog, Listbox, Transition } from '@headlessui/react'
import clsx from 'clsx'
import _ from 'lodash'
import { MdOutlineRefresh, MdOutlineFilterList, MdClose, MdCheck, MdOutlineTimer } from 'react-icons/md'
import { LuChevronsUpDown } from 'react-icons/lu'
import { PiWarningCircle } from 'react-icons/pi'
import { RiTimerFlashLine } from 'react-icons/ri'

import { Container } from '@/components/Container'
import { Overlay } from '@/components/Overlay'
import { Button } from '@/components/Button'
import { DateRangePicker } from '@/components/DateRangePicker'
import Image from '@/components/Image'
import { Copy } from '@/components/Copy'
import { Tooltip } from '@/components/Tooltip'
import { Spinner } from '@/components/Spinner'
import { Tag } from '@/components/Tag'
import { Number } from '@/components/Number'
import { Profile, ChainProfile, AssetProfile } from '@/components/Profile'
import { ExplorerLink } from '@/components/ExplorerLink'
import { TimeAgo, TimeSpent } from '@/components/Time'
import { getParams, getQueryString, Pagination } from '@/components/Pagination'
import { useGlobalStore } from '@/app/providers'
import { searchGMP } from '@/lib/api/gmp'
import { split, toArray } from '@/lib/parser'
import { equalsIgnoreCase, toBoolean, ellipse, toTitle } from '@/lib/string'
import { isNumber } from '@/lib/number'

const size = 25

function Filters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [params, setParams] = useState(getParams(searchParams, size))
  const { handleSubmit } = useForm()
  const { chains, assets, itsAssets } = useGlobalStore()

  const onSubmit = (e1, e2, _params) => {
    _params = _params || params
    if (!_.isEqual(_params, getParams(searchParams, size))) {
      router.push(`${pathname}?${getQueryString(_params)}`)
      setParams(_params)
    }
    setOpen(false)
  }

  const onClose = () => {
    setOpen(false)
    setParams(getParams(searchParams, size))
  }

  const attributes = toArray([
    { label: 'Tx Hash', name: 'txHash' },
    { label: 'Source Chain', name: 'sourceChain', type: 'select', multiple: true, options: _.orderBy(toArray(chains).map((d, i) => ({ ...d, i })), ['deprecated', 'i'], ['desc', 'asc']).map(d => ({ value: d.id, title: d.name })) },
    { label: 'Destination Chain', name: 'destinationChain', type: 'select', multiple: true, options: _.orderBy(toArray(chains).map((d, i) => ({ ...d, i })), ['deprecated', 'i'], ['desc', 'asc']).map(d => ({ value: d.id, title: d.name })) },
    { label: 'From / To Chain', name: 'chain', type: 'select', multiple: true, options: _.orderBy(toArray(chains).map((d, i) => ({ ...d, i })), ['deprecated', 'i'], ['desc', 'asc']).map(d => ({ value: d.id, title: d.name })) },
    { label: 'Method', name: 'contractMethod', type: 'select', options: _.concat({ title: 'Any' }, [{ value: 'callContract', title: 'CallContract' }, { value: 'callContractWithToken', title: 'CallContractWithToken' }, { value: 'InterchainTransfer', title: 'InterchainTransfer' }, { value: 'InterchainTokenDeployment', title: 'InterchainTokenDeployment' }]) },
    { label: 'Status', name: 'status', type: 'select', options: _.concat({ title: 'Any' }, [{ value: 'called', title: 'Called' }, { value: 'confirming', title: 'Wait for Confirmation' }, { value: 'express_executed', title: 'Express Executed' }, { value: 'approving', title: 'Wait for Approval' }, { value: 'approved', title: 'Approved' }, { value: 'executing', title: 'Executing' }, { value: 'executed', title: 'Executed' }, { value: 'error', title: 'Error Execution' }, { value: 'insufficient_fee', title: 'Insufficient Fee' }, { value: 'not_enough_gas_to_execute', title: 'Not Enough Gas' }]) },
    { label: 'Sender', name: 'senderAddress' },
    { label: 'Contract', name: 'contractAddress' },
    { label: 'Asset Type', name: 'assetType', type: 'select', options: _.concat({ title: 'Any' }, [{ value: 'gateway', title: 'Gateway Token' }, { value: 'its', title: 'ITS Token' }]) },
    { label: 'Asset', name: 'asset', type: 'select', multiple: true, options: toArray(_.concat(params.assetType !== 'its' && toArray(assets).map(d => ({ value: d.id, title: d.symbol })), params.assetType !== 'gateway' && toArray(itsAssets).map(d => ({ value: d.symbol, title: `${d.symbol} (ITS)` })))) },
    params.assetType === 'its' && { label: 'ITS Token Address', name: 'itsTokenAddress' },
    { label: 'Time', name: 'time', type: 'datetimeRange' },
    { label: 'Sort By', name: 'sortBy', type: 'select', options: _.concat({ title: 'Any' }, [{ value: 'time', title: 'ContractCall Time' }, { value: 'value', title: 'Token Value' }]) },
    { label: 'Proposal ID', name: 'proposalId' },
  ])

  const filtered = Object.keys(params).filter(k => !['from'].includes(k)).length > 0
  return (
    <>
      <Button
        color="default"
        circle="true"
        onClick={() => setOpen(true)}
        className={clsx(filtered && 'bg-blue-50 dark:bg-blue-950')}
      >
        <MdOutlineFilterList size={20} className={clsx(filtered && 'text-blue-600 dark:text-blue-500')} />
      </Button>
      <Transition.Root show={open} as={Fragment}>
        <Dialog as="div" onClose={onClose} className="relative z-50">
          <Transition.Child
            as={Fragment}
            enter="transform transition ease-in-out duration-500 sm:duration-700"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transform transition ease-in-out duration-500 sm:duration-700"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-zinc-50 dark:bg-zinc-900 bg-opacity-50 dark:bg-opacity-50 transition-opacity" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
                <Transition.Child
                  as={Fragment}
                  enter="transform transition ease-in-out duration-500 sm:duration-700"
                  enterFrom="translate-x-full"
                  enterTo="translate-x-0"
                  leave="transform transition ease-in-out duration-500 sm:duration-700"
                  leaveFrom="translate-x-0"
                  leaveTo="translate-x-full"
                >
                  <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                    <form onSubmit={handleSubmit(onSubmit)} className="h-full bg-white divide-y divide-zinc-200 shadow-xl flex flex-col">
                      <div className="h-0 flex-1 overflow-y-auto">
                        <div className="bg-blue-600 flex items-center justify-between p-4 sm:px-6">
                          <Dialog.Title className="text-white text-base font-semibold leading-6">
                            Filter
                          </Dialog.Title>
                          <button
                            type="button"
                            onClick={() => onClose()}
                            className="relative text-blue-200 hover:text-white ml-3"
                          >
                            <MdClose size={20} />
                          </button>
                        </div>
                        <div className="flex flex-1 flex-col justify-between gap-y-6 px-4 sm:px-6 py-6">
                          {attributes.map((d, i) => (
                            <div key={i}>
                              <label htmlFor={d.name} className="text-zinc-900 text-sm font-medium leading-6">
                                {d.label}
                              </label>
                              <div className="mt-2">
                                {d.type === 'select' ?
                                  <Listbox value={d.multiple ? split(params[d.name]) : params[d.name]} onChange={v => setParams({ ...params, [d.name]: d.multiple ? v.join(',') : v })} multiple={d.multiple}>
                                    {({ open }) => {
                                      const isSelected = v => d.multiple ? split(params[d.name]).includes(v) : v === params[d.name] || equalsIgnoreCase(v, params[d.name])
                                      const selectedValue = d.multiple ? toArray(d.options).filter(o => isSelected(o.value)) : toArray(d.options).find(o => isSelected(o.value))

                                      return (
                                        <div className="relative">
                                          <Listbox.Button className="relative w-full cursor-pointer rounded-md shadow-sm border border-zinc-200 text-zinc-900 sm:text-sm sm:leading-6 text-left pl-3 pr-10 py-1.5">
                                            {d.multiple ?
                                              <div className={clsx('flex flex-wrap', selectedValue.length !== 0 && 'my-1')}>
                                                {selectedValue.length === 0 ?
                                                  <span className="block truncate">Any</span> :
                                                  selectedValue.map((v, j) => (
                                                    <div
                                                      key={j}
                                                      onClick={() => setParams({ ...params, [d.name]: selectedValue.filter(_v => _v.value !== v.value).map(_v => _v.value).join(',') })}
                                                      className="min-w-fit h-6 bg-zinc-100 rounded-xl flex items-center text-zinc-900 mr-2 my-1 px-2.5 py-1"
                                                    >
                                                      {v.title}
                                                    </div>
                                                  ))
                                                }
                                              </div> :
                                              <span className="block truncate">{selectedValue?.title}</span>
                                            }
                                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                              <LuChevronsUpDown size={20} className="text-zinc-400" />
                                            </span>
                                          </Listbox.Button>
                                          <Transition
                                            show={open}
                                            as={Fragment}
                                            leave="transition ease-in duration-100"
                                            leaveFrom="opacity-100"
                                            leaveTo="opacity-0"
                                          >
                                            <Listbox.Options className="absolute z-10 w-full max-h-60 bg-white overflow-auto rounded-md shadow-lg text-base sm:text-sm mt-1 py-1">
                                              {toArray(d.options).map((o, j) => (
                                                <Listbox.Option key={j} value={o.value} className={({ active }) => clsx('relative cursor-default select-none pl-3 pr-9 py-2', active ? 'bg-blue-600 text-white' : 'text-zinc-900')}>
                                                  {({ selected, active }) => (
                                                    <>
                                                      <span className={clsx('block truncate', selected ? 'font-semibold' : 'font-normal')}>
                                                        {o.title}
                                                      </span>
                                                      {selected && (
                                                        <span className={clsx('absolute inset-y-0 right-0 flex items-center pr-4', active ? 'text-white' : 'text-blue-600')}>
                                                          <MdCheck size={20} />
                                                        </span>
                                                      )}
                                                    </>
                                                  )}
                                                </Listbox.Option>
                                              ))}
                                            </Listbox.Options>
                                          </Transition>
                                        </div>
                                      )
                                    }}
                                  </Listbox> :
                                  d.type === 'datetimeRange' ?
                                    <DateRangePicker params={params} onChange={v => setParams({ ...params, ...v })} /> :
                                    <input
                                      type={d.type || 'text'}
                                      name={d.name}
                                      placeholder={d.label}
                                      value={params[d.name]}
                                      onChange={e => setParams({ ...params, [d.name]: e.target.value })}
                                      className="w-full rounded-md shadow-sm border border-zinc-200 focus:border-blue-600 focus:ring-0 text-zinc-900 placeholder:text-zinc-400 sm:text-sm sm:leading-6 py-1.5"
                                    />
                                }
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 justify-end p-4">
                        <button
                          type="button"
                          onClick={() => onSubmit(undefined, undefined, {})}
                          className="bg-white hover:bg-zinc-50 rounded-md shadow-sm ring-1 ring-inset ring-zinc-200 text-zinc-900 text-sm font-semibold px-3 py-2"
                        >
                          Reset
                        </button>
                        <button
                          type="submit"
                          disabled={!filtered}
                          className={clsx('rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 inline-flex justify-center text-white text-sm font-semibold ml-4 px-3 py-2', filtered ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 cursor-not-allowed')}
                        >
                          Submit
                        </button>
                      </div>
                    </form>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  )
}

export const getEvent = data => {
  const { call, token_sent, token_deployment_initialized, token_deployed, token_manager_deployment_started, interchain_token_deployment_started, interchain_transfer, interchain_transfer_with_data } = { ...data }
  if (token_sent || interchain_transfer || interchain_transfer_with_data) return 'InterchainTransfer'
  if (token_deployment_initialized) return 'TokenDeploymentInitialized'
  if (token_deployed) return 'TokenDeployed'
  if (token_manager_deployment_started) return 'TokenManagerDeployment'
  if (interchain_token_deployment_started) return 'InterchainTokenDeployment'
  return call?.event
}
export const normalizeEvent = event => event?.replace('ContractCall', 'callContract')

export function GMPs() {
  const searchParams = useSearchParams()
  const [params, setParams] = useState(null)
  const [data, setData] = useState(null)
  const [total, setTotal] = useState(null)
  const [refresh, setRefresh] = useState(null)

  useEffect(() => {
    const _params = getParams(searchParams, size)
    if (!_.isEqual(_params, params)) {
      setParams(_params)
      setRefresh(true)
    }
  }, [searchParams, params, setParams])

  useEffect(() => {
    const getData = async () => {
      if (params && toBoolean(refresh)) {
        const sort = params.sortBy === 'value' ? { value: 'desc' } : undefined
        delete params.sortBy

        const { data, total } = { ...await searchGMP({ ...params, size, sort }) }
        setData(data)
        setTotal(total)
        setRefresh(false)
      }
    }
    getData()
  }, [params, setData, setTotal, refresh, setRefresh])

  useEffect(() => {
    const interval = setInterval(() => setRefresh('true'), 0.5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Container className="sm:mt-8">
      {!data ? <Spinner /> :
        <div>
          <div className="flex items-center justify-between gap-x-4">
            <div className="sm:flex-auto">
              <h1 className="text-zinc-900 dark:text-zinc-100 text-base font-semibold leading-6">General Message Passings</h1>
              <p className="mt-2 text-zinc-400 dark:text-zinc-500 text-sm">
                <Number value={total} suffix={` result${total > 1 ? 's' : ''}`} /> 
              </p>
            </div>
            <div className="flex items-center gap-x-2">
              <Filters />
              {refresh && refresh !== 'true' ? <Spinner /> :
                <Button
                  color="default"
                  circle="true"
                  onClick={() => setRefresh(true)}
                >
                  <MdOutlineRefresh size={20} />
                </Button>
              }
            </div>
          </div>
          {refresh && refresh !== 'true' && <Overlay />}
          <div className="overflow-x-auto lg:overflow-x-visible -mx-4 sm:-mx-0 mt-4">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
              <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900">
                <tr className="text-zinc-800 dark:text-zinc-200 text-sm font-semibold">
                  <th scope="col" className="pl-4 sm:pl-0 pr-3 py-3.5 text-left">
                    Tx Hash
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left">
                    Method
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left">
                    Source
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left">
                    Destination
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left">
                    Status
                  </th>
                  <th scope="col" className="pl-3 pr-4 sm:pr-0 py-3.5 text-right">
                    Created at
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
                {data.map(d => {
                  const symbol = d.call.returnValues?.symbol || d.token_sent?.symbol || d.interchain_transfer?.symbol || d.interchain_transfer_with_data?.symbol || d.token_deployed?.symbol || d.token_deployment_initialized?.tokenSymbol || d.interchain_token_deployment_started?.tokenSymbol
                  return (
                    <tr key={d.call.id} className="align-top text-zinc-400 dark:text-zinc-500 text-sm">
                      <td className="pl-4 sm:pl-0 pr-3 py-4 text-left">
                        <div className="flex items-center gap-x-1">
                          <Copy value={d.call.transactionHash}>
                            <Link
                              href={`/gmp/${d.call.transactionHash}${d.call.chain_type === 'evm' && d.call.receipt && isNumber(d.call.logIndex) ? `:${d.call.logIndex}` : d.call.chain_type === 'cosmos' && isNumber(d.call.messageIdIndex) ? `:${d.call.messageIdIndex}` : ''}`}
                              target="_blank"
                              className="text-blue-600 dark:text-blue-500 font-semibold"
                            >
                              {ellipse(d.call.transactionHash)}
                            </Link>
                          </Copy>
                          <ExplorerLink value={d.call.transactionHash} chain={d.call.chain} />
                        </div>
                      </td>
                      <td className="px-3 py-4 text-left">
                        <div className="flex flex-col gap-y-1.5">
                          <Tag className={clsx('w-fit capitalize')}>
                            {toTitle(normalizeEvent(getEvent(d)))}
                          </Tag>
                          {symbol && (
                            <AssetProfile
                              value={symbol}
                              chain={d.call.chain}
                              amount={d.amount}
                              ITSPossible={true}
                              onlyITS={!getEvent(d)?.includes('ContractCall')}
                              width={16}
                              height={16}
                              className="w-fit h-6 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-2.5 py-1"
                              titleClassName="text-xs"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-left">
                        <div className="flex flex-col gap-y-1">
                          <ChainProfile
                            value={d.call.chain}
                            className="h-6"
                            titleClassName="font-semibold"
                          />
                          <Profile address={d.call.transaction?.from} chain={d.call.chain} />
                        </div>
                      </td>
                      <td className="px-3 py-4 text-left">
                        <div className="flex flex-col gap-y-1">
                          {d.is_invalid_destination_chain ?
                            <div className="flex">
                              <Tooltip content={d.call.returnValues?.destinationChain}>
                                <div className="h-6 flex items-center text-red-600 dark:text-red-500 gap-x-1.5">
                                  <PiWarningCircle size={20} />
                                  <span>Invalid Chain</span>
                                </div>
                              </Tooltip>
                            </div> :
                            <ChainProfile
                              value={d.call.returnValues?.destinationChain}
                              className="h-6"
                              titleClassName="font-semibold"
                            />
                          }
                          {d.is_invalid_contract_address ?
                            <div className="flex">
                              <Tooltip content={d.call.returnValues?.destinationContractAddress}>
                                <div className="h-6 flex items-center text-red-600 dark:text-red-500 gap-x-1.5">
                                  <PiWarningCircle size={20} />
                                  <span>Invalid Contract</span>
                                </div>
                              </Tooltip>
                            </div> :
                            <Profile address={d.call.returnValues?.destinationContractAddress} chain={d.call.returnValues?.destinationChain} />
                          }
                        </div>
                      </td>
                      <td className="px-3 py-4 text-left">
                        <div className="flex flex-col gap-y-1.5">
                          {d.simplified_status && (
                            <Tag className={clsx('w-fit capitalize', ['received'].includes(d.simplified_status) ? 'bg-green-600 dark:bg-green-500' : ['approved'].includes(d.simplified_status) ? 'bg-orange-500 dark:bg-orange-600' : ['failed'].includes(d.simplified_status) ? 'bg-red-600 dark:bg-red-500' : 'bg-yellow-400 dark:bg-yellow-500')}>
                              {d.simplified_status}
                            </Tag>
                          )}
                          {d.is_insufficient_fee && (
                            <div className="flex items-center text-red-600 dark:text-red-500 gap-x-1">
                              <PiWarningCircle size={16} />
                              <span className="text-xs">Insufficient Fee</span>
                            </div>
                          )}
                          {d.time_spent?.call_express_executed > 0 && ['express_executed', 'executed'].includes(d.status) && (
                            <div className="flex items-center text-green-600 dark:text-green-500 gap-x-1">
                              <RiTimerFlashLine size={16} />
                              <TimeSpent fromTimestamp={0} toTimestamp={d.time_spent.call_express_executed * 1000} className="text-xs" />
                            </div>
                          )}
                          {d.time_spent?.total > 0 && ['executed'].includes(d.status) && (
                            <div className="flex items-center text-zinc-400 dark:text-zinc-500 gap-x-1">
                              <MdOutlineTimer size={16} />
                              <TimeSpent fromTimestamp={0} toTimestamp={d.time_spent.total * 1000} className="text-xs" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="pl-3 pr-4 sm:pr-0 py-4 flex items-center justify-end text-right">
                        <TimeAgo timestamp={d.call.block_timestamp * 1000} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {total > size && (
            <div className="flex items-center justify-center mt-8">
              <Pagination sizePerPage={size} total={total} />
            </div>
          )}
        </div>
      }
    </Container>
  )
}
