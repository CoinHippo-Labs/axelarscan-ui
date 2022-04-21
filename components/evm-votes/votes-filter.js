import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import { DatePicker } from 'antd'
import { VscFilterFilled, VscFilter } from 'react-icons/vsc'

import Modal from '../modals/modal-confirm'

export default function VotesFilter({ applied = false, disabled = false, initialFilter, updateFilter }) {
  const { chains } = useSelector(state => ({ chains: state.chains }), shallowEqual)
  const { chains_data } = { ...chains }

  const [filter, setFilter] = useState(initialFilter)

  const items = [
    {
      label: 'Transaction ID',
      name: 'transaction_id',
      type: 'text',
      placeholder: 'Transaction ID',
    },
    {
      label: 'Poll ID',
      name: 'poll_id',
      type: 'text',
      placeholder: 'Poll ID',
    },
    {
      label: 'Broadcaster Address',
      name: 'sender',
      type: 'text',
      placeholder: 'Broadcaster Address',
    },
    {
      label: 'Time',
      name: 'time',
      type: 'datetime-range',
      placeholder: 'Select poll time',
    },
    {
      label: 'Chain',
      name: 'sender_chain',
      type: 'select',
      placeholder: 'Select chain',
      options: _.concat(
        { value: '', title: 'Any' },
        chains_data?.map(c => {
          return { value: c.id, title: c.title }
        }) || [],
      ),
    },
    {
      label: 'Vote',
      name: 'confirmed',
      type: 'select',
      placeholder: 'Select chain',
      options: [
        { value: '', title: 'Any' },
        { value: 'yes', title: 'Yes' },
        { value: 'no', title: 'No' },
      ],
    },
  ]

  useEffect(() => {
    setFilter(initialFilter)
  }, [initialFilter])

  return (
    <Modal
      clickOutSideDisabled={true}
      disabled={disabled}
      buttonTitle={<>
        {applied ?
          <VscFilterFilled size={20} />
          :
          <VscFilter size={20} />
        }
        <span>Filter{applied && 'ed'}</span>
      </>}
      buttonClassName={`${applied ? 'bg-indigo-600 dark:bg-indigo-600 text-white font-semibold' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-700 hover:text-black dark:text-gray-300 dark:hover:text-white'} rounded-3xl shadow flex items-center justify-center text-base space-x-1.5 py-1.5 px-3`}
      title="Votes Filter"
      body={<div className="form mt-2 -mb-3">
        {items.map((item, i) => (
          <div key={i} className="form-element">
            {item.label && (
              <div className="form-label text-gray-600 dark:text-gray-400 font-medium">{item.label}</div>
            )}
            {item.type === 'select' ?
              <select
                placeholder={item.placeholder}
                value={filter?.[item.name]}
                onChange={e => {
                  let value = e.target.value
                  const _filter = { ...filter, [`${item.name}`]: value }
                  setFilter(_filter)
                }}
                className="form-select bg-gray-50 border-0 focus:ring-gray-200 dark:focus:ring-gray-700 rounded-lg"
              >
                {item.options?.map((option, i) => (
                  <option
                    key={i}
                    value={option.value}
                  >
                    {option.title}
                  </option>
                ))}
              </select>
              :
              item.type === 'datetime-range' ?
                <DatePicker.RangePicker
                  ranges={{
                    Today: [moment(), moment()],
                    'This Month': [moment().startOf('month'), moment().endOf('month')],
                  }}
                  showTime
                  format="YYYY/MM/DD HH:mm:ss"
                  value={filter?.[item.name]}
                  onChange={value => {
                    const _filter = { ...filter, [`${item.name}`]: value }
                    setFilter(_filter)
                  }}
                  className="form-input dark:border-0 focus:ring-gray-200 dark:focus:ring-gray-700 rounded-lg"
                  style={{ display: 'flex' }}
                />
                :
                <input
                  type={item.type}
                  placeholder={item.placeholder}
                  value={filter?.[item.name]}
                  onChange={e => setFilter({ ...filter, [`${item.name}`]: e.target.value })}
                  className="form-input dark:border-0 focus:ring-gray-200 dark:focus:ring-gray-700 rounded-lg"
                />
            }
          </div>
        ))}
      </div>}
      onCancel={() => setFilter(initialFilter)}
      confirmButtonTitle="Search"
      onConfirm={() => {
        if (updateFilter) {
          updateFilter(filter)
        }
      }}
    />
  )
}