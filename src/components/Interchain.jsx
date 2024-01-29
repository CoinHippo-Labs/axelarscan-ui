'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Fragment, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Dialog, Listbox, Transition } from '@headlessui/react'
import { ResponsiveContainer, BarChart, XAxis, YAxis, Bar, Tooltip } from 'recharts'
import clsx from 'clsx'
import _ from 'lodash'
import moment from 'moment'
import { MdOutlineRefresh, MdOutlineFilterList, MdClose, MdCheck } from 'react-icons/md'
import { LuChevronsUpDown } from 'react-icons/lu'

import { Container } from '@/components/Container'
import { Overlay } from '@/components/Overlay'
import { Button } from '@/components/Button'
import { DateRangePicker } from '@/components/DateRangePicker'
import { Spinner } from '@/components/Spinner'
import { Number } from '@/components/Number'
import { Profile } from '@/components/Profile'
import { getParams, getQueryString } from '@/components/Pagination'
import { useGlobalStore } from '@/app/providers'
import { GMPStats, GMPChart, GMPTotalVolume, GMPTotalFee, GMPTotalActiveUsers, GMPTopUsers } from '@/lib/api/gmp'
import { transfersStats, transfersChart, transfersTotalVolume, transfersTotalFee, transfersTotalActiveUsers, transfersTopUsers } from '@/lib/api/token-transfer'
import { ENVIRONMENT } from '@/lib/config'
import { split, toArray } from '@/lib/parser'
import { equalsIgnoreCase, toBoolean, toTitle } from '@/lib/string'
import { isNumber, toNumber, numberFormat } from '@/lib/number'
import { timeDiff } from '@/lib/time'
import accounts from '@/data/accounts'

const getGranularity = (fromTimestamp, toTimestamp) => {
  if (!fromTimestamp) return 'month'
  const diff = timeDiff(fromTimestamp * 1000, 'days', toTimestamp * 1000)
  if (diff >= 180) return 'month'
  else if (diff >= 60) return 'week'
  return 'day'
}

