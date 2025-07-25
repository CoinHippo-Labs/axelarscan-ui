'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Fragment, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Combobox, Dialog, Listbox, Transition } from '@headlessui/react'
import clsx from 'clsx'
import _ from 'lodash'
import { MdOutlineRefresh, MdOutlineFilterList, MdClose, MdCheck } from 'react-icons/md'
import { LuChevronsUpDown } from 'react-icons/lu'

import { Container } from '@/components/Container'
import { Overlay } from '@/components/Overlay'
import { Button } from '@/components/Button'
import { DateRangePicker } from '@/components/DateRangePicker'
import { Copy } from '@/components/Copy'
import { Tooltip } from '@/components/Tooltip'
import { Spinner } from '@/components/Spinner'
import { Tag } from '@/components/Tag'
import { Number } from '@/components/Number'
import { ChainProfile } from '@/components/Profile'
import { ExplorerLink } from '@/components/ExplorerLink'
import { TimeAgo } from '@/components/Time'
import { Pagination } from '@/components/Pagination'
import { useGlobalStore } from '@/components/Global'
import { getRPCStatus, searchAmplifierProofs } from '@/lib/api/validator'
import { getChainData } from '@/lib/config'
import { split, toArray, getValuesOfAxelarAddressKey } from '@/lib/parser'
import { getParams, getQueryString, generateKeyByParams, isFiltered } from '@/lib/operator'
import { equalsIgnoreCase, capitalize, toBoolean, headString, ellipse, toTitle, filterSearchInput } from '@/lib/string'

const size = 25

