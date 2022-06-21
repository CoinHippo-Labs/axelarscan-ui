import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { DatePicker } from 'antd'
import { BiX } from 'react-icons/bi'

import Modal from '../modals'
import { getChain } from '../../lib/object/chain'
import { getDenom } from '../../lib/object/denom'
import { params_to_obj } from '../../lib/utils'

export default () => {
  const { evm_chains, cosmos_chains, assets } = useSelector(state => ({ evm_chains: state.evm_chains, cosmos_chains: state.cosmos_chains, assets: state.assets }), shallowEqual)
  const { evm_chains_data } = { ...evm_chains }
  const { cosmos_chains_data } = { ...cosmos_chains }
  const { assets_data } = { ...assets }

  const router = useRouter()
  const { pathname, query, asPath } = { ...router }

  const [filters, setFilters] = useState(null)
  const [filter, setFilter] = useState(undefined)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    if (evm_chains_data && cosmos_chains_data && assets_data && asPath) {
      const params = params_to_obj(asPath?.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))
      const chains_data = _.concat(evm_chains_data, cosmos_chains_data)
      const { txHash, sourceChain, destinationChain, asset, confirmed, depositAddress, senderAddress, recipientAddress, fromTime, toTime } = { ...params }
      setFilters({
        txHash,
        sourceChain: getChain(sourceChain, chains_data)?._id || sourceChain,
        destinationChain: getChain(destinationChain, chains_data)?._id || destinationChain,
        asset: getDenom(asset, assets_data)?.id || asset,
        confirmed: ['confirmed', 'unconfirmed'].includes(confirmed?.toLowerCase()) ? confirmed.toLowerCase() : undefined,
        depositAddress,
        senderAddress,
        recipientAddress,
        time: fromTime && toTime && [moment(Number(fromTime)), moment(Number(toTime))],
      })
    }
  }, [evm_chains_data, cosmos_chains_data, assets_data, asPath])

  useEffect(() => {
    if (filter !== undefined) {
      const qs = new URLSearchParams()
      Object.entries({ ...filters }).filter(([k, v]) => v).forEach(([k, v]) => {
        let key, value
        switch (k) {
          case 'time':
            key = 'fromTime'
            value = moment(v[0]).valueOf()
            qs.append(key, value)
            key = 'toTime'
            value = moment(v[1]).valueOf()
            break
          default:
            key = k
            value = v
            break
        }
        qs.append(key, value)
      })
      const qs_string = qs.toString()
      router.push(`${pathname}${qs_string ? `?${qs_string}` : ''}`)
      setHidden(true)
    }
  }, [filter])

  const chains_data = _.concat(evm_chains_data || [], cosmos_chains_data || [])
  const fields = [
    {
      label: 'Tx Hash',
      name: 'txHash',
      type: 'text',
      placeholder: 'Transaction Hash',
      className: 'col-span-2',
    },
    {
      label: 'Source Chain',
      name: 'sourceChain',
      type: 'select',
      placeholder: 'Select source chain',
      options: _.concat(
        { value: '', title: 'Any' },
        chains_data?.map(c => {
          return {
            value: c.id,
            title: c.name,
          }
        }) || [],
      ),
    },
    {
      label: 'Destination Chain',
      name: 'destinationChain',
      type: 'select',
      placeholder: 'Select destination chain',
      options: _.concat(
        { value: '', title: 'Any' },
        chains_data?.map(c => {
          return {
            value: c.id,
            title: c.name,
          }
        }) || [],
      ),
    },
    {
      label: 'Asset',
      name: 'asset',
      type: 'select',
      placeholder: 'Select asset',
      options: _.concat(
        { value: '', title: 'Any' },
        assets_data?.map(a => {
          return {
            value: a.id,
            title: a.symbol,
          }
        }) || [],
      ),
    },
    {
      label: 'Confirmed',
      name: 'confirmed',
      type: 'select',
      placeholder: 'Select confirmed',
      options: [
        { value: '', title: 'Any' },
        { value: 'confirmed', title: 'Confirmed' },
        { value: 'unconfirmed', title: 'Unconfirmed' },
      ],
    },
    {
      label: 'Deposit Address',
      name: 'depositAddress',
      type: 'text',
      placeholder: 'Deposit address',
      className: 'col-span-2',
    },
    {
      label: 'Sender',
      name: 'senderAddress',
      type: 'text',
      placeholder: 'Sender address',
    },
    {
      label: 'Recipient',
      name: 'recipientAddress',
      type: 'text',
      placeholder: 'Recipient address',
    },
    {
      label: 'Time',
      name: 'time',
      type: 'datetime-range',
      placeholder: 'Select transaction time',
      className: 'col-span-2',
    },
  ]

  const filtered = (!!filter || filter === undefined) && Object.keys({ ...query }).length > 0

  return (
    <Modal
      hidden={hidden}
      disabled={!evm_chains_data || !cosmos_chains_data || !assets_data}
      onClick={() => setHidden(false)}
      buttonTitle={`Filter${filtered ? 'ed' : ''}`}
      buttonClassName={`${filtered ? 'border-2 border-blue-600 dark:border-white text-blue-600 dark:text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 font-semibold'} rounded-lg text-sm sm:text-base py-1 px-2.5`}
      title={<div className="flex items-center justify-between">
        <span>
          Filter Transfers
        </span>
        <div
          onClick={() => setHidden(true)}
          className="hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer rounded-full p-2"
        >
          <BiX size={18} />
        </div>
      </div>}
      body={<div className="form grid sm:grid-cols-2 gap-x-4 mt-2 -mb-3">
        {fields.map((f, i) => (
          <div key={i} className={`form-element ${f.className || ''}`}>
            {f.label && (
              <div className="form-label text-slate-600 dark:text-slate-400 font-medium">
                {f.label}
              </div>
            )}
            {f.type === 'select' ?
              <select
                placeholder={f.placeholder}
                value={filters?.[f.name]}
                onChange={e => setFilters({ ...filters, [`${f.name}`]: e.target.value })}
                className="form-select bg-slate-50 border-0 focus:ring-0 rounded-lg"
              >
                {f.options?.map((o, i) => (
                  <option
                    key={i}
                    title={o.title}
                    value={o.value}
                  >
                    {o.title}
                  </option>
                ))}
              </select>
              :
              f.type === 'datetime-range' ?
                <DatePicker.RangePicker
                  showTime
                  format="YYYY/MM/DD HH:mm:ss"
                  ranges={{
                    Today: [moment().startOf('day'), moment().endOf('day')],
                    'This Month': [moment().startOf('month'), moment().endOf('month')],
                  }}
                  value={filters?.[f.name]}
                  onChange={v => setFilters({ ...filters, [`${f.name}`]: v })}
                  className="form-input border-0 focus:ring-0 rounded-lg"
                  style={{ display: 'flex' }}
                />
                :
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={filters?.[f.name]}
                  onChange={e => setFilters({ ...filters, [`${f.name}`]: e.target.value })}
                  className="form-input border-0 focus:ring-0 rounded-lg"
                />
            }
          </div>
        ))}
      </div>}
      noCancelOnClickOutside={true}
      onCancel={() => {
        setFilters(null)
        setFilter(typeof filter === 'boolean' ? null : false)
      }}
      cancelButtonTitle="Reset"
      onConfirm={() => setFilter(moment().valueOf())}
      confirmButtonTitle="Search"
    />
  )
}