const timeShortcuts = [
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
  const { handleSubmit } = useForm()
  const { chains, assets, itsAssets } = useGlobalStore()

  const onSubmit = (e1, e2, _params) => {
    _params = _params || params
    if (!_.isEqual(_params, getParams(searchParams))) {
      router.push(`${pathname}?${getQueryString(_params)}`)
      setParams(_params)
    }
    setOpen(false)
  }

  const onClose = () => {
    setOpen(false)
    setParams(getParams(searchParams))
  }

  const attributes = toArray([
    { label: 'Transfers Type', name: 'transfersType', type: 'select', options: _.concat({ title: 'Any' }, [{ value: 'gmp', title: 'General Message Passing' }, { value: 'transfers', title: 'Token Transfers' }]) },
    { label: 'Source Chain', name: 'sourceChain', type: 'select', multiple: true, options: _.orderBy(toArray(chains).map((d, i) => ({ ...d, i })), ['deprecated', 'i'], ['desc', 'asc']).map(d => ({ value: d.id, title: d.name })) },
    { label: 'Destination Chain', name: 'destinationChain', type: 'select', multiple: true, options: _.orderBy(toArray(chains).map((d, i) => ({ ...d, i })), ['deprecated', 'i'], ['desc', 'asc']).map(d => ({ value: d.id, title: d.name })) },
    { label: 'From / To Chain', name: 'chain', type: 'select', multiple: true, options: _.orderBy(toArray(chains).map((d, i) => ({ ...d, i })), ['deprecated', 'i'], ['desc', 'asc']).map(d => ({ value: d.id, title: d.name })) },
    { label: 'Contract', name: 'contractAddress' },
    { label: 'Asset Type', name: 'assetType', type: 'select', options: _.concat({ title: 'Any' }, [{ value: 'gateway', title: 'Gateway Token' }, { value: 'its', title: 'ITS Token' }]) },
    { label: 'Asset', name: 'asset', type: 'select', multiple: true, options: toArray(_.concat(params.assetType !== 'its' && toArray(assets).map(d => ({ value: d.id, title: d.symbol })), params.assetType !== 'gateway' && toArray(itsAssets).map(d => ({ value: d.symbol, title: `${d.symbol} (ITS)` })))) },
    params.assetType === 'its' && { label: 'ITS Token Address', name: 'itsTokenAddress' },
    { label: 'Time', name: 'time', type: 'datetimeRange' },
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

function Summary({ data }) {
  const { GMPStats, GMPTotalVolume, transfersStats, transfersTotalVolume } = { ...data }

  const contracts = _.orderBy(Object.entries(_.groupBy(
    toArray(GMPStats?.messages).flatMap(m => toArray(m.sourceChains || m.source_chains).flatMap(s =>
      toArray(s.destinationChains || s.destination_chains).flatMap(d => toArray(d.contracts).filter(c => !c.key.includes('_')).map(c => {
        const { name } = { ...accounts.find(a => equalsIgnoreCase(a.address, c.key)) }
        return { ...c, key: name || c.key.toLowerCase(), chain: d.key }
      })
    ))), 'key')
  ).map(([k, v]) => ({ key: k, chains: _.uniq(v.map(d => d.chain)), num_txs: _.sumBy(v, 'num_txs'), volume: _.sumBy(v, 'volume') })), ['num_txs', 'volume', 'key'], ['desc', 'desc', 'asc'])
  const chains = _.uniq(contracts.flatMap(d => d.chains))
  console.log('[destinationContracts]', contracts.map(d => d.key))

  return (
    <div className="border-b lg:border-t border-b-zinc-200 dark:border-b-zinc-700 lg:border-t-zinc-200 lg:dark:border-t-zinc-700">
      <dl className="mx-auto grid max-w-7xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:px-2 xl:px-0">
        <div className="border-t lg:border-t-0 border-l border-r border-zinc-200 dark:border-zinc-700 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-4 sm:px-6 xl:px-8 py-8">
          <dt className="text-zinc-400 dark:text-zinc-500 text-sm font-medium leading-6">Transactions</dt>
          <dd className="w-full flex-none">
            <Number
              value={toNumber(_.sumBy(GMPStats?.messages, 'num_txs')) + toNumber(transfersStats?.total)}
              format="0,0"
              noTooltip={true}
              className="text-zinc-900 dark:text-zinc-100 text-3xl font-medium leading-10 tracking-tight"
            />
          </dd>
          <dd className="w-full grid grid-cols-2 gap-x-2 mt-1">
            <Number
              value={toNumber(_.sumBy(GMPStats?.messages, 'num_txs'))}
              format="0,0.00a"
              prefix="GMPs: "
              noTooltip={true}
              className="text-zinc-400 dark:text-zinc-500 text-xs"
            />
            <Number
              value={toNumber(transfersStats?.total)}
              format="0,0.00a"
              prefix="Transfers: "
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
              className="text-zinc-900 dark:text-zinc-100 text-3xl font-medium leading-10 tracking-tight"
            />
          </dd>
          <dd className="w-full grid grid-cols-2 gap-x-2 mt-1">
            <Number
              value={toNumber(GMPTotalVolume)}
              format="0,0.00a"
              prefix="GMPs: $"
              noTooltip={true}
              className="text-zinc-400 dark:text-zinc-500 text-xs"
            />
            <Number
              value={toNumber(transfersTotalVolume)}
              format="0,0.00a"
              prefix="Transfers: $"
              noTooltip={true}
              className="text-zinc-400 dark:text-zinc-500 text-xs"
            />
          </dd>
        </div>
        <div className="border-t lg:border-t-0 border-l lg:border-l-0 border-r border-zinc-200 dark:border-zinc-700 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-4 sm:px-6 xl:px-8 py-8">
          <dt className="text-zinc-400 dark:text-zinc-500 text-sm font-medium leading-6">Average Volume / Transaction</dt>
          <dd className="w-full flex-none">
            <Number
              value={(toNumber(GMPTotalVolume) + toNumber(transfersTotalVolume)) / (toNumber(_.sumBy(GMPStats?.messages, 'num_txs')) + toNumber(transfersStats?.total) || 1)}
              format="0,0"
              prefix="$"
              noTooltip={true}
              className="text-zinc-900 dark:text-zinc-100 text-3xl font-medium leading-10 tracking-tight"
            />
          </dd>
          <dd className="w-full grid grid-cols-2 gap-x-2 mt-1">
            <Number
              value={toNumber(GMPTotalVolume) / (toNumber(_.sumBy(GMPStats?.messages, 'num_txs')) || 1)}
              format="0,0.00a"
              prefix="GMPs: $"
              noTooltip={true}
              className="text-zinc-400 dark:text-zinc-500 text-xs"
            />
            <Number
              value={toNumber(transfersTotalVolume) / (toNumber(transfersStats?.total) || 1)}
              format="0,0.00a"
              prefix="Transfers: $"
              noTooltip={true}
              className="text-zinc-400 dark:text-zinc-500 text-xs"
            />
          </dd>
        </div>
        <div className="border-t lg:border-t-0 border-l sm:border-l-0 border-r border-zinc-200 dark:border-zinc-700 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-4 sm:px-6 xl:px-8 py-8">
          <dt className="text-zinc-400 dark:text-zinc-500 text-sm font-medium leading-6">GMP Contracts</dt>
          <dd className="w-full flex-none">
            <Number
              value={contracts.length}
              format="0,0"
              noTooltip={true}
              className="text-zinc-900 dark:text-zinc-100 text-3xl font-medium leading-10 tracking-tight"
            />
          </dd>
          <dd className="w-full grid grid-cols-2 gap-x-2 mt-1">
            <Number
              value={chains.length}
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
      setChartData(toArray(data).map(d => {
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

        return { ...d, timeString, focusTimeString }
      }).filter(d => scale !== 'log' || field !== 'volume' || d[field] > 100))
    }
  }, [data, setChartData])

  const CustomTooltip = ({ active, payload }) => {
    if (!active) return null

    const data = _.head(payload)?.payload
    const values = toArray(_.concat(stacks, 'total')).map(d => ({ key: d, value: data?.[`${d !== 'total' ? `${d}_` : ''}${field}`] })).filter(d => field !== 'volume' || !d.key.includes('airdrop') || d.value > 100).map(d => ({ ...d, key: d.key === 'transfers_airdrop' ? 'airdrop_participations' : d.key }))

    return (
      <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg flex flex-col gap-y-1.5 p-2">
        {toArray(values).map((d, i) => (
          <div key={i} className="flex items-center justify-between gap-x-4">
            <span className="capitalize text-xs font-semibold">{toTitle(d.key === 'gmp' ? 'GMPs' : d.key)}</span>
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
  const value = d ? d[field] : chartData ? totalValue || _.sumBy(chartData, field) : null
  const timeString = d ? d.focusTimeString : chartData ? toArray([_.head(split(_.head(chartData)?.focusTimeString, { delimiter: ' - ' })), _.last(split(_.last(chartData)?.focusTimeString, { delimiter: ' - ' }))]).join(' - ') : null

  return (
    <div className={clsx('border-l border-r border-t border-zinc-200 dark:border-zinc-700 flex flex-col gap-y-2 px-4 sm:px-6 xl:px-8 py-8', i % 2 !== 0 ? 'sm:border-l-0' : '')}>
      <div className="flex items-start justify-between gap-x-4">
        <div className="flex flex-col gap-y-0.5">
          <span className="text-zinc-900 dark:text-zinc-100 text-base font-semibold">
            {title}
          </span>
          {description && (
            <span className="hidden lg:block text-slate-400 dark:text-slate-500 text-sm font-normal">
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
      <div className="w-full h-64 -mb-4">
        {!chartData ?
          <div className="w-full h-full flex items-center justify-center">
            <Spinner />
          </div> :
          <ResponsiveContainer>
            <BarChart
              data={chartData}
              onMouseEnter={e => setX(_.head(e?.activePayload)?.payload?.timestamp)}
              onMouseMove={e => setX(_.head(e?.activePayload)?.payload?.timestamp)}
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

function Charts({ data, granularity }) {
  const { GMPStats, GMPChart, GMPTotalVolume, GMPTotalFee, GMPTotalActiveUsers, transfersStats, transfersChart, transfersAirdropChart, transfersTotalVolume, transfersTotalFee, transfersTotalActiveUsers } = { ...data }
  const TIME_FORMAT = granularity === 'month' ? 'MMM' : 'D MMM'

  const chartData = _.orderBy(Object.entries(_.groupBy(_.concat(
    toArray(GMPChart?.data).map(d => ({ ...d, gmp_num_txs: d.num_txs, gmp_volume: d.volume, gmp_fee: d.fee, gmp_users: d.users })),
    toArray(transfersChart?.data).map(d => ({ ...d, transfers_num_txs: d.num_txs, transfers_volume: d.volume, transfers_fee: d.fee, transfers_users: d.users })),
    toArray(transfersAirdropChart?.data).map(d => ({ ...d, transfers_airdrop_num_txs: d.num_txs, transfers_airdrop_volume: d.volume, transfers_airdrop_fee: d.fee, transfers_airdrop_users: d.users })),
  ), 'timestamp')).map(([k, v]) => ({
    timestamp: toNumber(k),
    num_txs: _.sumBy(v, 'num_txs'),
    volume: _.sumBy(v, 'volume'),
    fee: _.sumBy(v, 'fee'),
    users: _.sumBy(v, 'users'),
    gmp_num_txs: _.sumBy(v.filter(_v => _v.gmp_num_txs > 0), 'gmp_num_txs'),
    gmp_volume: _.sumBy(v.filter(_v => _v.gmp_volume > 0), 'gmp_volume'),
    gmp_fee: _.sumBy(v.filter(_v => _v.gmp_fee > 0), 'gmp_fee'),
    gmp_users: _.sumBy(v.filter(_v => _v.gmp_users > 0), 'gmp_users'),
    transfers_num_txs: _.sumBy(v.filter(_v => _v.transfers_num_txs > 0), 'transfers_num_txs'),
    transfers_volume: _.sumBy(v.filter(_v => _v.transfers_volume > 0), 'transfers_volume'),
    transfers_fee: _.sumBy(v.filter(_v => _v.transfers_fee > 0), 'transfers_fee'),
    transfers_users: _.sumBy(v.filter(_v => _v.transfers_users > 0), 'transfers_users'),
    transfers_airdrop_num_txs: _.sumBy(v.filter(_v => _v.transfers_airdrop_num_txs > 0), 'transfers_airdrop_num_txs'),
    transfers_airdrop_volume: _.sumBy(v.filter(_v => _v.transfers_airdrop_volume > 0), 'transfers_airdrop_volume'),
    transfers_airdrop_fee: _.sumBy(v.filter(_v => _v.transfers_airdrop_fee > 0), 'transfers_airdrop_fee'),
    transfers_airdrop_users: _.sumBy(v.filter(_v => _v.transfers_airdrop_users > 0), 'transfers_airdrop_users'),
  })).map(d => ({ ...d, transfers_airdrop_volume_value: d.transfers_airdrop_volume > 0 ? d.transfers_airdrop_volume > 100000 ? _.mean([d.gmp_volume, d.transfers_volume]) * 2 : d.transfers_airdrop_volume : 0 })), ['timestamp'], ['asc'])

  const maxVolumePerMean = _.maxBy(chartData, 'volume')?.volume / (_.meanBy(chartData, 'volume') || 1)
  const hasAirdropActivities = chartData.find(d => d.transfers_airdrop_volume > 0)
  const scale = maxVolumePerMean > 5 && !hasAirdropActivities ? 'log' : undefined
  const useStack = maxVolumePerMean <= 5 || maxVolumePerMean > 10 || hasAirdropActivities

  return (
    <div className="border-b border-b-zinc-200 dark:border-b-zinc-700">
      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:px-2 xl:px-0">
        <StatsBarChart
          i={0}
          data={chartData}
          totalValue={toNumber(_.sumBy(GMPStats?.messages, 'num_txs')) + toNumber(transfersStats?.total)}
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
        <StatsBarChart
          i={2}
          data={chartData}
          totalValue={toNumber(GMPTotalActiveUsers) + toNumber(transfersTotalActiveUsers)}
          field="users"
          title="Active Users"
          description={`Number of active users by ${granularity}`}
          dateFormat={TIME_FORMAT}
          granularity={granularity}
        />
        <StatsBarChart
          i={3}
          data={chartData}
          totalValue={toNumber(GMPTotalFee) + toNumber(transfersTotalFee)}
          field="fee"
          title="Gas Fees"
          description={`Gas fees by ${granularity}`}
          dateFormat={TIME_FORMAT}
          granularity={granularity}
          valuePrefix="$"
        />
      </dl>
    </div>
  )
}

function TimeSpents({ data }) {
  if (!data) return null

  return null
}

const generateKeyFromParams = params => JSON.stringify(params)

export function Interchain() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [params, setParams] = useState(getParams(searchParams))
  const [data, setData] = useState(null)
  const [timeSpentData, setTimeSpentData] = useState(null)
  const [refresh, setRefresh] = useState(null)

  useEffect(() => {
    const _params = getParams(searchParams)
    if (!_.isEqual(_params, params)) {
      setParams(_params)
      setRefresh(true)
    }
  }, [searchParams, params, setParams])

  useEffect(() => {
    const metrics = ['GMPStats', 'GMPChart', 'GMPTotalVolume', 'GMPTotalFee', 'GMPTotalActiveUsers', 'GMPTopUsers', 'transfersStats', 'transfersChart', 'transfersTotalVolume', 'transfersTotalFee', 'transfersTotalActiveUsers', 'transfersTopUsers', 'transfersTopUsersByVolume']

    const getGMPStatsAVGTimes = async params => setTimeSpentData({ ...timeSpentData, [generateKeyFromParams(params)]: { GMPStatsAVGTimes: types.includes('gmp') && await GMPStats({ ...params, avg_times: true }) } })

    const getData = async () => {
      if (params && toBoolean(refresh)) {
        getGMPStatsAVGTimes(params)
        setData({ ...data, [generateKeyFromParams(params)]: Object.fromEntries((await Promise.all(toArray(metrics.map(d => new Promise(async resolve => {
          switch (d) {
            case 'GMPStats':
              resolve([d, types.includes('gmp') && await GMPStats(params)])
              break
            case 'GMPStatsAVGTimes':
              resolve([d, types.includes('gmp') && await GMPStats({ ...params, avg_times: true })])
              break
            case 'GMPChart':
              resolve([d, types.includes('gmp') && await GMPChart({ ...params, granularity })])
              break
            case 'GMPTotalVolume':
              resolve([d, types.includes('gmp') && await GMPTotalVolume(params)])
              break
            case 'GMPTotalFee':
              resolve([d, types.includes('gmp') && await GMPTotalFee(params)])
              break
            case 'GMPTotalActiveUsers':
              resolve([d, types.includes('gmp') && await GMPTotalActiveUsers(params)])
              break
            case 'GMPTopUsers':
              resolve([d, types.includes('gmp') && await GMPTopUsers({ ...params, size: 100 })])
              break
            case 'transfersStats':
              resolve([d, types.includes('transfers') && await transfersStats(params)])
              break
            case 'transfersChart':
              let value = types.includes('transfers') && await transfersChart({ ...params, granularity })
              const values = [[d, value]]

              if (value?.data && granularity === 'month') {
                const airdrops = [
                  { date: '08-01-2023', fromTime: undefined, toTime: undefined, chain: 'sei', environment: 'mainnet' },
                ]

                for (const airdrop of airdrops) {
                  const { date, chain, environment } = { ...airdrop }
                  let { fromTime, toTime } = { ...airdrop }
                  fromTime = fromTime || moment(date).startOf('month').unix()
                  toTime = toTime || moment(date).endOf('month').unix()

                  if (environment === ENVIRONMENT && (!params.fromTime || toNumber(params.fromTime) < fromTime) && (!params.toTime || toNumber(params.toTime) > toTime)) {
                    const _value = await transfersChart({ ...params, chain, fromTime, toTime, granularity })

                    if (toArray(_value?.data).length > 0) {
                      for (const v of _value.data) {
                        if (v.timestamp && v.volume > 0) {
                          const index = value.data.findIndex(_v => _v.timestamp === v.timestamp)
                          if (index > -1 && value.data[index].volume >= v.volume) {
                            value.data[index] = { ...value.data[index], volume: value.data[index].volume - v.volume }
                          }
                        }
                      }
                      values.push([d.replace('transfers', 'transfersAirdrop'), _value])
                    }
                  }
                }
              }

              resolve(values)
              break
            case 'transfersTotalVolume':
              resolve([d, types.includes('transfers') && await transfersTotalVolume(params)])
              break
            case 'transfersTotalFee':
              resolve([d, types.includes('transfers') && await transfersTotalFee(params)])
              break
            case 'transfersTotalActiveUsers':
              resolve([d, types.includes('transfers') && await transfersTotalActiveUsers(params)])
              break
            case 'transfersTopUsers':
              resolve([d, types.includes('transfers') && await transfersTopUsers({ ...params, size: 100 })])
              break
            case 'transfersTopUsersByVolume':
              resolve([d, types.includes('transfers') && await transfersTopUsers({ ...params, orderBy: 'volume', size: 100 })])
              break
            default:
              resolve()
              break
          }
        }))))).map(d => Array.isArray(_.head(d)) ? d : [d]).flatMap(d => d)) })
        setRefresh(false)
      }
    }

    getData()
  }, [params, setData, setTimeSpentData, refresh, setRefresh])

  useEffect(() => {
    const interval = setInterval(() => setRefresh('true'), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const { transfersType, contractAddress, fromTime, toTime } = { ...params }
  const types = toArray(transfersType || ['gmp', 'transfers'])
  const granularity = getGranularity(fromTime, toTime)

  return (
    <Container className="sm:mt-8">
      {!data ? <Spinner /> :
        <div className="flex flex-col gap-y-6">
          <div className="flex items-center gap-x-6">
            <div className="sm:flex-auto">
              <div className="flex items-center gap-x-4">
                <h1 className="text-zinc-900 dark:text-zinc-100 text-base font-semibold leading-6">Statistics</h1>
                <Profile address={contractAddress} />
              </div>
              <div className="max-w-xl flex flex-wrap items-center mt-2">
                {timeShortcuts.map((d, i) => {
                  const selected = ((!fromTime && !_.head(d.value)) || _.head(d.value)?.unix() === toNumber(fromTime)) && ((!toTime && !_.last(d.value)) || _.last(d.value)?.unix() === toNumber(toTime))
                  return (
                    <Link
                      key={i}
                      href={`${pathname}?${getQueryString({ ...params, fromTime: _.head(d.value)?.unix(), toTime: _.last(d.value)?.unix() })}`}
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
          <Summary data={data[generateKeyFromParams(params)]} />
          <Charts data={data[generateKeyFromParams(params)]} granularity={granularity} />
          {types.includes('gmp') && <TimeSpents data={timeSpentData?.[generateKeyFromParams(params)]} />}
        </div>
      }
    </Container>
  )
}
