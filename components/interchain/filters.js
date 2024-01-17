import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { DatePicker, Select } from 'antd'
import _ from 'lodash'
import moment from 'moment'
import { BiX } from 'react-icons/bi'

import Modal from '../modal'
import { toArray, getQueryParams, createMomentFromUnixtime, createDayJSFromUnixtime } from '../../lib/utils'

export default () => {
  const { chains, assets } = useSelector(state => ({ chains: state.chains, assets: state.assets }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }

  const router = useRouter()
  const { pathname, asPath, query } = { ...router }

  const [filters, setFilters] = useState(null)
  const [filterTrigger, setFilterTrigger] = useState(undefined)
  const [hidden, setHidden] = useState(true)

  useEffect(
    () => {
      if (asPath) {
        setFilters({ ...getQueryParams(asPath) })
      }
    },
    [asPath],
  )

  useEffect(
    () => {
      if (filterTrigger !== undefined) {
        const qs = new URLSearchParams()
        Object.entries({ ...filters }).filter(([k, v]) => v).forEach(([k, v]) => { qs.append(k, v) })
        const qs_string = qs.toString()
        router.push(`${pathname}${qs_string ? `?${qs_string}` : ''}`)
        setHidden(true)
      }
    },
    [filterTrigger],
  )

  const fields = toArray([
    ['/gmp', '/transfers'].findIndex(s => pathname.startsWith(s)) > -1 && {
      label: 'Tx Hash',
      name: 'txHash',
      type: 'text',
      placeholder: 'Transaction Hash',
      className: 'col-span-2',
    },
    pathname.startsWith('/interchain') && {
      label: 'Transfers Type',
      name: 'transfersType',
      type: 'select',
      placeholder: 'Select transfers type',
      options: [
        { value: '', title: 'Any' },
        { value: 'gmp', title: 'General Message Passing' },
        { value: 'token_transfers', title: 'Token Transfers' },
      ],
      className: 'col-span-2',
    },
    {
      label: 'Source Chain',
      name: 'sourceChain',
      type: 'select',
      placeholder: 'Select source chain',
      options: _.concat(
        // { value: '', title: 'Any' },
        _.orderBy(toArray(chains_data).map(c => { return { ...c, i: ['ethereum', 'ethereum-2'].includes(c.id) ? 0 : 1, _name: c.name?.toLowerCase() } }).filter(c => !c.no_inflation || c.deprecated), ['deprecated', 'i', '_name'], ['desc', 'asc', 'asc']).map(c => {
          const { id, name } = { ...c }
          return {
            value: id,
            title: name,
          }
        }),
      ),
      multiple: true,
      className: 'col-span-2',
    },
    {
      label: 'Destination Chain',
      name: 'destinationChain',
      type: 'select',
      placeholder: 'Select destination chain',
      options: _.concat(
        // { value: '', title: 'Any' },
        _.orderBy(toArray(chains_data).map(c => { return { ...c, i: ['ethereum', 'ethereum-2'].includes(c.id) ? 0 : 1, _name: c.name?.toLowerCase() } }).filter(c => !c.no_inflation || c.deprecated), ['deprecated', 'i', '_name'], ['desc', 'asc', 'asc']).map(c => {
          const { id, name } = { ...c }
          return {
            value: id,
            title: name,
          }
        }),
      ),
      multiple: true,
      className: 'col-span-2',
    },
    {
      label: 'From/To Chain',
      name: 'chain',
      type: 'select',
      placeholder: 'Select chain',
      options: _.concat(
        // { value: '', title: 'Any' },
        _.orderBy(toArray(chains_data).map(c => { return { ...c, i: ['ethereum', 'ethereum-2'].includes(c.id) ? 0 : 1, _name: c.name?.toLowerCase() } }).filter(c => !c.no_inflation || c.deprecated), ['deprecated', 'i', '_name'], ['desc', 'asc', 'asc']).map(c => {
          const { id, name } = { ...c }
          return {
            value: id,
            title: name,
          }
        }),
      ),
      multiple: true,
      className: 'col-span-2',
    },
    pathname.startsWith('/gmp') && {
      label: 'Method',
      name: 'contractMethod',
      type: 'select',
      placeholder: 'Select method',
      options: [
        { value: '', title: 'Any' },
        { value: 'callContract', title: 'CallContract' },
        { value: 'callContractWithToken', title: 'CallContractWithToken' },
        { value: 'InterchainTransfer', title: 'InterchainTransfer' },
        { value: 'InterchainTokenDeployment', title: 'InterchainTokenDeployment' },
      ],
    },
    pathname.startsWith('/transfers') && {
      label: 'Type',
      name: 'type',
      type: 'select',
      placeholder: 'Select type',
      options: [
        { value: '', title: 'Any' },
        { value: 'deposit_address', title: 'Deposit Address' },
        { value: 'send_token', title: 'Send Token' },
        { value: 'wrap', title: 'Wrap' },
        { value: 'unwrap', title: 'Unwrap' },
        { value: 'erc20_transfer', title: 'ERC20 Transfer' },
      ],
    },
    pathname.startsWith('/transfers') && {
      label: 'Status',
      name: 'status',
      type: 'select',
      placeholder: 'Select status',
      options: [
        { value: '', title: 'Any' },
        { value: 'executed', title: 'Executed' },
        { value: 'failed', title: 'Failed' },
      ],
    },
    pathname.startsWith('/gmp') && {
      label: 'Status',
      name: 'status',
      type: 'select',
      placeholder: 'Select status',
      options: [
        { value: '', title: 'Any' },
        { value: 'called', title: 'Called' },
        { value: 'confirming', title: 'Wait for Confirmation' },
        { value: 'express_executed', title: 'Express Executed' },
        { value: 'approving', title: 'Wait for Approval' },
        { value: 'approved', title: 'Approved' },
        { value: 'executing', title: 'Executing' },
        { value: 'executed', title: 'Executed' },
        { value: 'error', title: 'Error Execution' },
        { value: 'insufficient_fee', title: 'Insufficient Fee' },
        { value: 'not_enough_gas_to_execute', title: 'Not Enough Gas' },
      ],
    },
    ['/gmp', '/transfers'].findIndex(s => pathname.startsWith(s)) > -1 && {
      label: 'Sender',
      name: 'senderAddress',
      type: 'text',
      placeholder: 'Sender address',
    },
    ['/interchain', '/gmp'].findIndex(s => pathname.startsWith(s)) > -1 && {
      label: 'Contract',
      name: 'contractAddress',
      type: 'text',
      placeholder: 'Contract address',
      className: pathname.startsWith('/interchain') ? 'col-span-2' : '',
    },
    pathname.startsWith('/transfers') && {
      label: 'Recipient',
      name: 'recipientAddress',
      type: 'text',
      placeholder: 'Recipient address',
    },
    {
      label: 'Asset',
      name: 'asset',
      type: 'select',
      placeholder: 'Select asset',
      options: _.concat(
        // { value: '', title: 'Any' },
        _.orderBy(toArray(assets_data).map(a => { return { ...a, i: ['uusdc'].includes(a.id) ? 0 : 1, _symbol: a.symbol?.toLowerCase() } }), ['i', '_symbol'], ['asc', 'asc']).map(a => {
          const { denom, symbol } = { ...a }
          return {
            value: denom,
            title: symbol,
          }
        }),
      ),
      multiple: true,
      className: 'col-span-2',
    },
    ['/interchain', '/gmp'].findIndex(s => pathname.startsWith(s)) > -1 && {
      label: 'Asset Type',
      name: 'assetType',
      type: 'select',
      placeholder: 'Select asset type',
      options: [
        { value: '', title: 'Any' },
        { value: 'gateway', title: 'Gateway Token' },
        { value: 'its', title: 'ITS Token' },
      ],
    },
    ['/interchain', '/gmp'].findIndex(s => pathname.startsWith(s)) > -1 && filters?.assetType === 'its' && {
      label: 'ITS Token address',
      name: 'itsTokenAddress',
      type: 'text',
      placeholder: 'ITS token address',
    },
    {
      label: 'Time',
      name: 'time',
      type: 'datetime-range',
      placeholder: 'Select transaction time',
      className: 'col-span-2',
    },
    pathname.startsWith('/transfers') && {
      label: 'Sort By',
      name: 'sortBy',
      type: 'select',
      placeholder: 'Select sort by',
      options: [
        { value: 'time', title: 'Transfer Time' },
        { value: 'value', title: 'Transfer Value' },
      ],
    },
    pathname.startsWith('/gmp') && {
      label: 'Sort By',
      name: 'sortBy',
      type: 'select',
      placeholder: 'Select sort by',
      options: [
        { value: 'time', title: 'Contract Call Time' },
        { value: 'value', title: 'Token Value' },
      ],
    },
    pathname.startsWith('/gmp') && {
      label: 'Proposal ID',
      name: 'proposalId',
      type: 'text',
      placeholder: 'Proposal ID',
    },
  ])

  const timeFilterShortcuts = [
    { label: 'Last 7 Days', value: [moment().subtract(7, 'days').startOf('day'), moment().endOf('day')] },
    { label: 'Last 30 Days', value: [moment().subtract(30, 'days').startOf('day'), moment().endOf('day')] },
    { label: 'Last 365 Days', value: [moment().subtract(365, 'days').startOf('day'), moment().endOf('day')] },
    { label: 'All Time', value: [] },
  ]

  const { fromTime, toTime } = { ...filters }
  const filtered = (!!filterTrigger || filterTrigger === undefined) && Object.keys({ ...query }).length > 0

  return (
    <div className="grid lg:flex lg:items-center gap-2 lg:gap-4">
      {pathname.startsWith('/interchain') && (
        <div className="order-2 lg:order-1 min-w-max flex flex-wrap items-center sm:justify-end">
          {timeFilterShortcuts.map((d, i) => {
            const { label, value } = { ...d }
            const selected = ((!fromTime && !_.head(value)) || _.head(value)?.unix() === createMomentFromUnixtime(fromTime).unix()) && ((!toTime && !_.last(value)) || _.last(value)?.unix() === createMomentFromUnixtime(toTime).unix())
            return (
              <div
                key={i}
                onClick={
                  () => {
                    setFilters({ ...filters, fromTime: _.head(value) && moment(_.head(value).valueOf()).unix(), toTime: _.last(value) && moment(_.last(value).valueOf()).unix() })
                    setFilterTrigger(moment().valueOf())
                  }
                }
                className={`min-w-max ${selected ? 'text-blue-400 dark:text-white font-semibold' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 font-medium'} cursor-pointer whitespace-nowrap flex items-center text-xs sm:text-sm sm:ml-3 mr-3 sm:mr-0`}
              >
                <span>{label}</span>
              </div>
            )
          })}
        </div>
      )}
      <div className="order-1 lg:order-2 flex sm:justify-end">
        <Modal
          hidden={hidden}
          disabled={!(chains_data && assets_data)}
          onClick={() => setHidden(false)}
          buttonTitle={`Filter${filtered ? 'ed' : ''}`}
          buttonClassName={`max-w-min ${filtered ? 'border-2 border-blue-400 dark:border-white text-blue-400 dark:text-white font-semibold py-0.5 px-2' : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 font-medium py-1 px-2.5'} rounded text-sm sm:text-base`}
          title={
            <div className="flex items-center justify-between">
              <span>
                Filter {pathname?.startsWith('/gmp') ? 'GMP' : pathname?.startsWith('/transfers') ? 'Token Transfers' : 'Interchain'}
              </span>
              <div
                onClick={
                  () => {
                    setHidden(true)
                    setFilters({ ...getQueryParams(asPath) })
                  }
                }
                className="hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer rounded-full p-2"
              >
                <BiX size={18} />
              </div>
            </div>
          }
          body={
            <div className="form form-filters grid sm:grid-cols-2 gap-x-4 mt-2 -mb-3">
              {fields.map((f, i) => {
                const {
                  label,
                  name,
                  type,
                  placeholder,
                  options,
                  multiple,
                  className,
                } = { ...f }

                return (
                  <div key={i} className={`form-element ${className || ''}`}>
                    {label && (
                      <div className="form-label text-slate-600 dark:text-slate-200 font-medium">
                        {label}
                      </div>
                    )}
                    {type === 'select' ?
                      multiple ?
                        <Select
                          mode="multiple"
                          allowClear
                          placeholder={placeholder}
                          value={toArray(filters?.[name])}
                          onChange={v => setFilters({ ...filters, [name]: toArray(v).join(',') })}
                          options={toArray(options).map((o, i) => { return { ...o, key: i, label: o.title } })}
                        /> :
                        <select
                          placeholder={placeholder}
                          value={filters?.[name]}
                          onChange={e => setFilters({ ...filters, [name]: e.target.value })}
                          className="form-select bg-slate-50"
                        >
                          {toArray(options).map((o, i) => {
                            const { title, value } = { ...o }
                            return (
                              <option
                                key={i}
                                title={title}
                                value={value}
                              >
                                {title}
                              </option>
                            )
                          })}
                        </select> :
                      type === 'datetime-range' ?
                        <DatePicker.RangePicker
                          showTime
                          format="YYYY/MM/DD HH:mm:ss"
                          presets={[
                            { label: 'Today', value: [moment().startOf('day'), moment().endOf('day')] },
                            { label: 'Last 24 Hours', value: [moment().subtract(24, 'hours'), moment().endOf('hour')] },
                            { label: 'Last 7 Days', value: [moment().subtract(7, 'days').startOf('day'), moment().endOf('day')] },
                            { label: 'This Month', value: [moment().startOf('month'), moment().endOf('month')] },
                            { label: 'Last Month', value: [moment().subtract(1, 'months').startOf('month'), moment().subtract(1, 'months').endOf('month')] },
                            { label: 'Last 30 Days', value: [moment().subtract(30, 'days').startOf('day'), moment().endOf('day')] },
                            { label: 'Last 90 Days', value: [moment().subtract(90, 'days').startOf('day'), moment().endOf('day')] },
                            { label: 'Last 180 Days', value: [moment().subtract(180, 'days').startOf('day'), moment().endOf('day')] },
                            { label: 'Last 365 Days', value: [moment().subtract(365, 'days').startOf('day'), moment().endOf('day')] },
                            { label: 'This Year', value: [moment().startOf('year'), moment().endOf('year')] },
                            { label: 'Last Year', value: [moment().subtract(1, 'years').startOf('year'), moment().subtract(1, 'years').endOf('year')] },
                            { label: 'All Time', value: [] },
                          ]}
                          value={filters?.fromTime && filters.toTime ? [createDayJSFromUnixtime(filters.fromTime), createDayJSFromUnixtime(filters.toTime)] : undefined}
                          onChange={v => setFilters({ ...filters, fromTime: _.head(v) && moment(_.head(v).valueOf()).unix(), toTime: _.last(v) && moment(_.last(v).valueOf()).unix() })}
                          className="form-input"
                          style={{ display: 'flex' }}
                        /> :
                        <input
                          type={type}
                          placeholder={placeholder}
                          value={filters?.[name]}
                          onChange={e => setFilters({ ...filters, [name]: e.target.value })}
                          className="form-input"
                        />
                    }
                  </div>
                )
              })}
            </div>
          }
          noCancelOnClickOutside={true}
          onCancel={
            () => {
              setFilters(null)
              setFilterTrigger(typeof filterTrigger === 'boolean' ? null : false)
            }
          }
          cancelButtonTitle="Reset"
          onConfirm={() => setFilterTrigger(moment().valueOf())}
          confirmButtonTitle="Search"
        />
      </div>
    </div>
  )
}