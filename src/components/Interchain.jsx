'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Fragment, useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { useForm } from 'react-hook-form'
import { Combobox, Dialog, Listbox, Transition } from '@headlessui/react'
import { ResponsiveContainer, BarChart, XAxis, YAxis, Bar, Tooltip } from 'recharts'
import { ResponsiveSankey } from '@nivo/sankey'
import clsx from 'clsx'
import _ from 'lodash'
import moment from 'moment'
import { MdOutlineRefresh, MdOutlineFilterList, MdClose, MdCheck, MdKeyboardArrowRight } from 'react-icons/md'
import { LuChevronsUpDown } from 'react-icons/lu'

import { Container } from '@/components/Container'
import { Overlay } from '@/components/Overlay'
import { Button } from '@/components/Button'
import { DateRangePicker } from '@/components/DateRangePicker'
import { Image } from '@/components/Image'
import { TooltipComponent } from '@/components/Tooltip'
import { Spinner } from '@/components/Spinner'
import { Number } from '@/components/Number'
import { Profile, ChainProfile, AssetProfile } from '@/components/Profile'
import { TimeAgo, TimeSpent } from '@/components/Time'
import { useGlobalStore } from '@/components/Global'
import { GMPStatsByChains, GMPStatsByContracts, GMPStatsAVGTimes, GMPChart, GMPTotalVolume, GMPTopUsers, GMPTopITSAssets } from '@/lib/api/gmp'
import { transfersStats, transfersChart, transfersTotalVolume, transfersTopUsers } from '@/lib/api/token-transfer'
import { ENVIRONMENT, getChainData, getAssetData, getITSAssetData } from '@/lib/config'
import { toCase, split, toArray } from '@/lib/parser'
import { getParams, getQueryString, generateKeyByParams, isFiltered } from '@/lib/operator'
import { equalsIgnoreCase, toBoolean, headString, lastString, toTitle, filterSearchInput } from '@/lib/string'
import { isNumber, toNumber, toFixed, numberFormat } from '@/lib/number'
import { timeDiff } from '@/lib/time'
import accounts from '@/data/accounts'

const getGranularity = (fromTimestamp, toTimestamp) => {
  if (!fromTimestamp) return 'month'

  const diff = timeDiff(fromTimestamp * 1000, 'days', toTimestamp * 1000)

  if (diff >= 180) {
    return 'month'
  }
  else if (diff >= 60) {
    return 'week'
  }

  return 'day'
}

const TIME_SHORTCUTS = [
  { label: 'Last 7 days', value: [moment().subtract(7, 'days').startOf('day'), moment().endOf('day')] },
  { label: 'Last 30 days', value: [moment().subtract(30, 'days').startOf('day'), moment().endOf('day')] },
  { label: 'Last 365 days', value: [moment().subtract(365, 'days').startOf('day'), moment().endOf('day')] },
  { label: 'All-time', value: [] },
]

function Filters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [params, setParams] = useState(getParams(searchParams))
  const [searchInput, setSearchInput] = useState({})
  const { handleSubmit } = useForm()
  const { chains, assets, itsAssets } = useGlobalStore()

  useEffect(() => {
    if (params) {
      setSearchInput({})
    }
  }, [params, setSearchInput])

  const onSubmit = (e1, e2, _params) => {
    if (!_params) {
      _params = params
    }

    if (!_.isEqual(_params, getParams(searchParams))) {
      router.push(`${pathname}${getQueryString(_params)}`)
      setParams(_params)
    }

    setOpen(false)
  }

  const onClose = () => {
    setOpen(false)
    setParams(getParams(searchParams))
  }

  const attributes = toArray([
    { label: 'Transfers Type', name: 'transfersType', type: 'select', options:[
      { title: 'Any' },
      { value: 'gmp', title: 'General Message Passing' },
      { value: 'transfers', title: 'Token Transfers' },
    ] },
    { label: 'Source Chain', name: 'sourceChain', type: 'select', searchable: true, multiple: true, options: _.orderBy(toArray(chains).map((d, i) => ({ ...d, i })), ['deprecated', 'name', 'i'], ['desc', 'asc', 'asc']).map(d => ({ value: d.id, title: `${d.name}${d.deprecated ? ` (deprecated)` : ''}` })) },
    { label: 'Destination Chain', name: 'destinationChain', type: 'select', searchable: true, multiple: true, options: _.orderBy(toArray(chains).map((d, i) => ({ ...d, i })), ['deprecated', 'name', 'i'], ['desc', 'asc', 'asc']).map(d => ({ value: d.id, title: `${d.name}${d.deprecated ? ` (deprecated)` : ''}` })) },
    { label: 'From / To Chain', name: 'chain', type: 'select', searchable: true, multiple: true, options: _.orderBy(toArray(chains).map((d, i) => ({ ...d, i })), ['deprecated', 'name', 'i'], ['desc', 'asc', 'asc']).map(d => ({ value: d.id, title: `${d.name}${d.deprecated ? ` (deprecated)` : ''}` })) },
    { label: 'Asset', name: 'asset', type: 'select', multiple: true, options: _.orderBy(_.uniqBy(toArray(_.concat(params.assetType !== 'its' && toArray(assets).map(d => ({ value: d.id, title: `${d.symbol} (${d.id})` })), params.assetType !== 'gateway' && toArray(itsAssets).map(d => ({ value: d.symbol, title: `${d.symbol} (ITS)` })))), 'value'), ['title'], ['asc']) },
    params.assetType === 'its' && { label: 'ITS Token Address', name: 'itsTokenAddress' },
    { label: 'Method', name: 'contractMethod', type: 'select', options: [
      { title: 'Any' },
      { value: 'callContract', title: 'CallContract' },
      { value: 'callContractWithToken', title: 'CallContractWithToken' },
      { value: 'InterchainTransfer', title: 'InterchainTransfer' },
      { value: 'SquidCoral', title: 'SquidCoral' },
    ] },
    { label: 'Contract', name: 'contractAddress' },
    { label: 'Asset Type', name: 'assetType', type: 'select', options: [
      { title: 'Any' },
      { value: 'gateway', title: 'Gateway Token' },
      { value: 'its', title: 'ITS Token' },
    ] },
    { label: 'Time', name: 'time', type: 'datetimeRange' },
  ])

  const filtered = isFiltered(params)

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
                                  d.searchable ?
                                    <Combobox value={d.multiple ? split(params[d.name]) : params[d.name]} onChange={v => setParams({ ...params, [d.name]: d.multiple ? v.join(',') : v })} multiple={d.multiple}>
                                      {({ open }) => {
                                        const isSelected = v => d.multiple ? split(params[d.name]).includes(v) : v === params[d.name] || equalsIgnoreCase(v, params[d.name])
                                        const selectedValue = d.multiple ? toArray(d.options).filter(o => isSelected(o.value)) : toArray(d.options).find(o => isSelected(o.value))

                                        return (
                                          <div className="relative">
                                            <Combobox.Button className="relative w-full cursor-pointer rounded-md shadow-sm border border-zinc-200 text-zinc-900 sm:text-sm sm:leading-6 text-left pl-3 pr-10 py-1.5">
                                              {d.multiple ?
                                                <div className={clsx('flex flex-wrap', selectedValue.length !== 0 && 'my-1')}>
                                                  {selectedValue.length === 0 ?
                                                    <span className="block truncate">
                                                      Any
                                                    </span> :
                                                    selectedValue.map((v, j) => (
                                                      <div
                                                        key={j}
                                                        onClick={() => setParams({ ...params, [d.name]: selectedValue.filter(v => v.value !== v.value).map(v => v.value).join(',') })}
                                                        className="min-w-fit h-6 bg-zinc-100 rounded-xl flex items-center text-zinc-900 mr-2 my-1 px-2.5 py-1"
                                                      >
                                                        {v.title}
                                                      </div>
                                                    ))
                                                  }
                                                </div> :
                                                <span className="block truncate">
                                                  {selectedValue?.title}
                                                </span>
                                              }
                                              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                                <LuChevronsUpDown size={20} className="text-zinc-400" />
                                              </span>
                                            </Combobox.Button>
                                            <Transition
                                              show={open}
                                              as={Fragment}
                                              leave="transition ease-in duration-100"
                                              leaveFrom="opacity-100"
                                              leaveTo="opacity-0"
                                            >
                                              <div className="gap-y-2 mt-2">
                                                <Combobox.Input
                                                  placeholder={`Search ${d.label}`}
                                                  value={searchInput[d.name] || ''}
                                                  onChange={e => setSearchInput({ ...searchInput, [d.name]: e.target.value })}
                                                  className="w-full rounded-md shadow-sm border border-zinc-200 focus:border-blue-600 focus:ring-0 text-zinc-900 placeholder:text-zinc-400 sm:text-sm sm:leading-6 py-1.5"
                                                />
                                                <Combobox.Options className="absolute z-10 w-full max-h-60 bg-white overflow-auto rounded-md shadow-lg text-base sm:text-sm mt-1 py-1">
                                                  {toArray(d.options).filter(o => filterSearchInput([o.title, o.value], searchInput[d.name])).map((o, j) => (
                                                    <Combobox.Option key={j} value={o.value} className={({ active }) => clsx('relative cursor-default select-none pl-3 pr-9 py-2', active ? 'bg-blue-600 text-white' : 'text-zinc-900')}>
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
                                                    </Combobox.Option>
                                                  ))}
                                                </Combobox.Options>
                                              </div>
                                            </Transition>
                                          </div>
                                        )
                                      }}
                                    </Combobox> :
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
                                                    <span className="block truncate">
                                                      Any
                                                    </span> :
                                                    selectedValue.map((v, j) => (
                                                      <div
                                                        key={j}
                                                        onClick={() => setParams({ ...params, [d.name]: selectedValue.filter(v => v.value !== v.value).map(v => v.value).join(',') })}
                                                        className="min-w-fit h-6 bg-zinc-100 rounded-xl flex items-center text-zinc-900 mr-2 my-1 px-2.5 py-1"
                                                      >
                                                        {v.title}
                                                      </div>
                                                    ))
                                                  }
                                                </div> :
                                                <span className="block truncate">
                                                  {selectedValue?.title}
                                                </span>
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

