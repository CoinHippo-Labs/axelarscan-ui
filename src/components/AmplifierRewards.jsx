'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Fragment, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Combobox, Dialog, Listbox, Transition } from '@headlessui/react'
import clsx from 'clsx'
import _ from 'lodash'
import { MdOutlineRefresh, MdOutlineFilterList, MdClose, MdCheck } from 'react-icons/md'
import { LuChevronsUpDown, LuChevronUp, LuChevronDown } from 'react-icons/lu'

import { Container } from '@/components/Container'
import { Overlay } from '@/components/Overlay'
import { Button } from '@/components/Button'
import { DateRangePicker } from '@/components/DateRangePicker'
import { Copy } from '@/components/Copy'
import { Tooltip } from '@/components/Tooltip'
import { Spinner } from '@/components/Spinner'
import { Tag } from '@/components/Tag'
import { Number } from '@/components/Number'
import { Profile } from '@/components/Profile'
import { TimeAgo } from '@/components/Time'
import { Pagination } from '@/components/Pagination'
import { useGlobalStore } from '@/components/Global'
import { searchRewardsDistribution, getRewardsPool } from '@/lib/api/validator'
import { getChainData } from '@/lib/config'
import { split, toArray } from '@/lib/parser'
import { getParams, getQueryString, generateKeyByParams, isFiltered } from '@/lib/operator'
import { equalsIgnoreCase, toBoolean, find, ellipse, toTitle, filterSearchInput } from '@/lib/string'
import { isNumber, formatUnits } from '@/lib/number'

