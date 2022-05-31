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
  const { evm_chains } = useSelector(state => ({ evm_chains: state.evm_chains }), shallowEqual)
  const { evm_chains_data } = { ...evm_chains }

  const router = useRouter()
  const { pathname, query, asPath } = { ...router }

  const [filters, setFilters] = useState(null)
  const [filter, setFilter] = useState(undefined)
  const [types, setTypes] = useState(null)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    const getData = async () => {
      const response = await getBatches({
        size: 0,
        aggs: {
          types: {
            terms: { field: 'commands.type.keyword', size: 100 },
          },
        },
      })
      setTypes(_.orderBy(response?.data || []))
    }
    getData()
  }, [])

  useEffect(() => {
    if (asPath) {
      const params = params_to_obj(asPath?.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))
      const { chain, batchId, keyId, type, status, fromTime, toTime } = { ...params }
      setFilters({
        chain,
        batchId,
        keyId,
        type,
        status: ['signed', 'signing'].includes(status?.toLowerCase()) ? status.toLowerCase() : undefined,
        time: fromTime && toTime && [moment(Number(fromTime)), moment(Number(toTime))],
      })
    }
  }, [asPath])

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

  const fields = [
    {
      label: 'Chain',
      name: 'chain',
      type: 'select',
      placeholder: 'Select chain',
      options: _.concat(
        { value: '', title: 'Any' },
        evm_chains_data?.map(c => {
          return {
            value: c.id,
            title: c.name,
          }
        }) || [],
      ),
    },
    {
      label: 'Batch ID',
      name: 'batchId',
      type: 'text',
      placeholder: 'Batch ID',
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
      options: _.concat(
        { value: '', title: 'Any' },
        types?.map(t => {
          return {
            value: t,
            title: t,
          }
        }) || [],
      ),
    },
    {
      label: 'Status',
      name: 'status',
      type: 'select',
      placeholder: 'Select batch status',
      options: [
        { value: '', title: 'Any' },
        { value: 'signed', title: 'Signed' },
        { value: 'signing', title: 'Signing' },
      ],
    },
    {
      label: 'Time',
      name: 'time',
      type: 'datetime-range',
      placeholder: 'Select transaction time',
    },
  ]

  const filtered = !!filter && Object.keys({ ...query }).length > 0

  return (
    <Modal
      hidden={hidden}
      disabled={!types}
      onClick={() => setHidden(false)}
      buttonTitle={`Filter${filtered ? 'ed' : ''}`}
      buttonClassName={`${filtered ? 'border-2 border-blue-600 dark:border-white text-blue-600 dark:text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 font-semibold'} rounded-lg text-sm sm:text-base py-1 px-2.5`}
      title={<div className="flex items-center justify-between">
        <span>
          Filter Batches
        </span>
        <div
          onClick={() => setHidden(true)}
          className="hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer rounded-full p-2"
        >
          <BiX size={18} />
        </div>
      </div>}
      body={<div className="form mt-2 -mb-3">
        {fields.map((f, i) => (
          <div key={i} className="form-element">
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