function Filters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [params, setParams] = useState(getParams(searchParams, size))
  const [searchInput, setSearchInput] = useState({})
  const { handleSubmit } = useForm()
  const { chains } = useGlobalStore()

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

  const attributes = toArray([
    { label: 'Session ID', name: 'sessionId' },
    { label: 'Message ID', name: 'messageId' },
    { label: 'Chain', name: 'chain', type: 'select', searchable: true, multiple: true, options: _.orderBy(toArray(chains).filter(d => d.chain_type === 'vm' && (!d.no_inflation || d.deprecated)).map((d, i) => ({ ...d, i })), ['deprecated', 'name', 'i'], ['desc', 'asc', 'asc']).map(d => ({ value: d.id, title: `${d.name}${d.deprecated ? ` (deprecated)` : ''}` })) },
    { label: 'Multisig Prover Contract Address', name: 'multisigProverContractAddress' },
    { label: 'Multisig Contract Address', name: 'multisigContractAddress' },
    { label: 'Status', name: 'status', type: 'select', multiple: true, options: _.concat({ title: 'Any' }, ['completed', 'failed', 'pending'].map(d => ({ value: d, title: capitalize(d) }))) },
    { label: 'Signer (Verifier Address)', name: 'signer' },
    params.signer && { label: 'Sign', name: 'sign', type: 'select', options: _.concat({ title: 'Any' }, ['signed', 'unsubmitted'].map(d => ({ value: d, title: capitalize(d) }))) },
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

export function AmplifierProofs() {
  const searchParams = useSearchParams()
  const [params, setParams] = useState(null)
  const [searchResults, setSearchResults] = useState(null)
  const [refresh, setRefresh] = useState(null)
  const [blockData, setBlockData] = useState(null)
  const { chains } = useGlobalStore()

  useEffect(() => {
    const _params = getParams(searchParams, size)

    if (!_.isEqual(_params, params)) {
      setParams(_params)
      setRefresh(true)
    }
  }, [searchParams, params, setParams])

  useEffect(() => {
    const getData = async () => setBlockData(await getRPCStatus())
    getData()
  }, [setBlockData])

  useEffect(() => {
    const getData = async () => {
      if (params && toBoolean(refresh) && blockData) {
        const { data, total } = { ...await searchAmplifierProofs({ ...params, size }) }

        setSearchResults({
          ...(refresh ? undefined : searchResults),
          [generateKeyByParams(params)]: {
            data: _.orderBy(toArray(data).map(d => {
              const signs = getValuesOfAxelarAddressKey(d).map(s => ({
                ...s,
                option: s.sign ? 'signed' : 'unsubmitted',
              }))

              const signOptions = Object.entries(_.groupBy(signs, 'option')).map(([k, v]) => ({
                option: k,
                value: v?.length,
                signers: toArray(v?.map(d => d.signer)),
              }))
              .filter(s => s.value)
              .map(s => ({
                ...s,
                i: s.option === 'signed' ? 0 : 1,
              }))

              // add unsubmitted option
              if (toArray(d.participants).length > 0 && signOptions.findIndex(s => s.option === 'unsubmitted') < 0 && _.sumBy(signOptions, 'value') < d.participants.length) {
                signOptions.push({
                  option: 'unsubmitted',
                  value: d.participants.length - _.sumBy(signOptions, 'value'),
                })
              }

              return {
                ...d,
                status: d.success ? 'completed' : d.failed ? 'failed' : d.expired || d.expired_height < blockData.latest_block_height ? 'expired' : 'pending',
                height: _.minBy(signs, 'height')?.height || d.height,
                signs: _.orderBy(signs, ['height', 'created_at'], ['desc', 'desc']),
                signOptions: _.orderBy(signOptions, ['i'], ['asc']),
              }
            }), ['created_at.ms'], ['desc']),
            total,
          },
        })
        setRefresh(false)
      }
    }

    getData()
  }, [params, setSearchResults, refresh, setRefresh, blockData])

  const { data, total } = { ...searchResults?.[generateKeyByParams(params)] }

  return (
    <Container className="sm:mt-8">
      {!data ? <Spinner /> :
        <div>
          <div className="flex items-center justify-between gap-x-4">
            <div className="sm:flex-auto">
              <div className="flex items-center space-x-2">
                <Link href="/evm-batches" className="text-blue-600 dark:text-blue-500 text-base font-medium leading-6">
                  EVM Batches
                </Link>
                <span className="text-zinc-400 dark:text-zinc-500">|</span>
                <h1 className="underline text-zinc-900 dark:text-zinc-100 text-base font-semibold leading-6">
                  Amplifier Proofs
                </h1>
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
                  <th scope="col" className="whitespace-nowrap pl-4 sm:pl-0 pr-3 py-3.5 text-left">
                    Session ID
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left">
                    Messages
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left">
                    Height
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left">
                    Participations
                  </th>
                  <th scope="col" className="pl-3 pr-4 sm:pr-0 py-3.5 text-right">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
                {data.map(d => {
                  const chain = d.chain || d.destination_chain

                  return (
                    <tr key={d.id} className="align-top text-zinc-400 dark:text-zinc-500 text-sm">
                      <td className="pl-4 sm:pl-0 pr-3 py-4 text-left">
                        <div className="flex flex-col gap-y-0.5">
                          <div className="flex items-center gap-x-1">
                            <Copy value={`${chain}-${d.session_id}`}>
                              <Link
                                href={`/amplifier-proof/${d.id}`}
                                target="_blank"
                                className="text-blue-600 dark:text-blue-500 font-semibold"
                              >
                                {chain}-{d.session_id}
                              </Link>
                            </Copy>
                            {d.gateway_txhash && <ExplorerLink value={d.gateway_txhash} chain={chain} />}
                          </div>
                          {d.multisig_prover_contract_address && (
                            <div className="flex items-center">
                              <Tooltip content="Multisig Prover Contract" className="whitespace-nowrap">
                                <Copy value={d.multisig_prover_contract_address}>
                                  {ellipse(d.multisig_prover_contract_address)}
                                </Copy>
                              </Tooltip>
                            </div>
                          )}
                          {d.multisig_contract_address && (
                            <div className="flex items-center">
                              <Tooltip content="Multisig Contract" className="whitespace-nowrap">
                                <Copy value={d.multisig_contract_address}>
                                  {ellipse(d.multisig_contract_address)}
                                </Copy>
                              </Tooltip>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-left">
                        <div className="flex flex-col gap-y-0.5">
                          {toArray(d.message_ids || { message_id: d.message_id, source_chain: d.source_chain }).map((m, i) => {
                            if (!m.message_id) {
                              m.message_id = m.id
                            }

                            if (!m.source_chain) {
                              m.source_chain = m.chain
                            }

                            const { url, transaction_path } = { ...getChainData(m.source_chain, chains)?.explorer }

                            return (
                              <div key={i} className="flex items-center gap-x-4">
                                <ChainProfile value={m.source_chain} />
                                <div className="flex items-center gap-x-1">
                                  <Copy value={m.message_id}>
                                      <Link
                                        href={`${url}${transaction_path?.replace('{tx}', headString(m.message_id))}`}
                                        target="_blank"
                                        className="text-blue-600 dark:text-blue-500 font-semibold"
                                      >
                                        {ellipse(m.message_id)}
                                      </Link>
                                    </Copy>
                                  <ExplorerLink value={headString(m.message_id)} chain={m.source_chain} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-left">
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
                        <div className="flex flex-col gap-y-1">
                          {d.status && (
                            <Tag className={clsx('w-fit capitalize', ['completed'].includes(d.status) ? 'bg-green-600 dark:bg-green-500' : ['failed'].includes(d.status) ? 'bg-red-600 dark:bg-red-500' : ['expired'].includes(d.status) ? 'bg-zinc-400 dark:bg-zinc-500' : 'bg-yellow-400 dark:bg-yellow-500')}>
                              {d.status}
                            </Tag>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-left">
                        <Link
                          href={`/amplifier-proof/${d.id}`}
                          target="_blank"
                          className="w-fit flex items-center"
                        >
                          {d.signOptions.map((s, i) => (
                            <Number
                              key={i}
                              value={s.value}
                              format="0,0"
                              suffix={` ${toTitle(s.option.substring(0, ['unsubmitted'].includes(s.option) ? 2 : undefined))}`}
                              noTooltip={true}
                              className={clsx('rounded-xl uppercase text-xs mr-2 px-2.5 py-1', ['signed'].includes(s.option) ? 'bg-green-600 dark:bg-green-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500')}
                            />
                          ))}
                        </Link>
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