function Info({ chain, rewardsPool, cumulativeRewards }) {
  const router = useRouter()
  const pathname = usePathname()
  const { chains, verifiers } = useGlobalStore()

  const { id, name, multisig_prover } = { ...getChainData(chain, chains) }
  const { voting_verifier, multisig } = { ...rewardsPool }

  const contracts = [
    { ...voting_verifier, id: 'voting_verifier', title: 'Verification' },
    { ...multisig, id: 'multisig', title: 'Signing' },
  ]

  const contractsFields = [
    { id: 'balance', title: 'Reward pool balance'},
    { id: 'epoch_duration', title: 'Epoch duration (blocks)'},
    { id: 'rewards_per_epoch', title: 'Rewards per epoch'},
    { id: 'last_distribution_epoch', title: 'Last distribution epoch'},
    { id: 'address', title: 'Contract addresses'},
  ]

  const { symbol } = { ...getChainData('axelarnet', chains)?.native_token }

  return (
    <>
      <div className="overflow-auto bg-zinc-50/75 dark:bg-zinc-800/25 shadow sm:rounded-lg">
        <div className="px-4 sm:px-6 py-6">
          <h3 className="text-zinc-900 dark:text-zinc-100 text-base font-semibold leading-7">
            <Listbox value={id} onChange={v => router.push(`${pathname.replace(chain, v)}`)} className="w-56">
              {({ open }) => {
                const isSelected = v => v === id || equalsIgnoreCase(v, chain)
                const selectedValue = toArray(chains).find(d => isSelected(d.id))

                return (
                  <div className="relative">
                    <Listbox.Button className="relative w-full cursor-pointer rounded-md shadow-sm border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 sm:text-sm sm:leading-6 text-left pl-3 pr-10 py-1.5">
                      <span className="block truncate">
                        {selectedValue?.name}
                      </span>
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
                        {toArray(chains).filter(d => d.chain_type === 'vm').map((d, j) => (
                          <Listbox.Option key={j} value={d.id} className={({ active }) => clsx('relative cursor-default select-none pl-3 pr-9 py-2', active ? 'bg-blue-600 text-white' : 'text-zinc-900')}>
                            {({ selected, active }) => (
                              <>
                                <span className={clsx('block truncate', selected ? 'font-semibold' : 'font-normal')}>
                                  {d.name}
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
            </Listbox>
          </h3>
        </div>
        <div className="border-t border-zinc-200 dark:border-zinc-700">
          <div className="grid sm:grid-cols-2 gap-y-4">
            <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
              <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">No. Verifiers</dt>
                <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                  <Number
                    value={toArray(verifiers).filter(d => find(id, d.supportedChains)).length}
                    format="0,0"
                    className="font-medium"
                  />
                </dd>
              </div>
              <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Cumulative rewards</dt>
                <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                  <Number
                    value={cumulativeRewards}
                    suffix={` ${symbol}`}
                    noTooltip={true}
                    className="font-medium"
                  />
                </dd>
              </div>
            </dl>
            <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
              <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Total reward pool balance</dt>
                <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                  <Number
                    value={formatUnits(rewardsPool?.balance, 6)}
                    suffix={` ${symbol}`}
                    noTooltip={true}
                    className="font-medium"
                  />
                </dd>
              </div>
              <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium"></dt>
                <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
      <div className="overflow-hidden bg-zinc-50/75 dark:bg-zinc-800/25 shadow sm:rounded-lg">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
          <thead className="sticky top-0 z-10">
            <tr className="text-zinc-800 dark:text-zinc-200 text-base font-semibold">
              <th scope="col" className="px-4 sm:px-6 py-6 text-left">
              </th>
              {contracts.map(({ id, title }) => (
                <th key={id} scope="col" className="px-4 sm:px-6 py-6 text-left">
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 ">
            {contractsFields.map(f => (
              <tr key={f.id} className="align-top text-zinc-400 dark:text-zinc-500 text-sm">
                <td className="px-4 sm:px-6 py-6 text-left">
                  <div className="text-zinc-900 dark:text-zinc-100 font-medium">
                    {f.title}
                  </div>
                </td>
                {contracts.map(d => {
                  let element

                  switch (f.id) {
                    case 'balance':
                      element = (
                        <Number
                          value={formatUnits(d.balance, 6)}
                          suffix={` ${symbol}`}
                          noTooltip={true}
                          className="font-medium"
                        />
                      )
                      break
                    case 'epoch_duration':
                      element = isNumber(d.epoch_duration) ?
                        <Number
                          value={d.epoch_duration}
                          format="0,0"
                          className="font-medium"
                        /> :
                        '-'
                      break
                    case 'rewards_per_epoch':
                      element = (
                        <Number
                          value={formatUnits(d.rewards_per_epoch, 6)}
                          suffix={` ${symbol}`}
                          noTooltip={true}
                          className="font-medium"
                        />
                      )
                      break
                    case 'last_distribution_epoch':
                      element = isNumber(d.epoch_duration) && d.last_distribution_epoch ?
                        <Number
                          value={d.last_distribution_epoch}
                          format="0,0"
                          className="font-medium"
                        /> :
                        '-'
                      break
                    case 'address':
                      element = (
                        <div className="flex flex-col gap-y-4">
                          {d.id === 'multisig' && multisig_prover?.address && (
                            <div className="inline-flex items-center space-x-2">
                              <Profile address={multisig_prover.address} />
                              <span>{name} Prover</span>
                            </div>
                          )}
                          <div className="inline-flex items-center space-x-2">
                            <Profile address={d.address} />
                            {d.id === 'voting_verifier' ?
                              <span>{name} Voting Verifier</span> :
                              <Tooltip content="The global Multisig contract is used for the rewards pool for signing" className="whitespace-nowrap text-xs">
                                <span>Global Multisig</span>
                              </Tooltip>
                            }
                          </div>
                        </div>
                      )
                      break
                    default:
                      break
                  }

                  return (
                    <td key={`${d.id}_${f.id}`} className="px-4 sm:px-6 py-6 text-left">
                      <div className="text-zinc-800 dark:text-zinc-200 text-sm">
                        {element}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

const size = 25

function Filters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [params, setParams] = useState(getParams(searchParams, size))
  const [searchInput, setSearchInput] = useState({})
  const { handleSubmit } = useForm()

  useEffect(() => {
    if (params) {
      setSearchInput({})
    }
  }, [params, setSearchInput])

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
    { label: 'Epoch', name: 'epochCount' },
    { label: 'Tx Hash', name: 'txHash' },
    { label: 'Contract', name: 'contractAddress' },
    { label: 'Rewards Contract', name: 'rewardsContractAddress' },
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

export function AmplifierRewards({ chain }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [params, setParams] = useState(null)
  const [searchResults, setSearchResults] = useState(null)
  const [refresh, setRefresh] = useState(null)
  const [distributionExpanded, setDistributionExpanded] = useState(null)
  const [rewardsPool, setRewardsPool] = useState(null)
  const [cumulativeRewards, setCumulativeRewards] = useState(null)
  const { chains } = useGlobalStore()

  useEffect(() => {
    if (!chain && chains) {
      const path = `${pathname}/${chains.filter(d => d.chain_type === 'vm')[0]?.chain_name}`

      if (path !== pathname) {
        router.push(path)
      }
    }
  }, [chain, router, pathname, chains])

  useEffect(() => {
    const _params = getParams(searchParams, size)

    if (!_.isEqual(_params, params)) {
      setParams(_params)
      setRefresh(true)
    }
  }, [searchParams, params, setParams])

  useEffect(() => {
    const getData = async () => {
      if (chain && params && toBoolean(refresh) && chains) {
        const { voting_verifier } = { ...getChainData(chain, chains) }
        const { data, total } = { ...await searchRewardsDistribution({ ...params, chain, size }) }

        setSearchResults({
          ...(refresh ? undefined : searchResults),
          [generateKeyByParams(params)]: {
            data: toArray(data).map(d => ({
              ...d,
              pool_type: equalsIgnoreCase(d.contract_address || d.multisig_contract_address, voting_verifier?.address) ? 'verification' : 'signing',
            })),
            total: total || toArray(data).length,
          },
        })
        setRefresh(false)

        setDistributionExpanded(null)
        setRewardsPool((await getRewardsPool({ chain }))?.data?.[0])

        const { aggs } = { ...await searchRewardsDistribution({ ...params, chain, aggs: { cumulativeRewards: { sum: { field: 'total_amount' } } }, size: 0 }) }

        if (isNumber(aggs?.cumulativeRewards?.value)) {
          setCumulativeRewards(aggs.cumulativeRewards.value)
        }
      }
    }

    getData()
  }, [chain, params, setSearchResults, refresh, setRefresh, setDistributionExpanded, setRewardsPool, chains])

  const { data, total } = { ...searchResults?.[generateKeyByParams(params)] }

  return (
    <Container className="sm:mt-8">
      {!data ? <Spinner /> :
        <div className="flex flex-col gap-y-12">
          <div className="flex flex-col gap-y-4">
            <div className="flex items-center justify-between gap-x-4">
              <div className="sm:flex-auto">
                <h1 className="text-zinc-900 dark:text-zinc-100 text-base font-semibold leading-6">
                  Amplifier Rewards
                </h1>
              </div>
            </div>
            <Info
              chain={chain}
              rewardsPool={rewardsPool}
              cumulativeRewards={cumulativeRewards}
            />
          </div>
          <div>
            <div className="flex items-center justify-between gap-x-4">
              <div className="sm:flex-auto">
                <h2 className="text-zinc-900 dark:text-zinc-100 text-base font-semibold leading-6">
                  Rewards distribution history
                </h2>
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
                      Height
                    </th>
                    <th scope="col" className="whitespace-nowrap px-3 py-3.5 text-left">
                      Tx Hash
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left">
                      Pool
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left">
                      Recipients
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right">
                      Payout
                    </th>
                    <th scope="col" className="whitespace-nowrap pl-3 pr-4 sm:pr-0 py-3.5 text-right">
                      Payout at
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
                  {data.map(d => (
                    <tr key={d.txhash} className="align-top text-zinc-400 dark:text-zinc-500 text-sm">
                      <td className="pl-4 sm:pl-0 pr-3 py-4 text-left">
                       {d.height && (
                          <Link
                            href={`/block/${d.height}`}
                            target="_blank"
                            className="text-blue-600 dark:text-blue-500 font-medium"
                          >
                            <Number value={d.height} />
                          </Link>
                        )}
                      </td>
                      <td className="px-3 py-4 text-left">
                        <Copy value={d.txhash}>
                          <Link
                            href={`/tx/${d.txhash}`}
                            target="_blank"
                            className="text-blue-600 dark:text-blue-500 font-semibold"
                          >
                            {ellipse(d.txhash)}
                          </Link>
                        </Copy>
                      </td>
                      <td className="px-3 py-4 text-left">
                        <Tag className="w-fit bg-green-600 dark:bg-green-500 capitalize text-white">
                          {toTitle(d.pool_type)}
                        </Tag>
                      </td>
                      <td className="px-3 py-4 text-left">
                        <div className="flex flex-col gap-y-2">
                          <div onClick={() => setDistributionExpanded(equalsIgnoreCase(d.txhash, distributionExpanded) ? null : d.txhash)} className="flex items-center cursor-pointer gap-x-1">
                            <Number
                              value={d.total_receivers}
                              format="0,0"
                              suffix=" Verifiers"
                              noTooltip={true}
                              className="text-zinc-900 dark:text-zinc-100 font-medium"
                            />
                            {equalsIgnoreCase(d.txhash, distributionExpanded) ? <LuChevronUp size={18} /> : <LuChevronDown size={18} />}
                          </div>
                          {equalsIgnoreCase(d.txhash, distributionExpanded) && (
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                              {toArray(d.receivers).map((r, i) => (
                                <div key={i} className="flex items-center justify-between gap-x-2">
                                  <Profile
                                    address={r.receiver}
                                    width={18}
                                    height={18}
                                    className="text-xs"
                                  />
                                  <Number
                                    value={r.amount}
                                    noTooltip={true}
                                    className="text-zinc-900 dark:text-zinc-100 text-xs font-medium"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-left">
                        <div className="flex items-center justify-end">
                          <Number
                            value={d.total_amount}
                            suffix={` ${getChainData('axelarnet', chains)?.native_token?.symbol}`}
                            noTooltip={true}
                            className="text-zinc-900 dark:text-zinc-100 font-semibold"
                          />
                        </div>
                      </td>
                      <td className="pl-3 pr-4 sm:pr-0 py-4 flex items-center justify-end text-right">
                        <TimeAgo timestamp={d.created_at?.ms} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > size && (
              <div className="flex items-center justify-center mt-8">
                <Pagination sizePerPage={size} total={total} />
              </div>
            )}
          </div>
        </div>
      }
    </Container>
  )
}
