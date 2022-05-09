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
      label: 'Tx Hash',
      name: 'txHash',
      type: 'text',
      placeholder: 'Tx Hash',
      fullWidth: true,
    },
    {
      label: 'Source Chain',
      name: 'sourceChain',
      type: 'select',
      placeholder: 'Select source chain',
      options: _.concat(
        { value: '', title: 'Any' },
        chains_data?.map(c => {
          return { value: c.id, title: c.title }
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
          return { value: c.id, title: c.title }
        }) || [],
      ),
    },
    {
      label: 'Method',
      name: 'event',
      type: 'select',
      placeholder: 'Select event',
      options: [
        { value: '', title: 'Any' },
        { value: 'ContractCall', title: 'callContract' },
        { value: 'ContractCallWithToken', title: 'callContractWithToken' },
      ],
    },
    {
      label: 'Status',
      name: 'status',
      type: 'select',
      placeholder: 'Select status',
      options: [
        { value: '', title: 'Any' },
        { value: 'approving', title: 'Wait for Approve' },
        { value: 'approved', title: 'Approved' },
        { value: 'executed', title: 'Executed' },
        { value: 'error', title: 'Error Execution' },
      ],
    },
    {
      label: 'Source Address',
      name: 'sourceAddress',
      type: 'text',
      placeholder: 'Source Address',
      fullWidth: true,
    },
    {
      label: 'Contract Address',
      name: 'contractAddress',
      type: 'text',
      placeholder: 'Contract Address',
      fullWidth: true,
    },
    {
      label: 'Time',
      name: 'time',
      type: 'datetime-range',
      placeholder: 'Select time',
      fullWidth: true,
    },
    {
      label: 'Sender Address',
      name: 'senderAddress',
      type: 'text',
      placeholder: 'Sender Address',
      fullWidth: true,
    },
    {
      label: 'Relayer Address',
      name: 'relayerAddress',
      type: 'text',
      placeholder: 'Relayer Address',
      fullWidth: true,
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
      buttonClassName={`${applied ? 'bg-indigo-600 dark:bg-indigo-600 text-white font-semibold' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-700 hover:text-black dark:text-gray-300 dark:hover:text-white'} rounded-3xl shadow inline-flex items-center justify-center text-base space-x-1.5 py-1.5 px-3`}
      title="GMP Filter"
      body={<div className="form grid sm:grid-cols-2 gap-x-4 mt-2 -mb-3">
        {items.map((item, i) => (
          <div key={i} className={`${item.fullWidth ? 'sm:col-span-2' : ''} form-element`}>
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