'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Fragment, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Combobox, Dialog, Listbox, Transition } from '@headlessui/react'
import clsx from 'clsx'
import _ from 'lodash'
import { MdOutlineCode, MdOutlineRefresh, MdOutlineFilterList, MdClose, MdCheck } from 'react-icons/md'
import { LuChevronsUpDown } from 'react-icons/lu'

import { Container } from '@/components/Container'
import { Overlay } from '@/components/Overlay'
import { Button } from '@/components/Button'
import { DateRangePicker } from '@/components/DateRangePicker'
import { Image } from '@/components/Image'
import { Copy } from '@/components/Copy'
import { Tooltip } from '@/components/Tooltip'
import { Spinner } from '@/components/Spinner'
import { Tag } from '@/components/Tag'
import { Number } from '@/components/Number'
import { Profile, ChainProfile } from '@/components/Profile'
import { TimeAgo } from '@/components/Time'
import { Pagination } from '@/components/Pagination'
import { useGlobalStore } from '@/components/Global'
import { searchBatches } from '@/lib/api/token-transfer'
import { ENVIRONMENT, getChainData, getAssetData } from '@/lib/config'
import { toCase, split, toArray } from '@/lib/parser'
import { getParams, getQueryString, generateKeyByParams, isFiltered } from '@/lib/operator'
import { equalsIgnoreCase, capitalize, toBoolean, ellipse, filterSearchInput } from '@/lib/string'
import { toNumber, formatUnits } from '@/lib/number'

const size = 25

function Filters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [params, setParams] = useState(getParams(searchParams, size))
  const [searchInput, setSearchInput] = useState({})
  const [types, setTypes] = useState([])
  const { handleSubmit } = useForm()
  const { chains } = useGlobalStore()

  useEffect(() => {
    if (params) {
      setSearchInput({})
    }
  }, [params, setSearchInput])

  useEffect(() => {
    const getTypes = async () => {
      const response = await searchBatches({ aggs: { types: { terms: { field: 'commands.type.keyword', size: 25 } } }, size: 0 })
      setTypes(toArray(response).map(d => d.key))
    }

    getTypes()
  }, [])

  const onSubmit = (e1, e2, _params) => {
    if (!_params) {
      _params = params
    }

    if (!_.isEqual(_params, getParams(searchParams, size))) {
      router.push(`${pathname}${getQueryString(_params)}`)
      setParams(_params)
    }

    setOpen(false)
  }

  const onClose = () => {
    setOpen(false)
    setParams(getParams(searchParams, size))
  }

  const attributes = [
    { label: 'Batch ID', name: 'batchId' },
    { label: 'Command ID', name: 'commandId' },
    { label: 'Chain', name: 'chain', type: 'select', searchable: true, multiple: true, options: _.orderBy(toArray(chains).filter(d => d.chain_type === 'evm' && (!d.no_inflation || d.deprecated)).map((d, i) => ({ ...d, i })), ['deprecated', 'name', 'i'], ['desc', 'asc', 'asc']).map(d => ({ value: d.id, title: `${d.name}${d.deprecated ? ` (deprecated)` : ''}` })) },
    { label: 'Command Type', name: 'type', type: 'select', options: _.concat({ title: 'Any' }, types.map(d => ({ value: d, title: d }))) },
    { label: 'Status', name: 'status', type: 'select', options: _.concat({ title: 'Any' }, ['executed', 'unexecuted', 'signed', 'signing', 'aborted'].map(d => ({ value: d, title: capitalize(d) }))) },
    { label: 'Time', name: 'time', type: 'datetimeRange' },
  ]

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

