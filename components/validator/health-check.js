import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa'
import { FiBox } from 'react-icons/fi'


import { number_format, name } from '../../lib/utils'

export default function HealthCheck({ data, health }) {
  return (
    <div
      title={<span className="text-lg font-medium">Health Check</span>}
      right={<span className="whitespace-nowrap text-gray-400 dark:text-gray-600">Latest {number_format(process.env.NEXT_PUBLIC_NUM_HEARTBEAT_BLOCKS, '0,0')} Blocks</span>}
      className="dark:border-gray-900"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 text-base sm:text-sm lg:text-base gap-4 mt-3 mb-0.5">
        <div className="flex flex-col space-y-1">
          <span className="font-semibold">Broadcaster Registration</span>
          {health ?
            typeof health.broadcaster_registration === 'boolean' ?
              <span className={`max-w-min ${health.broadcaster_registration ? 'bg-green-500 dark:bg-green-700' : 'bg-red-500 dark:bg-red-700'} rounded-xl flex items-center text-white text-xs font-semibold space-x-1.5 px-2.5 py-1`}>
                {health.broadcaster_registration ?
                  <FaCheckCircle size={16} />
                  :
                  <FaTimesCircle size={16} />
                }
                <span className="whitespace-nowrap capitalize">{name(health.broadcaster_registration ? 'proxy_registered' : 'no_proxy_registered')}</span>
              </span>
              :
              <span className="text-gray-500 dark:text-gray-400">-</span>
            :
            <div className="skeleton w-28 h-6" />
          }
        </div>
        <div className="flex flex-col space-y-1">
          <span className="font-semibold">Broadcaster Funded</span>
          {health ?
            typeof health.broadcaster_funded === 'object' ?
              <span className={`max-w-min ${health.broadcaster_funded.amount >= Number(process.env.NEXT_PUBLIC_MIN_BROADCAST_FUND) ? 'bg-green-500 dark:bg-green-700' : 'bg-red-500 dark:bg-red-700'} rounded-xl flex items-center text-white text-xs font-semibold space-x-1.5 px-2.5 py-1`}>
                {health.broadcaster_funded.amount >= Number(process.env.NEXT_PUBLIC_MIN_BROADCAST_FUND) ?
                  <FaCheckCircle size={16} />
                  :
                  <FaTimesCircle size={16} />
                }
                <span>{number_format(health.broadcaster_funded.amount, '0,0.0000000')}</span>
                <span className="uppercase">{health.broadcaster_funded.denom}</span>
              </span>
              :
              <span>{health.broadcaster_funded}</span>
            :
            <div className="skeleton w-28 h-6" />
          }
        </div>
        <div className="flex flex-col space-y-1">
          <span className="font-semibold">Heartbeats Uptime</span>
          {health ?
            <div className="flex items-center space-x-1">
              <span className="text-gray-500 dark:text-gray-400">
                {typeof health.heartbeats_uptime === 'number' ? `${number_format(health.heartbeats_uptime, '0,0.00')}%` : '-'}
              </span>
              {/*typeof health.missed_heartbeats === 'number' && (
                <span className="text-gray-500 dark:text-gray-400">
                  ({number_format(health.missed_heartbeats, '0,0')} Missed)
                </span>
              )*/}
            </div>
            :
            <div className="skeleton w-28 h-6" />
          }
        </div>
        <div className="flex flex-col space-y-1">
          <span className="font-semibold"># Missed Heartbeats</span>
          {health ?
            <div className="flex items-center space-x-1">
              <span className="text-gray-500 dark:text-gray-400">
                {number_format(health.missed_heartbeats, '0,0')}
              </span>
              <span>/</span>
              <span className="text-gray-500 dark:text-gray-400">
                {number_format(health.total_heartbeats, '0,0')}
              </span>
            </div>
            :
            <div className="skeleton w-28 h-6" />
          }
        </div>
      </div>
    </div>
  )
}