export function Summary({ data, params }) {
  const pathname = usePathname()
  const globalStore = useGlobalStore()

  if (!data) return

  const { GMPStatsByChains, GMPStatsByContracts, GMPTotalVolume, transfersStats, transfersTotalVolume } = { ...data }

  const contracts = _.orderBy(
    Object.entries(
      _.groupBy(
      toArray(GMPStatsByContracts?.chains).flatMap(d => toArray(d.contracts).filter(c => !c.key.includes('_')).map(c => {
        const { name } = { ...accounts.find(a => equalsIgnoreCase(a.address, c.key)) }

        return {
          ...c,
          key: name || toCase(c.key, 'lower'),
          chain: d.key,
        }
      })), 'key')
    )
    .map(([k, v]) => ({
      key: k,
      chains: _.uniq(v.map(d => d.chain)),
      num_txs: _.sumBy(v, 'num_txs'),
      volume: _.sumBy(v, 'volume'),
    })),
    ['num_txs', 'volume', 'key'], ['desc', 'desc', 'asc'],
  )

  const chains = params?.contractAddress ?
    _.uniq(contracts.flatMap(d => d.chains)) :
    toArray(globalStore.chains).filter(d => !d.deprecated && (!d.maintainer_id || d.gateway?.address))

  const tvlData = toArray(globalStore.tvl?.data).map(d => {
    // set price from other assets with the same symbol
    const assetData = d.assetType === 'its' ? getITSAssetData(d.asset, globalStore.itsAssets) : getAssetData(d.asset, globalStore.assets) || (d.total_on_contracts > 0 || d.total_on_tokens > 0 ? { ...Object.values({ ...d.tvl }).find(d => d.contract_data?.is_custom)?.contract_data } : undefined)
    d.price = toNumber(isNumber(d.price) ? d.price : isNumber(assetData?.price) ? assetData.price : -1)

    return { ...d, value: toNumber(d.total) * d.price }
  })

  console.log('[destinationContracts]', contracts.map(d => d.key))

  return (
    <div className="border-b lg:border-t border-b-zinc-200 dark:border-b-zinc-700 lg:border-t-zinc-200 lg:dark:border-t-zinc-700">
      <dl className="mx-auto grid max-w-7xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:px-2 xl:px-0">
        <div className="border-t lg:border-t-0 border-l border-r border-zinc-200 dark:border-zinc-700 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-4 sm:px-6 xl:px-8 py-8">
          <dt className="text-zinc-400 dark:text-zinc-500 text-sm font-medium leading-6">Transactions</dt>
          <dd className="w-full flex-none">
            <Number
              value={toNumber(_.sumBy(GMPStatsByChains?.source_chains, 'num_txs')) + toNumber(transfersStats?.total)}
              format="0,0"
              noTooltip={true}
              className="text-zinc-900 dark:text-zinc-100 !text-3xl font-medium leading-10 tracking-tight"
            />
          </dd>
          <dd className="w-full grid grid-cols-2 gap-x-2 mt-1">
            <Number
              value={toNumber(_.sumBy(GMPStatsByChains?.source_chains, 'num_txs'))}
              format="0,0.00a"
              prefix="GMP: "
              noTooltip={true}
              className="text-zinc-400 dark:text-zinc-500 text-xs"
            />
            <Number
              value={toNumber(transfersStats?.total)}
              format="0,0.00a"
              prefix="Transfer: "
              noTooltip={true}
              className="text-zinc-400 dark:text-zinc-500 text-xs"
            />
          </dd>
        </div>
        <div className="border-t lg:border-t-0 border-l sm:border-l-0 border-r border-zinc-200 dark:border-zinc-700 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-4 sm:px-6 xl:px-8 py-8">
          <dt className="text-zinc-400 dark:text-zinc-500 text-sm font-medium leading-6">Volume</dt>
          <dd className="w-full flex-none">
            <Number
              value={toNumber(GMPTotalVolume) + toNumber(transfersTotalVolume)}
              format="0,0"
              prefix="$"
              noTooltip={true}
              className="text-zinc-900 dark:text-zinc-100 !text-3xl font-medium leading-10 tracking-tight"
            />
          </dd>
          <dd className="w-full grid grid-cols-2 gap-x-2 mt-1">
            <Number
              value={toNumber(GMPTotalVolume)}
              format="0,0.00a"
              prefix="GMP: $"
              noTooltip={true}
              className="text-zinc-400 dark:text-zinc-500 text-xs"
            />
            <Number
              value={toNumber(transfersTotalVolume)}
              format="0,0.00a"
              prefix="Transfer: $"
              noTooltip={true}
              className="text-zinc-400 dark:text-zinc-500 text-xs"
            />
          </dd>
        </div>
        {tvlData.length > 0 && pathname === '/' ?
          <div className="border-t lg:border-t-0 border-l lg:border-l-0 border-r border-zinc-200 dark:border-zinc-700 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-4 sm:px-6 xl:px-8 py-8">
            <dt className="text-zinc-400 dark:text-zinc-500 text-sm font-medium leading-6">Total Value Locked</dt>
            <dd className="w-full flex-none">
              <Number
                value={_.sumBy(tvlData.filter(d => d.value > 0), 'value')}
                format="0,0.00a"
                prefix="$"
                noTooltip={true}
                className="text-zinc-900 dark:text-zinc-100 !text-3xl font-medium leading-10 tracking-tight"
              />
            </dd>
            <dd className="w-full grid grid-cols-2 gap-x-2 mt-1">
              <Number
                value={_.sumBy(tvlData.filter(d => d.value > 0 && d.assetType !== 'its'), 'value')}
                format="0,0.00a"
                prefix="Gateway: $"
                noTooltip={true}
                className="text-zinc-400 dark:text-zinc-500 text-xs"
              />
              <Number
                value={_.sumBy(tvlData.filter(d => d.value > 0 && d.assetType === 'its'), 'value')}
                format="0,0.00a"
                prefix="ITS: $"
                noTooltip={true}
                className="text-zinc-400 dark:text-zinc-500 text-xs"
              />
            </dd>
          </div> :
          <div className="border-t lg:border-t-0 border-l lg:border-l-0 border-r border-zinc-200 dark:border-zinc-700 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-4 sm:px-6 xl:px-8 py-8">
            <dt className="text-zinc-400 dark:text-zinc-500 text-sm font-medium leading-6">Average Volume / Transaction</dt>
            <dd className="w-full flex-none">
              <Number
                value={(toNumber(GMPTotalVolume) + toNumber(transfersTotalVolume)) / (toNumber(_.sumBy(GMPStatsByChains?.source_chains, 'num_txs')) + toNumber(transfersStats?.total) || 1)}
                format="0,0"
                prefix="$"
                noTooltip={true}
                className="text-zinc-900 dark:text-zinc-100 !text-3xl font-medium leading-10 tracking-tight"
              />
            </dd>
            <dd className="w-full grid grid-cols-2 gap-x-2 mt-1">
              <Number
                value={toNumber(GMPTotalVolume) / (toNumber(_.sumBy(GMPStatsByChains?.source_chains, 'num_txs')) || 1)}
                format="0,0.00a"
                prefix="GMP: $"
                noTooltip={true}
                className="text-zinc-400 dark:text-zinc-500 text-xs"
              />
              <Number
                value={toNumber(transfersTotalVolume) / (toNumber(transfersStats?.total) || 1)}
                format="0,0.00a"
                prefix="Transfer: $"
                noTooltip={true}
                className="text-zinc-400 dark:text-zinc-500 text-xs"
              />
            </dd>
          </div>
        }
        <div className="border-t lg:border-t-0 border-l sm:border-l-0 border-r border-zinc-200 dark:border-zinc-700 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-4 sm:px-6 xl:px-8 py-8">
          <dt className="text-zinc-400 dark:text-zinc-500 text-sm font-medium leading-6">GMP Contracts</dt>
          <dd className="w-full flex-none">
            <Number
              value={contracts.length}
              format="0,0"
              noTooltip={true}
              className="text-zinc-900 dark:text-zinc-100 !text-3xl font-medium leading-10 tracking-tight"
            />
          </dd>
          <dd className="w-full grid grid-cols-2 gap-x-2 mt-1">
            <Number
              value={chains.filter(d => !d.deprecated && (!d.maintainer_id || !d.no_inflation)).length}
              format="0,0"
              prefix="Number of chains: "
              className="text-zinc-400 dark:text-zinc-500 text-xs"
            />
          </dd>
        </div>
      </dl>
    </div>
  )
}

