import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { DatePicker } from 'antd'
import _ from 'lodash'
import moment from 'moment'
import { BiX } from 'react-icons/bi'

import Modal from '../modal'
import { toArray, getQueryParams, createDayJSFromUnixtime } from '../../lib/utils'

export default () => {
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

  const fields = [
    {
      label: 'From Block',
      name: 'fromBlock',
      type: 'number',
      placeholder: 'From Block',
    },
    {
      label: 'To Block',
      name: 'toBlock',
      type: 'number',
      placeholder: 'To Block',
    },
  ]

  const filtered = (!!filterTrigger || filterTrigger === undefined) && Object.keys({ ...query }).length > 0

  return (
    <Modal
      hidden={hidden}
      disabled={!types}
      onClick={() => setHidden(false)}
      buttonTitle={`Filter${filtered ? 'ed' : ''}`}
      buttonClassName={`max-w-min ${filtered ? 'border-2 border-blue-400 dark:border-white text-blue-400 dark:text-white font-semibold py-0.5 px-2' : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 font-medium py-1 px-2.5'} rounded text-sm sm:text-base`}
      title={
        <div className="flex items-center justify-between">
          <span>
            Filter Blocks
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
              <div key={i} className={`form-element ${className || ''}`}>
                {label && (
                  <div className="form-label text-slate-600 dark:text-slate-200 font-medium">
                    {label}
                  </div>
                )}
                {type === 'select' ?
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
                        { label: 'Last 7 Days', value: [moment().subtract(7, 'days').startOf('day'), moment().endOf('day')] },
                        { label: 'This Month', value: [moment().startOf('month'), moment().endOf('month')] },
                        { label: 'Last Month', value: [moment().subtract(1, 'months').startOf('month'), moment().subtract(1, 'months').endOf('month')] },
                        { label: 'Last 30 Days', value: [moment().subtract(30, 'days').startOf('day'), moment().endOf('day')] },
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
  )
}