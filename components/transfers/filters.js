import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { DatePicker } from 'antd'
import { BiX } from 'react-icons/bi'

import Modal from '../modals'
import { getChain } from '../../lib/object/chain'
import { getAsset } from '../../lib/object/asset'
import { params_to_obj } from '../../lib/utils'

export default () => {
  const {
    evm_chains,
    cosmos_chains,
    assets,
  } = useSelector(
    state => (
      {
        evm_chains: state.evm_chains,
        cosmos_chains: state.cosmos_chains,
        assets: state.assets,
      }
    ),
    shallowEqual,
  )
  const {
    evm_chains_data,
  } = { ...evm_chains }
  const {
    cosmos_chains_data,
  } = { ...cosmos_chains }
  const {
    assets_data,
  } = { ...assets }

  const router = useRouter()
  const {
    pathname,
    query,
    asPath,
  } = { ...router }

  const [filters, setFilters] = useState(null)
  const [filterTrigger, setFilterTrigger] = useState(undefined)
  const [hidden, setHidden] = useState(true)

  useEffect(
    () => {
      if (evm_chains_data && cosmos_chains_data && assets_data && asPath) {
        const params = params_to_obj(asPath.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))

        const {
          txHash,
          type,
          confirmed,
          state,
          sourceChain,
          destinationChain,
          asset,
          depositAddress,
          senderAddress,
          recipientAddress,
          fromTime,
          toTime,
          sortBy,
        } = { ...params }

        setFilters(
          ['/transfers'].includes(pathname) ?
            {
              type: ['deposit_address', 'send_token', 'wrap', 'unwrap', 'erc20_transfer'].includes(type?.toLowerCase()) ? type.toLowerCase() : undefined,
              sourceChain: getChain(sourceChain, chains_data)?.id || sourceChain,
              destinationChain: getChain(destinationChain, chains_data)?.id || destinationChain,
              asset: getAsset(asset, assets_data)?.id || asset,
              time: fromTime && toTime && [moment(Number(fromTime)).startOf('day'), moment(Number(toTime)).endOf('day')],
            } :
            {
              txHash,
              type: ['deposit_address', 'send_token', 'wrap', 'unwrap', 'erc20_transfer'].includes(type?.toLowerCase()) ? type.toLowerCase() : undefined,
              confirmed: ['confirmed', 'unconfirmed'].includes(confirmed?.toLowerCase()) ? confirmed.toLowerCase() : undefined,
              state: ['completed', 'pending'].includes(state?.toLowerCase()) ? state.toLowerCase() : undefined,
              sourceChain: getChain(sourceChain, chains_data)?.id || sourceChain,
              destinationChain: getChain(destinationChain, chains_data)?.id || destinationChain,
              asset: getAsset(asset, assets_data)?.id || asset,
              depositAddress,
              senderAddress,
              recipientAddress,
              time: fromTime && toTime && [moment(Number(fromTime)), moment(Number(toTime))],
              sortBy,
            }
        )
      }
    },
    [evm_chains_data, cosmos_chains_data, assets_data, asPath],
  )

  useEffect(
    () => {
      if (filterTrigger !== undefined) {
        const qs = new URLSearchParams()

        Object.entries({ ...filters })
          .filter(([k, v]) => v)
          .forEach(([k, v]) => {
            let key
            let value

            switch (k) {
              case 'time':
                key = 'fromTime'
                value = moment(_.head(v)).valueOf()

                qs.append(key, value)

                key = 'toTime'
                value = moment(_.last(v)).valueOf()
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
    },
    [filterTrigger],
  )

  const chains_data = _.concat(evm_chains_data, cosmos_chains_data)

  const fields = [
    {
      label: 'Tx Hash',
      name: 'txHash',
      type: 'text',
      placeholder: 'Transaction Hash',
      className: 'col-span-2',
    },
    {
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
    {
      label: 'Asset',
      name: 'asset',
      type: 'select',
      placeholder: 'Select asset',
      options:
        _.concat(
          { value: '', title: 'Any' },
          (assets_data || [])
            .map(a => {
              const {
                id,
                symbol,
              } = { ...a }

              return {
                value: id,
                title: symbol,
              }
            }),
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
      label: 'State',
      name: 'state',
      type: 'select',
      placeholder: 'Select state',
      options: [
        { value: '', title: 'Any' },
        { value: 'completed', title: 'Completed' },
        { value: 'pending', title: 'Pending' },
      ],
    },
    {
      label: 'Source Chain',
      name: 'sourceChain',
      type: 'select',
      placeholder: 'Select source chain',
      options:
        _.concat(
          { value: '', title: 'Any' },
          _.orderBy(chains_data, ['deprecated'], ['desc'])
            .filter(c => !c?.no_inflation || c?.deprecated)
            .flatMap(c => {
              const {
                id,
                name,
                overrides,
              } = { ...c }

              return (
                _.uniqBy(_.concat(Object.values({ ...overrides }).filter(v => Object.keys(v).length > 0), c), 'id')
                  .map(c => {
                    const {
                      id,
                      name,
                    } = { ...c }

                    return {
                      value: id,
                      title: name,
                    }
                  })
              )
            }),
        ),
    },
    {
      label: 'Destination Chain',
      name: 'destinationChain',
      type: 'select',
      placeholder: 'Select destination chain',
      options:
        _.concat(
          { value: '', title: 'Any' },
          _.orderBy(chains_data, ['deprecated'], ['desc'])
            .filter(c => !c?.no_inflation || c?.deprecated)
            .flatMap(c => {
                const {
                  id,
                  name,
                  overrides,
                } = { ...c }

                return (
                  _.uniqBy(_.concat(Object.values({ ...overrides }).filter(v => Object.keys(v).length > 0), c), 'id')
                    .map(c => {
                      const {
                        id,
                        name,
                      } = { ...c }

                      return {
                        value: id,
                        title: name,
                      }
                    })
                )
              }),
        ),
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
    {
      label: 'Sort By',
      name: 'sortBy',
      type: 'select',
      placeholder: 'Select sort by',
      options: [
        { value: 'time', title: 'Transfer Time' },
        { value: 'value', title: 'Transfer Value' },
      ],
    },
  ]
  .filter(f =>
    !['/transfers'].includes(pathname) ||
    ![
      'txHash',
      'type',
      'confirmed',
      'state',
      'depositAddress',
      'senderAddress',
      'recipientAddress',
      'sortBy',
    ]
    .includes(f?.name)
  )

  const filtered = (!!filterTrigger || filterTrigger === undefined) && Object.keys({ ...query }).length > 0

  return (
    <Modal
      hidden={hidden}
      disabled={!evm_chains_data || !cosmos_chains_data || !assets_data}
      onClick={() => setHidden(false)}
      buttonTitle={`Filter${filtered ? 'ed' : ''}`}
      buttonClassName={`max-w-min ${filtered ? 'border-2 border-blue-500 dark:border-blue-500 text-blue-500 dark:text-blue-500 font-semibold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 hover:bg-opacity-75 dark:hover:bg-opacity-75 font-normal'} rounded tracking-wider text-sm sm:text-base py-1 px-2.5`}
      title={
        <div className="flex items-center justify-between">
          <span>
            Filter Token Transfers
          </span>
          <div
            onClick={() => setHidden(true)}
            className="hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer rounded-full p-2"
          >
            <BiX
              size={18}
            />
          </div>
        </div>
      }
      body={
        <div className="form grid sm:grid-cols-2 gap-x-4 mt-2 -mb-3">
          {fields.map((f, i) => {
            const {
              label,
              name,
              type,
              placeholder,
              options,
              className,
            } = { ...f }

            return (
              <div
                key={i}
                className={`form-element ${className || ''}`}
              >
                {
                  label &&
                  (
                    <div className="form-label text-slate-600 dark:text-slate-200">
                      {label}
                    </div>
                  )
                }
                {type === 'select' ?
                  <select
                    placeholder={placeholder}
                    value={filters?.[name]}
                    onChange={e => setFilters({ ...filters, [name]: e.target.value })}
                    className="form-select bg-slate-50 border-0 focus:ring-0 rounded"
                  >
                    {(options || [])
                      .map((o, i) => {
                        const {
                          title,
                          value,
                        } = { ...o }

                        return (
                          <option
                            key={i}
                            title={title}
                            value={value}
                          >
                            {title}
                          </option>
                        )
                      })
                    }
                  </select> :
                  type === 'datetime-range' ?
                    <DatePicker.RangePicker
                      showTime={!['/transfers'].includes(pathname)}
                      format={`YYYY/MM/DD${!['/transfers'].includes(pathname) ? ' HH:mm:ss' : ''}`}
                      ranges={
                        {
                          Today: [moment().startOf('day'), moment().endOf('day')],
                          'This Month': [moment().startOf('month'), moment().endOf('month')],
                        }
                      }
                      value={filters?.[name]}
                      onChange={v => setFilters({ ...filters, [name]: v })}
                      className="form-input border-0 focus:ring-0 rounded"
                      style={{ display: 'flex' }}
                    /> :
                    <input
                      type={type}
                      placeholder={placeholder}
                      value={filters?.[name]}
                      onChange={e => setFilters({ ...filters, [name]: e.target.value })}
                      className="form-input border-0 focus:ring-0 rounded"
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
          setFilterTrigger(typeof filter === 'boolean' ? null : false)
        }
      }
      cancelButtonTitle="Reset"
      onConfirm={() => setFilterTrigger(moment().valueOf())}
      confirmButtonTitle="Search"
    />
  )
}