function StatsBarChart({
  i,
  data,
  totalValue,
  field = 'num_txs',
  stacks = ['gmp', 'transfers'],
  colors = { gmp: '#ff7d20', transfers: '#009ef7', transfers_airdrop: '#de3163' },
  scale = '',
  useStack = true,
  title = '',
  description = '',
  dateFormat = 'D MMM',
  granularity = 'day',
  valueFormat = '0,0',
  valuePrefix = '',
}) {
  const [chartData, setChartData] = useState(null)
  const [x, setX] = useState(null)

  useEffect(() => {
    if (data) {
      setChartData(data.map(d => {
        const time = moment(d.timestamp).utc()
        const timeString = time.format(dateFormat)

        let focusTimeString

        switch (granularity) {
          case 'month':
            focusTimeString = time.format('MMM YYYY')
            break
          case 'week':
            focusTimeString = [time.format(dateFormat), moment(time).add(7, 'days').format(dateFormat)].join(' - ')
            break
          default:
            focusTimeString = timeString
            break
        }

        return {
          ...d,
          timeString,
          focusTimeString,
        }
      }).filter(d => scale !== 'log' || field !== 'volume' || d[field] > 100))
    }
  }, [data, field, scale, dateFormat, granularity, setChartData])

  const CustomTooltip = ({ active, payload }) => {
    if (!active) return

    const data = payload?.[0]?.payload

    const values = toArray(_.concat(stacks, 'total')).map(d => ({
      key: d,
      value: data?.[`${d !== 'total' ? `${d}_` : ''}${field}`],
    }))
    .filter(d => field !== 'volume' || !d.key.includes('airdrop') || d.value > 100)
    .map(d => ({
      ...d,
      key: d.key === 'transfers_airdrop' ? 'airdrop_participations' : d.key,
    }))

    return (
      <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg flex flex-col gap-y-1.5 p-2">
        {values.map((d, i) => (
          <div key={i} className="flex items-center justify-between gap-x-4">
            <span className="capitalize text-xs font-semibold">
              {toTitle(d.key === 'gmp' ? 'GMPs' : d.key)}
            </span>
            <Number
              value={d.value}
              format={valueFormat}
              prefix={valuePrefix}
              noTooltip={true}
              className="text-xs font-medium"
            />
          </div>
        ))}
      </div>
    )
  }

  const d = toArray(chartData).find(d => d.timestamp === x)

  const value = d ? d[field] : chartData?.length > 0 ? totalValue || _.sumBy(chartData, field) : undefined
  const timeString = d ? d.focusTimeString : chartData ? toArray([headString(_.head(chartData.filter(d => d.timestamp))?.focusTimeString, ' - '), lastString(_.last(chartData.filter(d => d.timestamp))?.focusTimeString, ' - ')]).join(' - ') : undefined

  return (
    <div className={clsx('border-l border-r border-t border-zinc-200 dark:border-zinc-700 flex flex-col gap-y-2 px-4 sm:px-6 xl:px-8 py-8', i % 2 !== 0 ? 'sm:border-l-0' : '')}>
      <div className="flex items-start justify-between gap-x-4">
        <div className="flex flex-col gap-y-0.5">
          <span className="text-zinc-900 dark:text-zinc-100 text-base font-semibold">
            {title}
          </span>
          {description && (
            <span className="hidden lg:block text-zinc-400 dark:text-zinc-500 text-sm font-normal">
              {description}
            </span>
          )}
        </div>
        {isNumber(value) && (
          <div className="flex flex-col items-end gap-y-0.5">
            <Number
              value={value}
              format={valueFormat}
              prefix={valuePrefix}
              noTooltip={true}
              className="text-zinc-900 dark:text-zinc-100 !text-base font-semibold"
            />
            <span className="text-zinc-400 dark:text-zinc-500 text-sm text-right whitespace-nowrap">
              {timeString}
            </span>
          </div>
        )}
      </div>
      <div className="w-full h-64 -mb-2.5">
        {!chartData ?
          <div className="w-full h-full flex items-center justify-center">
            <Spinner />
          </div> :
          <ResponsiveContainer>
            <BarChart
              data={chartData}
              onMouseEnter={e => setX(e?.activePayload?.[0]?.payload?.timestamp)}
              onMouseMove={e => setX(e?.activePayload?.[0]?.payload?.timestamp)}
              onMouseLeave={() => setX(null)}
              margin={{ top: 12, right: 0, bottom: 0, left: scale ? -24 : 0 }}
            >
              <XAxis
                dataKey="timeString"
                axisLine={false}
                tickLine={false}
                className="text-xs"
              />
              {scale && (
                <YAxis
                  dataKey={field}
                  scale={scale}
                  domain={[useStack ? 'dataMin' : _.min(stacks.map(s => _.minBy(chartData, `${s}_${field}`)?.[`${s}_${field}`])), useStack ? 'dataMax' : _.max(stacks.map(s => _.maxBy(chartData, `${s}_${field}`)?.[`${s}_${field}`]))]}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => numberFormat(v, '0,0a')}
                />
              )}
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
              {_.reverse(_.cloneDeep(stacks)).map((s, i) => (
                <Bar
                  key={i}
                  stackId={useStack ? field : undefined}
                  dataKey={`${s}_${field}${s.includes('airdrop') ? '_value' : ''}`}
                  fill={colors[s]}
                  minPointSize={scale && i === 0 ? 10 : 0}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        }
      </div>
    </div>
  )
}

export function SankeyChart({
  i,
  data,
  topN = 25,
  totalValue,
  field = 'num_txs',
  title = '',
  description = '',
  valueFormat = '0,0',
  valuePrefix = '',
  noBorder = false,
  className = '',
}) {
  const [x, setX] = useState(null)
  const { resolvedTheme } = useTheme()
  const { chains } = useGlobalStore()

  const d = toArray(data).find(d => d.key === x)

  const value = d ? d[field] : data ? totalValue || _.sumBy(data, field) : undefined
  const keyString = d ? d.key : undefined

  const chartData = _.slice(
    _.orderBy(toArray(data).filter(d => d[field] > 0).map(d => ({
      source: headString(d.key, '_'),
      target: lastString(d.key, '_'),
      value: parseInt(d[field]),
    })), ['value'], ['desc']),
    0, topN,
  )
  .map(d => ({
    ...d,
    source: getChainData(d.source, chains)?.name || d.source,
    target: `${getChainData(d.target, chains)?.name || d.target} `,
  }))

  return (
    <div className={clsx('border-zinc-200 dark:border-zinc-700 flex flex-col gap-y-2', i % 2 !== 0 ? 'sm:border-l-0' : '', !noBorder ? 'border-l border-r border-t px-4 sm:px-6 xl:px-8 py-8' : 'w-full')}>
      <div className="flex items-start justify-between gap-x-4">
        <div className="flex flex-col gap-y-0.5">
          <span className="text-zinc-900 dark:text-zinc-100 text-base font-semibold">
            {title}
          </span>
          {description && (
            <span className="hidden lg:block text-zinc-400 dark:text-zinc-500 text-sm font-normal">
              {description}
            </span>
          )}
        </div>
        {isNumber(value) && (
          <div className="flex flex-col items-end gap-y-0.5">
            <Number
              value={value}
              format={valueFormat}
              prefix={valuePrefix}
              noTooltip={true}
              className="text-zinc-900 dark:text-zinc-100 !text-base font-semibold"
            />
            <span className="text-zinc-400 dark:text-zinc-500 text-sm text-right whitespace-nowrap">
              {keyString}
            </span>
          </div>
        )}
      </div>
      <div className="w-full h-full -mb-2.5">
        {!data ?
          <div className="w-full h-full flex items-center justify-center">
            <Spinner />
          </div> :
          <div className={clsx('w-full h-112 font-semibold', className)}>
            {chartData.length > 0 && (
              <ResponsiveSankey
                data={{
                  nodes: _.uniq(chartData.flatMap(d => [d.source, d.target])).map(d => ({ id: d, nodeColor: getChainData(d.trim(), chains)?.color })),
                  links: chartData,
                }}
                valueFormat={`>-${valuePrefix},`}
                margin={{ top: 10, bottom: 10 }}
                theme={{
                  tooltip: {
                    container: {
                      background: resolvedTheme === 'dark' ? '#18181b' : '#f4f4f5',
                      color: resolvedTheme === 'dark' ? '#f4f4f5' : '#18181b',
                      fontSize: 12,
                      fontWeight: 400,
                    },
                  },
                }}
                colors={d => d.nodeColor}
                nodeOpacity={1}
                nodeHoverOpacity={1}
                nodeHoverOthersOpacity={0.35}
                nodeBorderWidth={0}
                nodeBorderRadius={3}
                linkOpacity={resolvedTheme === 'dark' ? 0.2 : 0.4}
                linkHoverOpacity={resolvedTheme === 'dark' ? 0.7 : 0.9}
                linkHoverOthersOpacity={resolvedTheme === 'dark' ? 0.1 : 0.2}
                linkBlendMode={resolvedTheme === 'dark' ? 'lighten' : 'darken'}
                enableLinkGradient={true}
                labelTextColor={resolvedTheme === 'dark' ? '#f4f4f5' : '#18181b'}
                nodeTooltip={d => {
                  const { id, formattedValue, nodeColor } = { ...d.node }

                  return (
                    <div className="px-2 py-1.5 bg-zinc-100 dark:bg-black rounded-sm shadow-sm flex flex-col space-y-0.5 text-xs">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3" style={{ backgroundColor: nodeColor }} />
                        <span className="font-bold">
                          {id}
                        </span>
                      </div>
                      <span>Total: {formattedValue}</span>
                    </div>
                  )
                }}
              />
            )}
          </div>
        }
      </div>
    </div>
  )
}

function Charts({ data, granularity, params }) {
  if (!data) return

  const { GMPStatsByChains, GMPChart, GMPTotalVolume, transfersStats, transfersChart, transfersAirdropChart, transfersTotalVolume } = { ...data }

  const TIME_FORMAT = granularity === 'month' ? 'MMM' : 'D MMM'

  const chartData = _.orderBy(
    Object.entries(
      _.groupBy(_.concat(
        toArray(GMPChart?.data).map(d => ({
          ...d,
          gmp_num_txs: d.num_txs,
          gmp_volume: d.volume,
        })),
        toArray(transfersChart?.data).map(d => ({
          ...d,
          transfers_num_txs: d.num_txs,
          transfers_volume: d.volume,
        })),
        toArray(transfersAirdropChart?.data).map(d => ({
          ...d,
          transfers_airdrop_num_txs: d.num_txs,
          transfers_airdrop_volume: d.volume,
        })),
      ), 'timestamp')
    )
    .map(([k, v]) => ({
      timestamp: toNumber(k),
      num_txs: _.sumBy(v, 'num_txs'),
      volume: _.sumBy(v, 'volume'),
      gmp_num_txs: _.sumBy(v.filter(v => v.gmp_num_txs > 0), 'gmp_num_txs'),
      gmp_volume: _.sumBy(v.filter(v => v.gmp_volume > 0), 'gmp_volume'),
      transfers_num_txs: _.sumBy(v.filter(v => v.transfers_num_txs > 0), 'transfers_num_txs'),
      transfers_volume: _.sumBy(v.filter(v => v.transfers_volume > 0), 'transfers_volume'),
      transfers_airdrop_num_txs: _.sumBy(v.filter(v => v.transfers_airdrop_num_txs > 0), 'transfers_airdrop_num_txs'),
      transfers_airdrop_volume: _.sumBy(v.filter(v => v.transfers_airdrop_volume > 0), 'transfers_airdrop_volume'),
    }))
    .map(d => ({
      ...d,
      transfers_airdrop_volume_value: d.transfers_airdrop_volume > 0 ? d.transfers_airdrop_volume > 100000 ? _.mean([d.gmp_volume, d.transfers_volume]) * 2 : d.transfers_airdrop_volume : 0,
    })),
    ['timestamp'], ['asc'],
  )

  const maxVolumePerMean = _.maxBy(chartData, 'volume')?.volume / (_.meanBy(chartData, 'volume') || 1)
  const hasAirdropActivities = chartData.find(d => d.transfers_airdrop_volume > 0)

  const scale = false && maxVolumePerMean > 5 && !hasAirdropActivities ? 'log' : undefined
  const useStack = maxVolumePerMean <= 5 || maxVolumePerMean > 10 || hasAirdropActivities

  const groupData = (data, by = 'key') => Object.entries(_.groupBy(toArray(data), by)).map(([k, v]) => ({
    key: v[0]?.key || k,
    num_txs: _.sumBy(v, 'num_txs'),
    volume: _.sumBy(v, 'volume'),
    chain: _.orderBy(
      toArray(_.uniq(toArray(by === 'customKey' ? v[0]?.chain : v.map(d => d.chain))).map(d => getChainData(d, chains))),
      ['i'], ['asc'],
    ).map(d => d.id),
  }))

  const chainPairs = groupData(_.concat(
    toArray(GMPStatsByChains?.source_chains).flatMap(s => toArray(s.destination_chains).map(d => ({
      key: `${s.key}_${d.key}`,
      num_txs: d.num_txs,
      volume: d.volume,
    }))),
    toArray(transfersStats?.data).map(d => ({
      key: `${d.source_chain}_${d.destination_chain}`,
      num_txs: d.num_txs,
      volume: d.volume,
    })),
  ))

  return (
    <div className="border-b border-b-zinc-200 dark:border-b-zinc-700">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:px-2 xl:px-0">
        <StatsBarChart
          i={0}
          data={chartData}
          totalValue={toNumber(_.sumBy(GMPStatsByChains?.source_chains, 'num_txs')) + toNumber(transfersStats?.total)}
          field="num_txs"
          title="Transactions"
          description={`Number of transactions by ${granularity}`}
          dateFormat={TIME_FORMAT}
          granularity={granularity}
        />
        <StatsBarChart
          i={1}
          data={chartData}
          totalValue={toNumber(GMPTotalVolume) + toNumber(transfersTotalVolume)}
          field="volume"
          stacks={['transfers_airdrop', 'gmp', 'transfers']}
          colors={scale === 'log' && useStack ? { gmp: '#33b700', transfers: '#33b700', transfers_airdrop: '#33b700' } : undefined}
          scale={scale}
          useStack={useStack}
          title="Volume"
          description={`Transfer volume by ${granularity}`}
          dateFormat={TIME_FORMAT}
          granularity={granularity}
          valuePrefix="$"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:px-2 xl:px-0">
        <SankeyChart
          i={0}
          data={chainPairs}
          totalValue={toNumber(_.sumBy(GMPStatsByChains?.source_chains, 'num_txs')) + toNumber(transfersStats?.total)}
          field="num_txs"
          title="Transactions"
          description="Total transactions between chains"
        />
        <SankeyChart
          i={1}
          data={chainPairs}
          totalValue={toNumber(GMPTotalVolume) + toNumber(transfersTotalVolume)}
          field="volume"
          title="Volume"
          description="Total volume between chains"
          valuePrefix="$"
        />
      </div>
    </div>
  )
}

function Top({
  i,
  data,
  type = 'chain',
  hasTransfers = true,
  hasGMP = true,
  hasITS = true,
  transfersType,
  field = 'num_txs',
  title = '',
  description = '',
  format = '0,0.00a',
  prefix = '',
  className,
}) {
  const { chains } = useGlobalStore()

  return (
    <div className={clsx('border-l border-r border-t border-zinc-200 dark:border-zinc-700 flex flex-col gap-y-3 px-4 sm:px-6', type === 'chain' ? i % 3 !== 0 ? 'sm:border-l-0' : i % (hasTransfers ? 6 : 3) !== 0 ? 'lg:border-l-0' : '' : !hasTransfers || !hasGMP || i % 4 !== 0 ? 'sm:border-l-0' : '', type === 'chain' ? 'xl:px-4 py-4' : 'xl:px-8 py-8')}>
      <div className="flex flex-col gap-y-0.5">
        <span className="text-zinc-900 dark:text-zinc-100 text-sm font-semibold">
          {title}
        </span>
        {description && (
          <span className="text-zinc-400 dark:text-zinc-500 text-xs font-normal">
            {description}
          </span>
        )}
      </div>
      <div className="w-full">
        {!data ?
          <div className="w-full h-full flex items-center justify-center">
            <Spinner />
          </div> :
          <div className={clsx('overflow-y-auto flex flex-col gap-y-1', className)}>
            {toArray(data).filter(d => (type !== 'chain' || split(d.key, { delimiter: '_' }).filter(k => !getChainData(k, chains)).length < 1) && d[field] > 0).map((d, i) => {
              const keys = split(d.key, { delimiter: '_' })

              return keys.length > 0 && (
                <div key={i} className="flex items-center justify-between gap-x-2">
                  <div className={clsx('flex items-center gap-x-1', ['asset', 'contract', 'address'].includes(type) ? 'h-8' : 'h-6')}>
                    {keys.map((k, j) => {
                      switch (type) {
                        case 'asset':
                          return (
                            <AssetProfile
                              key={j}
                              value={k}
                              addressOrDenom={k}
                              ITSPossible={true}
                              onlyITS={true}
                              isLink={true}
                              width={20}
                              height={20}
                              className="h-5 text-xs font-medium"
                            />
                          )
                        case 'contract':
                        case 'address':
                          return (
                            <Profile
                              key={j}
                              address={k}
                              chain={toArray(d.chain)[0]}
                              width={20}
                              height={20}
                              noCopy={true}
                              customURL={type === 'address' && `/address/${k}${transfersType ? `?transfersType=${transfersType}` : ''}`}
                              className="text-xs font-medium"
                            />
                          )
                        case 'chain':
                        default:
                          const { name, image } = { ...getChainData(k, chains) }

                          const element = (
                            <div key={j} className="flex items-center gap-x-1.5">
                              <Image
                                src={image}
                                alt=""
                                width={20}
                                height={20}
                              />
                              {keys.length === 1 && (
                                <span className="text-zinc-700 dark:text-zinc-300 text-xs font-medium">
                                  {name}
                                </span>
                              )}
                              {keys.length > 1 && (
                                <span className="hidden 2xl:hidden text-zinc-700 dark:text-zinc-300 text-xs font-medium">
                                  {name}
                                </span>
                              )}
                            </div>
                          )

                          return keys.length > 1 ?
                            <div key={j} className="flex items-center gap-x-1">
                              {j > 0 && <MdKeyboardArrowRight size={16} className="text-zinc-700 dark:text-zinc-300" />}
                              {element}
                            </div> :
                            element
                      }
                    })}
                  </div>
                  <Number
                    value={d[field]}
                    format={format}
                    prefix={prefix}
                    noTooltip={true}
                    className="text-zinc-900 dark:text-zinc-100 text-xs font-semibold"
                  />
                </div>
              )
            })}
          </div>
        }
      </div>
    </div>
  )
} 

function Tops({ data, types, params }) {
  const { chains, assets, itsAssets } = useGlobalStore()

  if (!data) return

  const { GMPStatsByChains, GMPStatsByContracts, GMPTopUsers, GMPTopITSUsers, GMPTopITSUsersByVolume, GMPTopITSAssets, GMPTopITSAssetsByVolume, transfersStats, transfersTopUsers, transfersTopUsersByVolume } = { ...data }

  const groupData = (data, by = 'key') => Object.entries(_.groupBy(toArray(data), by)).map(([k, v]) => ({
    key: v[0]?.key || k,
    num_txs: _.sumBy(v, 'num_txs'),
    volume: _.sumBy(v, 'volume'),
    chain: _.orderBy(
      toArray(_.uniq(toArray(by === 'customKey' ? v[0]?.chain : v.map(d => d.chain))).map(d => getChainData(d, chains))),
      ['i'], ['asc'],
    ).map(d => d.id),
  }))

  const getTopData = (data, field = 'num_txs', n = 5) => _.slice(_.orderBy(toArray(data), [field], ['desc']), 0, n)

  const hasTransfers = types.includes('transfers') && !(params?.assetType === 'its' || toArray(params?.asset).findIndex(a => getITSAssetData(a, itsAssets)) > -1)
  const hasGMP = types.includes('gmp')
  const hasITS = hasGMP && params?.assetType !== 'gateway' && toArray(params?.asset).findIndex(a => getAssetData(a, assets)) < 0

  const chainPairs = groupData(_.concat(
    toArray(GMPStatsByChains?.source_chains).flatMap(s => toArray(s.destination_chains).map(d => ({
      key: `${s.key}_${d.key}`,
      num_txs: d.num_txs,
      volume: d.volume,
    }))),
    toArray(transfersStats?.data).map(d => ({
      key: `${d.source_chain}_${d.destination_chain}`,
      num_txs: d.num_txs,
      volume: d.volume,
    })),
  ))

  const sourceChains = groupData(_.concat(
    toArray(GMPStatsByChains?.source_chains).flatMap(s => toArray(s.destination_chains).map(d => ({
      key: s.key,
      num_txs: d.num_txs,
      volume: d.volume,
    }))),
    toArray(transfersStats?.data).map(d => ({
      key: d.source_chain,
      num_txs: d.num_txs,
      volume: d.volume,
    })),
  ))

  const destionationChains = groupData(_.concat(
    toArray(GMPStatsByChains?.source_chains).flatMap(s => toArray(s.destination_chains).map(d => ({
      key: d.key,
      num_txs: d.num_txs,
      volume: d.volume,
    }))),
    toArray(transfersStats?.data).map(d => ({
      key: d.destination_chain,
      num_txs: d.num_txs,
      volume: d.volume,
    })),
  ))

  const transfersUsers = groupData(toArray(transfersTopUsers?.data).map(d => {
    const { name } = { ...accounts.find(a => equalsIgnoreCase(a.address, d.key)) }

    return {
      key: d.key,
      customKey: name || d.key,
      num_txs: d.num_txs,
      volume: d.volume,
    }
  }), 'customKey')

  const transfersUsersByVolume = groupData(toArray(transfersTopUsersByVolume?.data).map(d => {
    const { name } = { ...accounts.find(a => equalsIgnoreCase(a.address, d.key)) }

    return {
      key: d.key,
      customKey: name || d.key,
      num_txs: d.num_txs,
      volume: d.volume,
    }
  }), 'customKey')

  const contracts = groupData(toArray(GMPStatsByContracts?.chains).flatMap(d => toArray(d.contracts).map(c => {
    const { name } = { ...accounts.find(a => equalsIgnoreCase(a.address, c.key)) }

    return {
      key: toCase(c.key, 'lower'),
      customKey: name || toCase(c.key, 'lower'),
      num_txs: c.num_txs,
      volume: c.volume,
      chain: d.key,
    }
  })), 'customKey')

  const GMPUsers = groupData(toArray(GMPTopUsers?.data).map(d => {
    const { name } = { ...accounts.find(a => equalsIgnoreCase(a.address, d.key)) }

    return {
      key: toCase(d.key, 'lower'),
      customKey: name || toCase(d.key, 'lower'),
      num_txs: d.num_txs,
    }
  }), 'customKey')

  const ITSUsers = groupData(toArray(GMPTopITSUsers?.data).map(d => {
    const { name } = { ...accounts.find(a => equalsIgnoreCase(a.address, d.key)) }

    return {
      key: toCase(d.key, 'lower'),
      customKey: name || toCase(d.key, 'lower'),
      num_txs: d.num_txs,
    }
  }), 'customKey')

  const ITSUsersByVolume = groupData(toArray(GMPTopITSUsersByVolume?.data).filter(d => d.volume > 0).map(d => {
    const { name } = { ...accounts.find(a => equalsIgnoreCase(a.address, d.key)) }

    return {
      key: toCase(d.key, 'lower'),
      customKey: name || toCase(d.key, 'lower'),
      num_txs: d.num_txs,
      volume: d.volume,
    }
  }), 'customKey')

  const ITSAssets = groupData(toArray(GMPTopITSAssets?.data).map(d => {
    const { symbol } = { ...getITSAssetData(d.key, itsAssets) }

    return {
      key: toCase(d.key, 'lower'),
      customKey: symbol || toCase(d.key, 'lower'),
      num_txs: d.num_txs,
    }
  }), 'customKey')

  const ITSAssetsByVolume = groupData(toArray(GMPTopITSAssetsByVolume?.data).filter(d => d.volume > 0).map(d => {
    const { symbol } = { ...getITSAssetData(d.key, itsAssets) }

    return {
      key: toCase(d.key, 'lower'),
      customKey: symbol || toCase(d.key, 'lower'),
      num_txs: d.num_txs,
      volume: d.volume,
    }
  }), 'customKey')

  return (
    <div className="border-b border-b-zinc-200 dark:border-b-zinc-700">
      <div className={clsx('grid lg:px-2 xl:px-0', hasTransfers && hasGMP ? '' : 'lg:grid-cols-2')}>
        <div className={clsx('grid grid-cols-2 sm:grid-cols-3', hasTransfers && hasGMP ? 'lg:grid-cols-6' : '')}>
          <Top
            i={0}
            data={getTopData(chainPairs, 'num_txs', 100)}
            hasTransfers={hasTransfers}
            hasGMP={hasGMP}
            title="Top Paths"
            description="by transactions"
            className="h-48"
          />
          <Top
            i={1}
            data={getTopData(sourceChains, 'num_txs', 100)}
            hasTransfers={hasTransfers}
            hasGMP={hasGMP}
            title="Top Sources"
            description="by transactions"
            className="h-48"
          />
          <Top
            i={2}
            data={getTopData(destionationChains, 'num_txs', 100)}
            hasTransfers={hasTransfers}
            hasGMP={hasGMP}
            title="Top Destinations"
            description="by transactions"
            className="h-48"
          />
          <Top
            i={3}
            data={getTopData(chainPairs, 'volume', 100)}
            hasTransfers={hasTransfers}
            hasGMP={hasGMP}
            field="volume"
            title="Top Paths"
            description="by volume"
            prefix="$"
            className="h-48"
          />
          <Top
            i={4}
            data={getTopData(sourceChains, 'volume', 100)}
            hasTransfers={hasTransfers}
            hasGMP={hasGMP}
            field="volume"
            title="Top Sources"
            description="by volume"
            prefix="$"
            className="h-48"
          />
          <Top
            i={5}
            data={getTopData(destionationChains, 'volume', 100)}
            hasTransfers={hasTransfers}
            hasGMP={hasGMP}
            field="volume"
            title="Top Destinations"
            description="by volume"
            prefix="$"
            className="h-48"
          />
        </div>
        <div className={clsx('grid sm:grid-cols-2', hasTransfers && hasGMP ? 'lg:grid-cols-4' : '')}>
          {hasTransfers && (
            <>
              <Top
                i={0}
                data={getTopData(transfersUsers, 'num_txs', 100)}
                type="address"
                hasTransfers={hasTransfers}
                hasGMP={hasGMP}
                hasITS={hasITS}
                transfersType="transfers"
                title="Top Users"
                description="Top users by token transfers transactions"
                className="h-96"
              />
              <Top
                i={1}
                data={getTopData(transfersUsersByVolume, 'volume', 100)}
                type="address"
                hasTransfers={hasTransfers}
                hasGMP={hasGMP}
                hasITS={hasITS}
                transfersType="transfers"
                field="volume"
                title="Top Users"
                description="Top users by token transfers volume"
                prefix="$"
                className="h-96"
              />
            </>
          )}
          {hasGMP && (
            <>
              <Top
                i={2}
                data={getTopData(contracts, 'num_txs', 100)}
                type="contract"
                hasTransfers={hasTransfers}
                hasGMP={hasGMP}
                title="Top Contracts"
                description="Top contracts by GMP transactions"
                className="h-96"
              />
              <Top
                i={3}
                data={getTopData(GMPUsers, 'num_txs', 100)}
                type="address"
                hasTransfers={hasTransfers}
                hasGMP={hasGMP}
                transfersType="gmp"
                title="Top GMP Users"
                description="Top users by GMP transactions"
                className="h-96"
              />
            </>
          )}
        </div>
        {hasITS && !equalsIgnoreCase(params?.contractMethod, 'SquidCoral') && (
          <div className={clsx('grid sm:grid-cols-2 lg:grid-cols-4', !hasTransfers && 'lg:col-span-2')}>
            <Top
              i={0}
              data={getTopData(ITSUsers, 'num_txs', 100)}
              type="address"
              transfersType="gmp"
              title="Top ITS Users"
              description="Top users by ITS transactions"
              className="h-96"
            />
            <Top
              i={1}
              data={getTopData(ITSUsersByVolume, 'volume', 100)}
              type="address"
              transfersType="gmp"
              field="volume"
              title="Top ITS Users"
              description="Top users by ITS volume"
              prefix="$"
              className="h-96"
            />
            <Top
              i={2}
              data={getTopData(ITSAssets, 'num_txs', 100)}
              type="asset"
              transfersType="gmp"
              title="Top ITS Assets"
              description="Top assets by ITS transactions"
              className="h-96"
            />
            <Top
              i={3}
              data={getTopData(ITSAssetsByVolume, 'volume', 100)}
              type="asset"
              transfersType="gmp"
              field="volume"
              title="Top ITS Assets"
              description="Top assets by ITS volume"
              prefix="$"
              className="h-96"
            />
          </div>
        )}
      </div>
    </div>
  )
}

function GMPTimeSpent({
  data,
  format = '0,0',
  prefix = '',
}) {
  if (!data) return

  const { key, num_txs, express_execute, confirm, approve, total } = { ...data }

  const Point = ({ title, name, noTooltip = false }) => {
    const point = (
      <div className="flex flex-col gap-y-0.5">
        <div className="w-2 h-2 bg-blue-600 dark:bg-blue-500 rounded-full p-1" />
        <span className="uppercase text-blue-600 dark:text-blue-500 text-2xs font-medium">
          {title}
        </span>
      </div>
    )

    if (noTooltip) {
      return point
    }

    return (
      <TooltipComponent content={name} className="whitespace-nowrap">
        {point}
      </TooltipComponent>
    )
  }

  let points = toArray([
    express_execute && { id: 'express_execute', title: 'X', name: 'Express Execute', time_spent: express_execute },
    confirm && { id: 'confirm', title: 'C', name: 'Confirm', time_spent: confirm },
    approve && { id: 'approve', title: 'A', name: 'Approve', time_spent: approve },
    total && { id: 'execute', title: 'E', name: 'Execute', label: 'Total', time_spent: total },
  ])

  if (total) {
    points = points.map((d, i) => {
      const value = d.time_spent - (i > 0 ? points[i - 1].time_spent : 0)

      return {
        ...d,
        value, width: toFixed(value * 100 / total, 2),
      }
    })
  }

  return (
    <div className="bg-zinc-50 dark:bg-zinc-800/25 rounded-lg flex flex-col sm:flex-row sm:justify-between sm:gap-x-2 gap-y-2 sm:gap-y-0 px-3 py-4">
      <div className="w-40 flex flex-col gap-y-0.5">
        <ChainProfile
          value={key}
          width={20}
          height={20}
          className="h-5 gap-x-1"
          titleClassName="text-xs"
        />
        <Number
          value={num_txs}
          format="0,0.00a"
          suffix=" records"
          className="text-zinc-700 dark:text-zinc-300 text-xs font-medium whitespace-nowrap"
        />
      </div>
      {total > 0 && (
        <div className="w-full flex flex-col gap-y-0.5">
          <div className="w-full flex items-center justify-between">
            <Point title="S" name="Start" />
            {points.map((d, i) => (
              <div key={i} className="flex justify-between" style={{ width: `${d.width}%` }}>
                <div className="w-full h-0.5 bg-blue-600 dark:bg-blue-500" style={{ marginTop: '3px' }} />
                <TooltipComponent
                  content={(
                    <div className="flex flex-col">
                      <span>{d.name}</span>
                      <TimeSpent
                        fromTimestamp={0}
                        toTimestamp={d.value * 1000}
                        noTooltip={true}
                        className="font-medium"
                      />
                    </div>
                  )}
                  className="whitespace-nowrap"
                >
                  <Point
                    title={d.title}
                    name={d.name}
                    noTooltip={true}
                  />
                </TooltipComponent>
              </div>
            ))}
          </div>
          <div className="w-full flex items-center justify-between ml-2">
            {points.map((d, i) => (
              <div key={i} className="flex justify-end" style={{ width: `${d.width}%` }}>
                {['express_execute', 'execute'].includes(d.id) ?
                  <TooltipComponent content={d.label || d.name} className="whitespace-nowrap">
                    <TimeSpent
                      fromTimestamp={0}
                      toTimestamp={d.time_spent * 1000}
                      noTooltip={true}
                      className="text-zinc-900 dark:text-zinc-100 text-2xs font-medium whitespace-nowrap"
                    />
                  </TooltipComponent> :
                  <div />
                }
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function GMPTimeSpents({ data }) {
  if (!data?.GMPStatsAVGTimes?.time_spents) return

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 flex flex-col gap-y-4 px-4 sm:px-6 xl:px-8 py-8">
      <div className="flex items-start justify-between gap-x-4">
        <div className="flex flex-col gap-y-0.5">
          <span className="text-zinc-900 dark:text-zinc-100 text-base font-semibold">
            GMP Time Spent
          </span>
          <span className="text-zinc-400 dark:text-zinc-500 text-sm font-normal">
            The median time spent of General Message Passing from each chain
          </span>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.GMPStatsAVGTimes.time_spents.map((d, i) => (
          <GMPTimeSpent key={i} data={d} />
        ))}
      </div>
    </div>
  )
}

export function Interchain() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [params, setParams] = useState(getParams(searchParams))
  const [types, setTypes] = useState(params.transfersType || ['gmp', 'transfers'])
  const [data, setData] = useState(null)
  const [timeSpentData, setTimeSpentData] = useState(null)
  const [refresh, setRefresh] = useState(null)
  const globalStore = useGlobalStore()
  const { assets, stats } = { ...globalStore }

  const { transfersType, contractMethod, contractAddress, fromTime, toTime } = { ...params }

  const granularity = getGranularity(fromTime, toTime)

  useEffect(() => {
    const _params = getParams(searchParams)

    if (!_.isEqual(_params, params)) {
      setParams(_params)

      if (_params.contractMethod) {
        setTypes(['gmp'])
      }
      else {
        setTypes(_params.transfersType || ['gmp', 'transfers'])
      }

      setRefresh(true)
    }
  }, [searchParams, params, setParams, setTypes])

  useEffect(() => {
    const metrics = ['GMPStatsByChains', 'GMPStatsByContracts', 'GMPChart', 'GMPTotalVolume', 'GMPTopUsers', 'GMPTopITSUsers', 'GMPTopITSUsersByVolume', 'GMPTopITSAssets', 'GMPTopITSAssetsByVolume', 'transfersStats', 'transfersChart', 'transfersTotalVolume', 'transfersTopUsers', 'transfersTopUsersByVolume']

    const getData = async () => {
      // assets data require when filtering asset
      if (params && toBoolean(refresh) && stats && (!params.asset || (assets && globalStore.itsAssets))) {
        setData({
          ...data,
          [generateKeyByParams(params)]: Object.fromEntries(
            (await Promise.all(toArray(metrics.map(d => new Promise(async resolve => {
              const isSearchITSOnTransfers = types.includes('transfers') && d.startsWith('transfers') && (params.assetType === 'its' || toArray(params.asset).findIndex(a => getITSAssetData(a, globalStore.itsAssets)) > -1)
              const hasITS = types.includes('gmp') && params.assetType !== 'gateway' && toArray(params.asset).findIndex(a => getAssetData(a, assets)) < 0
              const noFilter = Object.keys(params).length === 0

              switch (d) {
                case 'GMPStatsByChains':
                  resolve([d, types.includes('gmp') && ((noFilter && stats[d]) || await GMPStatsByChains(params))])
                  break
                case 'GMPStatsByContracts':
                  resolve([d, types.includes('gmp') && ((noFilter && stats[d]) || await GMPStatsByContracts(params))])
                  break
                case 'GMPStatsAVGTimes':
                  resolve([d, types.includes('gmp') && await GMPStatsAVGTimes({ ...params, fromTime: params.fromTime || moment().subtract(1, 'months').startOf('day').unix() })])
                  break
                case 'GMPChart':
                  resolve([d, types.includes('gmp') && ((noFilter && stats[d]) || await GMPChart({ ...params, granularity }))])
                  break
                case 'GMPTotalVolume':
                  resolve([d, types.includes('gmp') && ((noFilter && stats[d]) || await GMPTotalVolume(params))])
                  break
                case 'GMPTopUsers':
                  resolve([d, types.includes('gmp') && ((noFilter && stats[d]) || await GMPTopUsers({ ...params, size: 100 }))])
                  break
                case 'GMPTopITSUsers':
                  resolve([d, hasITS && ((noFilter && stats[d]) || await GMPTopUsers({ ...params, assetType: 'its', size: 100 }))])
                  break
                case 'GMPTopITSUsersByVolume':
                  resolve([d, hasITS && ((noFilter && stats[d]) || await GMPTopUsers({ ...params, assetType: 'its', orderBy: 'volume', size: 100 }))])
                  break
                case 'GMPTopITSAssets':
                  resolve([d, hasITS && ((noFilter && stats[d]) || await GMPTopITSAssets({ ...params, size: 100 }))])
                  break
                case 'GMPTopITSAssetsByVolume':
                  resolve([d, hasITS && ((noFilter && stats[d]) || await GMPTopITSAssets({ ...params, orderBy: 'volume', size: 100 }))])
                  break
                case 'transfersStats':
                  if (isSearchITSOnTransfers) {
                    resolve([d, { data: [] }])
                  }
                  else {
                    resolve([d, types.includes('transfers') && ((noFilter && stats[d]) || await transfersStats(params))])
                  }
                  break
                case 'transfersChart':
                  if (isSearchITSOnTransfers) {
                    resolve([d, { data: [] }])
                  }
                  else {
                    if (noFilter && stats[d]) {
                      resolve([[d, stats[d]], [d.replace('transfers', 'transfersAirdrop'), stats[d.replace('transfers', 'transfersAirdrop')]]])
                    }
                    else {
                      let value = types.includes('transfers') && await transfersChart({ ...params, granularity })

                      const values = [[d, value]]

                      if (value?.data && granularity === 'month') {
                        const airdrops = [
                          { date: '08-01-2023', fromTime: undefined, toTime: undefined, chain: 'sei', environment: 'mainnet' },
                        ]

                        // custom transfers chart by adding airdrops data
                        for (const airdrop of airdrops) {
                          const { date, chain, environment } = { ...airdrop }
                          let { fromTime, toTime } = { ...airdrop }

                          if (!fromTime) {
                            fromTime = moment(date, 'MM-DD-YYYY').startOf('month').unix()
                          }

                          if (!toTime) {
                            toTime = moment(date, 'MM-DD-YYYY').endOf('month').unix()
                          }

                          if (environment === ENVIRONMENT && (!params.fromTime || toNumber(params.fromTime) < fromTime) && (!params.toTime || toNumber(params.toTime) > toTime)) {
                            const response = await transfersChart({ ...params, chain, fromTime, toTime, granularity })

                            if (toArray(response?.data).length > 0) {
                              for (const v of response.data) {
                                if (v.timestamp && v.volume > 0) {
                                  const i = value.data.findIndex(v => v.timestamp === v.timestamp)

                                  if (i > -1 && value.data[i].volume >= v.volume) {
                                    value.data[i] = { ...value.data[i], volume: value.data[i].volume - v.volume }
                                  }
                                }
                              }

                              values.push([d.replace('transfers', 'transfersAirdrop'), response])
                            }
                          }
                        }
                      }

                      resolve(values)
                    }
                  }
                  break
                case 'transfersTotalVolume':
                  if (isSearchITSOnTransfers) {
                    resolve([d, 0])
                  }
                  else {
                    resolve([d, types.includes('transfers') && ((noFilter && stats[d]) || await transfersTotalVolume(params))])
                  }
                  break
                case 'transfersTopUsers':
                  if (isSearchITSOnTransfers) {
                    resolve([d, { data: [] }])
                  }
                  else {
                    resolve([d, types.includes('transfers') && ((noFilter && stats[d]) || await transfersTopUsers({ ...params, size: 100 }))])
                  }
                  break
                case 'transfersTopUsersByVolume':
                  if (isSearchITSOnTransfers) {
                    resolve([d, { data: [] }])
                  }
                  else {
                    resolve([d, types.includes('transfers') && ((noFilter && stats[d]) || await transfersTopUsers({ ...params, orderBy: 'volume', size: 100 }))])
                  }
                  break
                default:
                  resolve()
                  break
              }
            })))))
            .map(d => Array.isArray(d[0]) ? d : [d])
            .flatMap(d => d)
          ),
        })
        setRefresh(false)
      }
    }

    getData()
  }, [params, data, setData, refresh, setRefresh, assets, stats, globalStore.itsAssets, types, granularity])

  useEffect(() => {
    const getData = async () => {
      if (params && toBoolean(refresh)) {
        setTimeSpentData({
          ...timeSpentData,
          [generateKeyByParams(params)]: {
            GMPStatsAVGTimes: types.includes('gmp') && await GMPStatsAVGTimes({
              ...params,
              fromTime: params.fromTime || moment().subtract(3, 'months').startOf('day').unix(),
            }),
          },
        })
      }
    }

    getData()
  }, [params, setTimeSpentData, refresh, setRefresh, types])

  useEffect(() => {
    const interval = setInterval(() => setRefresh('true'), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Container className="sm:mt-8">
      {!data ? <Spinner /> :
        <div className="flex flex-col gap-y-6">
          <div className="flex items-center gap-x-6">
            <div className="sm:flex-auto">
              <div className="flex items-center gap-x-4">
                <h1 className="text-zinc-900 dark:text-zinc-100 text-base font-semibold leading-6">
                  Statistics
                </h1>
                {_.slice(toArray(contractAddress), 0, 1).map((a, i) => (
                  <Profile
                    key={i}
                    address={a}
                    width={18}
                    height={18}
                    className="text-xs"
                  />
                ))}
                {!contractAddress && equalsIgnoreCase(contractMethod, 'SquidCoral') && (
                  <Profile
                    address={accounts.find(d => equalsIgnoreCase(d.name, 'Squid Coral'))?.address}
                    width={18}
                    height={18}
                    noCopy={true}
                    customURL={`/gmp/search?contractMethod=${contractMethod}`}
                    className="text-xs"
                  />
                )}
              </div>
              <div className="max-w-xl flex flex-wrap items-center mt-2">
                {TIME_SHORTCUTS.map((d, i) => {
                  const selected = ((!fromTime && !_.head(d.value)) || _.head(d.value)?.unix() === toNumber(fromTime)) && ((!toTime && !_.last(d.value)) || _.last(d.value)?.unix() === toNumber(toTime))

                  return (
                    <Link
                      key={i}
                      href={`${pathname}${getQueryString({ ...params, fromTime: _.head(d.value)?.unix(), toTime: _.last(d.value)?.unix() })}`}
                      className={clsx(
                        'min-w-max flex items-center text-xs sm:text-sm whitespace-nowrap mr-4 mb-1 sm:mb-0',
                        selected ? 'text-blue-600 dark:text-blue-500 font-semibold' : 'text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300',
                      )}
                    >
                      <span>{d.label}</span>
                    </Link>
                  )
                })}
              </div>
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
          <Summary data={data[generateKeyByParams(params)]} params={params} />
          <Charts
            data={data[generateKeyByParams(params)]}
            granularity={granularity}
            params={params}
          />
          <Tops
            data={data[generateKeyByParams(params)]}
            types={types}
            params={params}
          />
          {types.includes('gmp') && <GMPTimeSpents data={timeSpentData?.[generateKeyByParams(params)]} />}
        </div>
      }
    </Container>
  )
}