export function EVMBatches() {
  const NUM_COMMANDS_TRUNCATE = 10

  const searchParams = useSearchParams()
  const [params, setParams] = useState(null)
  const [searchResults, setSearchResults] = useState(null)
  const [refresh, setRefresh] = useState(null)
  const { chains, assets } = useGlobalStore()

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
        let response = await searchBatches({ ...params, size })

        if (response && !response.data && !['mainnet', 'testnet'].includes(ENVIRONMENT)) {
          response = { data: [], total: 0 }
        }

        setSearchResults({
          ...(refresh ? undefined : searchResults),
          [generateKeyByParams(params)]: { ...response },
        })
        setRefresh(false)
      }
    }

    getData()
  }, [params, setSearchResults, refresh, setRefresh])

  const { data, total } = { ...searchResults?.[generateKeyByParams(params)] }

  return (
    <Container className="sm:mt-8">
      {!data ? <Spinner /> :
        <div>
          <div className="flex items-center justify-between gap-x-4">
            <div className="sm:flex-auto">
              <div className="flex items-center space-x-2">
                <h1 className="underline text-zinc-900 dark:text-zinc-100 text-base font-semibold leading-6">
                  EVM Batches
                </h1>
                <span className="text-zinc-400 dark:text-zinc-500">|</span>
                <Link href="/amplifier-proofs" className="text-blue-600 dark:text-blue-500 text-base font-medium leading-6">
                  Amplifier Proofs
                </Link>
              </div>
              <p className="mt-2 text-zinc-400 dark:text-zinc-500 text-sm">
                <Number value={total} suffix={` result${total > 1 ? 's' : ''}`} /> 
              </p>
            </div>
            <div className="flex items-center gap-x-2">
              <Filters />
              {refresh ? <Spinner /> :
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
          {refresh && <Overlay />}
          <div className="overflow-x-auto lg:overflow-x-visible -mx-4 sm:-mx-0 mt-4">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
              <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900">
                <tr className="text-zinc-800 dark:text-zinc-200 text-sm font-semibold">
                  <th scope="col" className="pl-4 sm:pl-0 pr-3 py-3.5 text-left">
                    ID
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left">
                    Chain
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left">
                    Commands
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-right">
                    Status
                  </th>
                  <th scope="col" className="pl-3 pr-4 sm:pr-0 py-3.5 text-right">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
                {data.map(d => {
                  const { url, transaction_path } = { ...getChainData(d.chain, chains)?.explorer }

                  const executed = toArray(d.commands).length === toArray(d.commands).filter(c => c.executed).length
                  const status = executed ? 'executed' : toCase(d.status?.replace('BATCHED_COMMANDS_STATUS_', ''), 'lower')

                  return (
                    <tr key={d.batch_id} className="align-top text-zinc-400 dark:text-zinc-500 text-sm">
                      <td className="pl-4 sm:pl-0 pr-3 py-4 text-left">
                        <div className="flex flex-col gap-y-0.5">
                          <Copy value={d.batch_id}>
                            <Link
                              href={`/evm-batch/${d.chain}/${d.batch_id}`}
                              target="_blank"
                              className="text-blue-600 dark:text-blue-500 font-semibold"
                            >
                              {ellipse(d.batch_id)}
                            </Link>
                          </Copy>
                          <Copy value={d.key_id}>
                            <span>{d.key_id}</span>
                          </Copy>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-left">
                        <ChainProfile value={d.chain} />
                      </td>
                      <td className="px-3 py-4 text-left">
                        <div className="flex flex-col gap-y-3">
                          {_.slice(toArray(d.commands), 0, NUM_COMMANDS_TRUNCATE).map((c, i) => {
                            const { type, deposit_address } = { ...c }
                            const { amount, name, cap, account, salt, newOwners, newOperators, newWeights, newThreshold, sourceChain, sourceTxHash, contractAddress } = { ...c.params }
                            let { symbol, decimals } = { ...c.params }

                            const transferID = parseInt(c.id, 16)
                            const assetData = getAssetData(symbol, assets)

                            symbol = assetData?.addresses?.[d.chain]?.symbol || assetData?.symbol || symbol
                            decimals = assetData?.addresses?.[d.chain]?.decimals || assetData?.decimals || decimals || 18
                            const image = assetData?.addresses?.[d.chain]?.image || assetData?.image

                            const sourceChainData = getChainData(sourceChain, chains)
                            const destinationChainData = getChainData(d.chain, chains)

                            const typeElement = (
                              <Tooltip content={c.executed ? 'Executed' : 'Unexecuted'}>
                                <Tag className={clsx('w-fit capitalize mr-2', c.executed ? 'bg-green-600 dark:bg-green-500' : 'bg-orange-500 dark:bg-orange-600')}>
                                  {type}
                                </Tag>
                              </Tooltip>
                            )

                            return (
                              <div key={i} className="flex lg:flex-wrap lg:items-center">
                                {url && c.transactionHash ?
                                  <Link href={`${url}${transaction_path?.replace('{tx}', c.transactionHash)}`} target="_blank">
                                    {typeElement}
                                  </Link> :
                                  typeElement
                                }
                                {symbol && !['approveContractCall'].includes(type) && (
                                  <div className="min-w-fit h-6 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center gap-x-1.5 mr-2 px-2.5 py-1">
                                    <Image
                                      src={image}
                                      alt=""
                                      width={16}
                                      height={16}
                                    />
                                    {amount && assets ?
                                      <Number
                                        value={formatUnits(amount, decimals)}
                                        format="0,0.000000"
                                        suffix={` ${symbol}`}
                                        className="text-zinc-900 dark:text-zinc-100 text-xs font-medium"
                                      /> :
                                      <span className="text-zinc-900 dark:text-zinc-100 text-xs font-medium">
                                        {symbol}
                                      </span>
                                    }
                                  </div>
                                )}
                                {sourceChainData && (
                                  <div className="min-w-fit h-6 flex items-center gap-x-1.5 mr-2">
                                    {sourceTxHash && (
                                      <Link
                                        href={`/gmp/${sourceTxHash}${sourceChainData.chain_type === 'cosmos' && c.id ? `?commandId=${c.id}` : ''}`}
                                        target="_blank"
                                        className="text-blue-600 dark:text-blue-500 font-medium"
                                      >
                                        GMP
                                      </Link>
                                    )}
                                    <Tooltip content={sourceChainData.name} className="whitespace-nowrap">
                                      <Image
                                        src={sourceChainData.image}
                                        alt=""
                                        width={20}
                                        height={20}
                                      />
                                    </Tooltip>
                                    {contractAddress && (
                                      <>
                                        <MdOutlineCode size={20} className="text-zinc-700 dark:text-zinc-300" />
                                        {destinationChainData && (
                                          <Tooltip content={destinationChainData.name} className="whitespace-nowrap">
                                            <Image
                                              src={destinationChainData.image}
                                              alt=""
                                              width={20}
                                              height={20}
                                            />
                                          </Tooltip>
                                        )}
                                        <Profile
                                          address={contractAddress}
                                          chain={d.chain}
                                          width={20}
                                          height={20}
                                        />
                                      </>
                                    )}
                                  </div>
                                )}
                                {type === 'mintToken' && (
                                  <div className="min-w-fit h-6 flex items-center gap-x-1.5 mr-2">
                                    <Link
                                      href={`/transfer?transferId=${transferID}`}
                                      target="_blank"
                                      className="text-blue-600 dark:text-blue-500 font-medium"
                                    >
                                      Transfer
                                    </Link>
                                    {account && (
                                      <>
                                        <MdOutlineCode size={20} className="text-zinc-700 dark:text-zinc-300" />
                                        <Profile
                                          address={account}
                                          chain={d.chain}
                                          width={20}
                                          height={20}
                                        />
                                      </>
                                    )}
                                  </div>
                                )}
                                {salt && (
                                  <div className="h-6 flex items-center gap-x-1.5 mr-2">
                                    <span className="text-zinc-400 dark:text-zinc-500">
                                      {deposit_address ? 'Deposit address' : 'Salt'}:
                                    </span>
                                    {deposit_address ?
                                      <Copy size={16} value={deposit_address}>
                                        <Link
                                          href={`/account/${deposit_address}`}
                                          target="_blank"
                                          className="text-zinc-400 dark:text-zinc-500"
                                        >
                                          {ellipse(deposit_address, 6, '0x')}
                                        </Link>
                                      </Copy> :
                                      <Copy size={16} value={salt}>
                                        <span className="text-zinc-400 dark:text-zinc-500">
                                          {ellipse(salt, 6, '0x')}
                                        </span>
                                      </Copy>
                                    }
                                  </div>
                                )}
                                {name && (
                                  <div className="flex flex-col mr-2">
                                    <span className="text-zinc-900 dark:text-zinc-100 text-xs font-medium">
                                      {name}
                                    </span>
                                    <div className="flex items-center gap-x-2">
                                      {decimals > 0 && (
                                        <Number
                                          value={decimals}
                                          prefix="Decimals: "
                                          className="text-zinc-400 dark:text-zinc-500 text-xs"
                                        />
                                      )}
                                      {cap > 0 && (
                                        <Number
                                          value={cap}
                                          prefix="Cap: "
                                          className="text-zinc-400 dark:text-zinc-500 text-xs"
                                        />
                                      )}
                                    </div>
                                  </div>
                                )}
                                {newOwners && (
                                  <Number
                                    value={split(newOwners, { delimiter: ';' }).length}
                                    suffix={' New Owners'}
                                    className="h-6 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-300 text-xs font-medium mr-2 px-2.5 py-1"
                                  />
                                )}
                                {newOperators && (
                                  <div className="flex items-center mr-2">
                                    <Number
                                      value={split(newOperators, { delimiter: ';' }).length}
                                      suffix={' New Operators'}
                                      className="h-6 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-300 text-xs font-medium mr-2 px-2.5 py-1"
                                    />
                                    {newWeights && (
                                      <Number
                                        value={_.sum(split(newWeights, { delimiter: ';' }).map(w => toNumber(w)))}
                                        prefix="["
                                        suffix="]"
                                        className="text-zinc-700 dark:text-zinc-300 text-xs font-medium"
                                      />
                                    )}
                                  </div>
                                )}
                                {newThreshold && (
                                  <Number
                                    value={newThreshold}
                                    prefix={'Threshold: '}
                                    className="text-xs font-medium mr-2"
                                  />
                                )}
                              </div>
                            )
                          })}
                          {toArray(d.commands).length > NUM_COMMANDS_TRUNCATE && (
                            <Link
                              href={`/evm-batch/${d.chain}/${d.batch_id}`}
                              target="_blank"
                              className="w-fit bg-zinc-50 dark:bg-zinc-800 rounded text-blue-600 dark:text-blue-500 whitespace-nowrap px-2"
                            >
                              <Number
                                value={toArray(d.commands).length - NUM_COMMANDS_TRUNCATE}
                                prefix={'and '}
                                suffix={' more'}
                              />
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <div className="flex flex-col items-end">
                          {status && (
                            <Tag className={clsx('w-fit capitalize', ['executed'].includes(status) ? 'bg-green-600 dark:bg-green-500' : ['signed'].includes(status) ? 'bg-orange-500 dark:bg-orange-600' : ['signing'].includes(status) ? 'bg-yellow-400 dark:bg-yellow-500' : 'bg-red-600 dark:bg-red-500')}>
                              {status}
                            </Tag>
                          )}
                        </div>
                      </td>
                      <td className="pl-3 pr-4 sm:pr-0 py-4 flex items-center justify-end text-right">
                        <TimeAgo timestamp={d.created_at?.ms} />
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
