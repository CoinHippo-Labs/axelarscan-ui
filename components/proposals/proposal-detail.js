import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'

import moment from 'moment'
import Widget from '../widget'

import { numberFormat, getName, convertToJson } from '../../lib/utils'

export default function ProposalDetail({ data }) {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const ReactJson = typeof window !== 'undefined' && dynamic(import('react-json-view'))

  return (
    <Widget className="dark:border-gray-900 p-4 md:p-8">
      <div className="w-full flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
          <span className="w-40 lg:w-64 text-xs lg:text-base font-semibold">Title:</span>
          {data ?
            <div className="flex flex-wrap items-center text-xs lg:text-base font-semibold space-x-1">
              <span>{data.content?.title}</span>
            </div>
            :
            <div className="skeleton w-60 h-6 mt-1" />
          }
        </div>
        <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
          <span className="w-40 lg:w-64 text-xs lg:text-base font-semibold">Description:</span>
          {data ?
            <div className="flex flex-wrap items-center text-xs lg:text-base space-x-1">
              <span className="break-all">{data.content?.description}</span>
            </div>
            :
            <div className="skeleton w-96 h-6 mt-1" />
          }
        </div>
        <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
          <span className="w-40 lg:w-64 text-xs lg:text-base font-semibold">Status:</span>
          {data ?
            data.status && (
              <span className={`bg-${['UNSPECIFIED', 'DEPOSIT_PERIOD'].includes(data.status) ? 'gray-400 dark:bg-gray-900' : ['VOTING_PERIOD', 'DEPOSIT_PERIOD'].includes(data.status) ? 'yellow-400 dark:bg-yellow-500' : ['REJECTED', 'FAILED'].includes(data.status) ? 'red-600 dark:bg-red-700' : 'green-600 dark:bg-green-700'} rounded capitalize text-white text-xs lg:text-base font-semibold px-2 py-0.5`}>
                {data.status?.replace('_', ' ')}
              </span>
            )
            :
            <div className="skeleton w-24 h-6 mt-1" />
          }
        </div>
        {(!data || data.type) && (
          <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
            <span className="w-40 lg:w-64 text-xs lg:text-base font-semibold">Type:</span>
            {data ?
              <div className="text-xs lg:text-base">
                {data.type ?
                  <span className="bg-gray-100 dark:bg-gray-800 rounded capitalize text-gray-900 dark:text-gray-100 font-semibold px-2 py-1">
                    {getName(data.type)}
                  </span>
                  :
                  '-'
                }
              </div>
              :
              <div className="skeleton w-24 h-6 mt-1" />
            }
          </div>
        )}
        {data?.content?.plan && (
          <>
            <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
              <span className="w-40 lg:w-64 text-xs lg:text-base font-semibold">Plan:</span>
              <div className="flex flex-wrap items-center text-xs lg:text-base font-medium space-x-1">
                <span>{data.content.plan.name}</span>
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
              <span className="w-40 lg:w-64 text-xs lg:text-base font-semibold">Block:</span>
              <div className="text-xs lg:text-base font-medium">
                {numberFormat(data.content.plan.height, '0,0')}
              </div>
            </div>
            {data.content.plan.info && (
              <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
                <span className="w-40 lg:w-64 text-xs lg:text-base font-semibold">{getName(data.type)}:</span>
                <div className="text-xs lg:text-base">
                  {typeof convertToJson(data.content.plan.info) === 'object' ?
                    <div className="max-h-96 overflow-y-auto">
                      <ReactJson src={convertToJson(data.content.plan.info)} theme={theme === 'dark' ? 'harmonic' : 'rjv-default'} />
                    </div>
                    :
                    <span className="bg-gray-100 dark:bg-gray-800 rounded capitalize text-gray-900 dark:text-gray-100 font-semibold px-2 py-1">
                      {data.content.plan.info}
                    </span>
                  }
                </div>
              </div>
            )}
          </>
        )}
        {data?.content?.changes?.map((c, i) => (
          <div key={i} className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
            <span className="w-40 lg:w-64 text-xs lg:text-base font-semibold">{c.key}:</span>
            <div className="text-xs lg:text-base">
              {c.subspace ?
                typeof convertToJson(c.value) === 'object' ?
                  <div className="space-y-2">
                    <span className="bg-gray-100 dark:bg-gray-800 rounded capitalize text-gray-900 dark:text-gray-100 font-semibold px-2 py-1">
                      {getName(c.subspace)}
                    </span>
                    <div className="max-h-96 overflow-y-auto">
                      <ReactJson src={convertToJson(c.value)} theme={theme === 'dark' ? 'harmonic' : 'rjv-default'} />
                    </div>
                  </div>
                  :
                  <span className="bg-gray-100 dark:bg-gray-800 rounded capitalize text-gray-900 dark:text-gray-100 font-semibold px-2 py-1">
                    {getName(c.subspace)} = {c.value}
                  </span>
                :
                '-'
              }
            </div>
          </div>
        ))}
        <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
          <span className="w-40 lg:w-64 text-xs lg:text-base font-semibold">Submit Time:</span>
          {data ?
            data.submit_time && (
              <div className="flex flex-wrap text-xs lg:text-base space-x-1">
                <span className="text-gray-500 dark:text-gray-400">{moment(data.submit_time).fromNow()}</span>
                <span>({moment(data.submit_time).format('MMM D, YYYY h:mm:ss A')})</span>
              </div>
            )
            :
            <div className="skeleton w-60 h-6 mt-1" />
          }
        </div>
        <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
          <span className="w-40 lg:w-64 text-xs lg:text-base font-semibold">Deposit End Time:</span>
          {data ?
            data.deposit_end_time && (
              <div className="flex flex-wrap text-xs lg:text-base space-x-1">
                <span className="text-gray-500 dark:text-gray-400">{moment(data.deposit_end_time).fromNow()}</span>
                <span>({moment(data.deposit_end_time).format('MMM D, YYYY h:mm:ss A')})</span>
              </div>
            )
            :
            <div className="skeleton w-60 h-6 mt-1" />
          }
        </div>
        <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
          <span className="w-40 lg:w-64 text-xs lg:text-base font-semibold">Voting Start Time:</span>
          {data ?
            data.voting_start_time && (
              <div className="flex flex-wrap text-xs lg:text-base space-x-1">
                <span className="text-gray-500 dark:text-gray-400">{moment(data.voting_start_time).fromNow()}</span>
                <span>({moment(data.voting_start_time).format('MMM D, YYYY h:mm:ss A')})</span>
              </div>
            )
            :
            <div className="skeleton w-60 h-6 mt-1" />
          }
        </div>
        <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
          <span className="w-40 lg:w-64 text-xs lg:text-base font-semibold">Voting End Time:</span>
          {data ?
            data.voting_end_time && (
              <div className="flex flex-wrap text-xs lg:text-base space-x-1">
                <span className="text-gray-500 dark:text-gray-400">{moment(data.voting_end_time).fromNow()}</span>
                <span>({moment(data.voting_end_time).format('MMM D, YYYY h:mm:ss A')})</span>
              </div>
            )
            :
            <div className="skeleton w-60 h-6 mt-1" />
          }
        </div>
        <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
          <span className="w-40 lg:w-64 text-xs lg:text-base font-semibold">Total Deposit:</span>
          {data ?
            <div className="flex flex-wrap items-center text-xs lg:text-base space-x-1">
              {data.total_deposit?.length > 0 ?
                <div className="flex items-center space-x-1.5">
                  {data.total_deposit.map((_deposit, i) => (
                    <span key={i} className="max-w-min bg-gray-100 dark:bg-gray-800 rounded uppercase whitespace-nowrap text-gray-900 dark:text-gray-200 font-semibold px-2 py-1">
                      {numberFormat(_deposit.amount, '0,0.00')} {_deposit.symbol || _deposit.denom}
                    </span>
                  ))}
                </div>
                :
                '-'
              }
            </div>
            :
            <div className="skeleton w-32 h-6 mt-1" />
          }
        </div>
      </div>
    </Widget>
  )
}