import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { DatePicker } from 'antd'
import { BiX } from 'react-icons/bi'

import Modal from '../modals'
import { getChain } from '../../lib/object/chain'
import { params_to_obj } from '../../lib/utils'

export default () => {
  const {
    evm_chains,
    cosmos_chains,
  } = useSelector(state =>
    (
      {
        evm_chains: state.evm_chains,
        cosmos_chains: state.cosmos_chains,
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

  const router = useRouter()
  const {
    pathname,
    query,
    asPath,
  } = { ...router }

  const [filters, setFilters] = useState(null)
  const [filterTrigger, setFilterTrigger] = useState(undefined)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    if (
      evm_chains_data &&
      cosmos_chains_data &&
      asPath
    ) {
      const params = params_to_obj(
        asPath.indexOf('?') > -1 &&
        asPath.substring(asPath.indexOf('?') + 1)
      )

      const chains_data = _.concat(
        evm_chains_data,
        cosmos_chains_data,
      )

      const {
        txHash,
        sourceChain,
        destinationChain,
        method,
        status,
        senderAddress,
        sourceAddress,
        contractAddress,
        relayerAddress,
        fromTime,
        toTime,
      } = { ...params }

      setFilters({
        txHash,
        sourceChain: getChain(
          sourceChain,
          chains_data,
        )?._id ||
          sourceChain,
        destinationChain: getChain(
          destinationChain,
          chains_data,
        )?._id ||
          destinationChain,
        method: [
          'callContract',
          'callContractWithToken',
        ].includes(method) ?
          method :
          undefined,
        status: [
          'approving',
          'called',
          'forecalled',
          'approved',
          'executed',
          'error',
          'insufficient_fee',
        ].includes(status?.toLowerCase()) ?
          status.toLowerCase() :
          undefined,
        senderAddress,
        sourceAddress,
        contractAddress,
        relayerAddress,
        time: fromTime &&
          toTime &&
          [
            moment(Number(fromTime)),
            moment(Number(toTime)),
          ],
      })
    }
  }, [evm_chains_data, cosmos_chains_data, asPath])

  useEffect(() => {
    if (filterTrigger !== undefined) {
      const qs = new URLSearchParams()

      Object.entries({ ...filters })
        .filter(([k, v]) => v)
        .forEach(([k, v]) => {
          let key,
            value

          switch (k) {
            case 'time':
              key = 'fromTime'
              value = moment(v[0]).valueOf()

              qs.append(
                key,
                value,
              )

              key = 'toTime'
              value = moment(v[1]).valueOf()
              break
            default:
              key = k
              value = v
              break
          }

          qs.append(
            key,
            value,
          )
        })

      const qs_string = qs.toString()

      router.push(`${pathname}${qs_string ? `?${qs_string}` : ''}`)

      setHidden(true)
    }
  }, [filterTrigger])

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
        {
          value: '',
          title: 'Any',
        },
        (evm_chains_data || [])
          .map(c => {
            const {
              id,
              name,
            } = { ...c }

            return {
              value: id,
              title: name,
            }
          }),
      ),
    },
    {
      label: 'Destination Chain',
      name: 'destinationChain',
      type: 'select',
      placeholder: 'Select destination chain',
      options: _.concat(
        {
          value: '',
          title: 'Any',
        },
        (evm_chains_data || [])
          .map(c => {
            const {
              id,
              name,
            } = { ...c }

            return {
              value: id,
              title: name,
            }
          }),
      ),
    },
    {
      label: 'Method',
      name: 'method',
      type: 'select',
      placeholder: 'Select method',
      options: [
        {
          value: '',
          title: 'Any' },
        {
          value: 'callContract',
          title: 'callContract',
        },
        {
          value: 'callContractWithToken',
          title: 'callContractWithToken',
        },
      ],
    },
    {
      label: 'Status',
      name: 'status',
      type: 'select',
      placeholder: 'Select status',
      options: [
        {
          value: '',
          title: 'Any',
        },
        {
          value: 'approving',
          title: 'Wait for Approval',
        },
        {
          value: 'called',
          title: 'Called',
        },
        {
          value: 'forecalled',
          title: 'Forecalled',
        },
        {
          value: 'approved',
          title: 'Approved',
        },
        {
          value: 'executed',
          title: 'Executed',
        },
        {
          value: 'error',
          title: 'Error Execution',
        },
        {
          value: 'insufficient_fee',
          title: 'Insufficient Fee',
        },
      ],
    },
    {
      label: 'Sender',
      name: 'senderAddress',
      type: 'text',
      placeholder: 'Sender address',
    },
    {
      label: 'Source',
      name: 'sourceAddress',
      type: 'text',
      placeholder: 'Source address',
    },
    {
      label: 'Contract',
      name: 'contractAddress',
      type: 'text',
      placeholder: 'Contract address',
    },
    {
      label: 'Relayer',
      name: 'relayerAddress',
      type: 'text',
      placeholder: 'Relayer address',
    },
    {
      label: 'Time',
      name: 'time',
      type: 'datetime-range',
      placeholder: 'Select transaction time',
      className: 'col-span-2',
    },
  ]

  const filtered = (
    !!filterTrigger ||
    filterTrigger === undefined
  ) && Object.keys({ ...query }).length > 0

  return (
    <Modal
      hidden={hidden}
      disabled={!evm_chains_data}
      onClick={() => setHidden(false)}
      buttonTitle={`Filter${filtered ? 'ed' : ''}`}
      buttonClassName={`${filtered ? 'border-2 border-blue-400 dark:border-blue-600 text-blue-400 dark:text-blue-600 font-semibold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 hover:bg-opacity-75 dark:hover:bg-opacity-75 font-normal'} rounded tracking-wider text-sm sm:text-base py-1 px-2.5`}
      title={<div className="flex items-center justify-between">
        <span>
          Filter GMPs
        </span>
        <div
          onClick={() => setHidden(true)}
          className="hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer rounded-full p-2"
        >
          <BiX
            size={18}
          />
        </div>
      </div>}
      body={<div className="form grid sm:grid-cols-2 gap-x-4 mt-2 -mb-3">
        {fields
          .map((f, i) => {
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
                {label && (
                  <div className="form-label text-slate-600 dark:text-slate-200 font-normal">
                    {label}
                  </div>
                )}
                {type === 'select' ?
                  <select
                    placeholder={placeholder}
                    value={filters?.[name]}
                    onChange={e =>
                      setFilters({
                        ...filters,
                        [`${name}`]: e.target.value,
                      })
                    }
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
                      showTime
                      format="YYYY/MM/DD HH:mm:ss"
                      ranges={{
                        Today: [
                          moment().startOf('day'),
                          moment().endOf('day'),
                        ],
                        'This Month': [
                          moment().startOf('month'),
                          moment().endOf('month'),
                        ],
                      }}
                      value={filters?.[name]}
                      onChange={v =>
                        setFilters({
                          ...filters,
                          [`${name}`]: v,
                        })
                      }
                      className="form-input border-0 focus:ring-0 rounded"
                      style={{ display: 'flex' }}
                    /> :
                    <input
                      type={type}
                      placeholder={placeholder}
                      value={filters?.[name]}
                      onChange={e =>
                        setFilters({
                          ...filters,
                          [`${name}`]: e.target.value,
                        })
                      }
                      className="form-input border-0 focus:ring-0 rounded"
                    />
                }
              </div>
            )
          })
        }
      </div>}
      noCancelOnClickOutside={true}
      onCancel={() => {
        setFilters(null)
        setFilterTrigger(
          typeof filter === 'boolean' ?
            null :
            false
        )
      }}
      cancelButtonTitle="Reset"
      onConfirm={() => setFilterTrigger(moment().valueOf())}
      confirmButtonTitle="Search"
    />
  )
}