import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { DatePicker } from 'antd'
import { BiX } from 'react-icons/bi'

import Modal from '../modals'
import { batches as getBatches } from '../../lib/api/index'
import { params_to_obj } from '../../lib/utils'

export default () => {
  const {
    evm_chains,
  } = useSelector(state =>
    (
      {
        evm_chains: state.evm_chains,
      }
    ),
    shallowEqual,
  )
  const {
    evm_chains_data,
  } = { ...evm_chains }

  const router = useRouter()
  const {
    pathname,
    query,
    asPath,
  } = { ...router }

  const [filters, setFilters] = useState(null)
  const [filterTrigger, setFilterTrigger] = useState(undefined)
  const [types, setTypes] = useState(null)
  const [hidden, setHidden] = useState(true)

  useEffect(
    () => {
      const getData = async () => {
        const response =
          await getBatches(
            {
              aggs: {
                types: {
                  terms: {
                    field: 'commands.type.keyword',
                    size: 100,
                  },
                },
              },
              size: 0,
            },
          )

        const {
          data,
        } = { ...response }

        setTypes(
          _.orderBy(
            data ||
            [],
          )
        )
      }

      getData()
    },
    [],
  )

  useEffect(
    () => {
      if (asPath) {
        const params =
          params_to_obj(
            asPath.indexOf('?') > -1 &&
            asPath
              .substring(
                asPath.indexOf('?') + 1,
              )
          )

        const {
          batchId,
          commandId,
          chain,
          keyId,
          type,
          status,
          fromTime,
          toTime,
        } = { ...params }

        setFilters(
          {
            batchId,
            commandId,
            chain,
            keyId,
            type,
            status:
              [
                'executed',
                'unexecuted',
                'signed',
                'signing',
                'aborted',
              ].includes(status?.toLowerCase()) ?
                status.toLowerCase() :
                undefined,
            time:
              fromTime &&
              toTime &&
              [
                moment(
                  Number(fromTime)
                ),
                moment(
                  Number(toTime)
                ),
              ],
          }
        )
      }
    },
    [asPath],
  )

  useEffect(
    () => {
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
                value =
                  moment(v[0])
                    .valueOf()

                qs
                  .append(
                    key,
                    value,
                  )

                key = 'toTime'
                value =
                  moment(v[1])
                    .valueOf()
                break
              default:
                key = k
                value = v
                break
            }

            qs
              .append(
                key,
                value,
              )
          })

        const qs_string = qs.toString()

        router
          .push(
            `${pathname}${
              qs_string ?
                `?${qs_string}` :
                ''
            }`
          )

        setHidden(true)
      }
    },
    [filterTrigger],
  )

  const fields =
    [
      {
        label: 'Batch ID',
        name: 'batchId',
        type: 'text',
        placeholder: 'Batch ID',
        className: 'col-span-2',
      },
      {
        label: 'Command ID',
        name: 'commandId',
        type: 'text',
        placeholder: 'Command ID',
        className: 'col-span-2',
      },
      {
        label: 'Chain',
        name: 'chain',
        type: 'select',
        placeholder: 'Select chain',
        options:
          _.concat(
            {
              value: '',
              title: 'Any',
            },
            _.orderBy(
              evm_chains_data ||
              [],
              ['deprecated'],
              ['desc'],
            )
            .filter(c =>
              !c?.no_inflation ||
              c?.deprecated
            )
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
        label: 'Key ID',
        name: 'keyId',
        type: 'text',
        placeholder: 'Key ID',
      },
      {
        label: 'Command Type',
        name: 'type',
        type: 'select',
        placeholder: 'Select command type',
        options:
          _.concat(
            {
              value: '',
              title: 'Any',
            },
            (types || [])
              .map(t => {
                return {
                  value: t,
                  title: t,
                }
              }),
          ),
      },
      {
        label: 'Status',
        name: 'status',
        type: 'select',
        placeholder: 'Select batch status',
        options:
          [
            {
              value: '',
              title: 'Any',
            },
            {
              value: 'executed',
              title: 'Executed',
            },
            {
              value: 'unexecuted',
              title: 'Unexecuted',
            },
            {
              value: 'signed',
              title: 'Signed',
            },
            {
              value: 'signing',
              title: 'Signing',
            },
            {
              value: 'aborted',
              title: 'Aborted',
            },
          ],
      },
      {
        label: 'Time',
        name: 'time',
        type: 'datetime-range',
        placeholder: 'Select transaction time',
        className: 'col-span-2',
      },
    ]

  const filtered =
    (
      !!filterTrigger ||
      filterTrigger === undefined
    ) &&
    Object.keys({ ...query })
      .length > 0

  return (
    <Modal
      hidden={hidden}
      disabled={!types}
      onClick={() => setHidden(false)}
      buttonTitle={`Filter${filtered ? 'ed' : ''}`}
      buttonClassName={`max-w-min ${filtered ? 'border-2 border-blue-500 dark:border-blue-500 text-blue-500 dark:text-blue-500 font-semibold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 hover:bg-opacity-75 dark:hover:bg-opacity-75 font-normal'} rounded tracking-wider text-sm sm:text-base py-1 px-2.5`}
      title={
        <div className="flex items-center justify-between">
          <span>
            Filter Batches
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
                  {
                    label &&
                    (
                      <div className="form-label text-slate-600 dark:text-slate-200 font-normal">
                        {label}
                      </div>
                    )
                  }
                  {type === 'select' ?
                    <select
                      placeholder={placeholder}
                      value={filters?.[name]}
                      onChange={e =>
                        setFilters(
                          {
                            ...filters,
                            [`${name}`]: e.target.value,
                          }
                        )
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
                        ranges={
                          {
                            Today:
                              [
                                moment()
                                  .startOf('day'),
                                moment()
                                  .endOf('day'),
                              ],
                            'This Month':
                              [
                                moment()
                                  .startOf('month'),
                                moment()
                                  .endOf('month'),
                              ],
                          }
                        }
                        value={filters?.[name]}
                        onChange={v =>
                          setFilters(
                            {
                              ...filters,
                              [`${name}`]: v,
                            }
                          )
                        }
                        className="form-input border-0 focus:ring-0 rounded"
                        style={
                          {
                            display: 'flex',
                          }
                        }
                      /> :
                      <input
                        type={type}
                        placeholder={placeholder}
                        value={filters?.[name]}
                        onChange={e =>
                          setFilters(
                            {
                              ...filters,
                              [`${name}`]: e.target.value,
                            }
                          )
                        }
                        className="form-input border-0 focus:ring-0 rounded"
                      />
                  }
                </div>
              )
            })
          }
        </div>
      }
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
      onConfirm={() =>
        setFilterTrigger(
          moment()
            .valueOf()
        )
      }
      confirmButtonTitle="Search"
    />
  )
}