import { useSelector, shallowEqual } from 'react-redux'

import moment from 'moment'

import Widget from '../widget'

import { getName, numberFormat } from '../../lib/utils'

export default function CosmosGeneric({ data, jailed }) {
  const { status } = useSelector(state => ({ status: state.status }), shallowEqual)
  const { status_data } = { ...status }

  let numMissedBlocks = typeof data?.uptime === 'number' && status_data?.latest_block_height && (
    (Number(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS) * (1 - data.uptime / 100))
    -
    (Number(status_data.latest_block_height) - (data.start_height || 0) > Number(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS) ?
      0
      :
      Number(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS) - (Number(status_data.latest_block_height) - (data.start_height || 0))
    )
  )
  numMissedBlocks = numMissedBlocks < 0 ? 0 : numMissedBlocks

  return (
    <Widget
      title={<span className="text-lg font-medium">Cosmos Generic</span>}
      right={<span className="whitespace-nowrap text-gray-400 dark:text-gray-600">Latest {numberFormat(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS, '0,0')} Blocks</span>}
      className="dark:border-gray-900"
    >
      <div className="grid grid-flow-row grid-cols-1 sm:grid-cols-2 text-base sm:text-sm lg:text-base gap-4 mt-3 mb-0.5">
        <div className="flex flex-col space-y-1">
          <span className="font-semibold">Uptime</span>
          {typeof data?.uptime === 'number' ?
            <span className="text-gray-500 dark:text-gray-400">
              {numberFormat(data.uptime, '0,0.00')}%
            </span>
            :
            <div className="skeleton w-28 h-6" />
          }
        </div>
        <div className="flex flex-col space-y-1">
          <span className="font-semibold"># Missed Blocks</span>
          {typeof numMissedBlocks === 'number' ?
            <span className="text-gray-500 dark:text-gray-400">
              {numberFormat(numMissedBlocks, '0,0')}
            </span>
            :
            <div className="skeleton w-28 h-6" />
          }
        </div>
        <div className="flex flex-col space-y-1">
          <span className="font-semibold"># Times Jailed</span>
          {jailed ?
            <span className="text-gray-500 dark:text-gray-400">
              {typeof jailed.times_jailed === 'number' ?
                jailed.times_jailed > 0 ?
                  numberFormat(jailed.times_jailed, '0,0')
                  :
                  jailed.times_jailed < 0 ?
                    'Long Time Jailed'
                    :
                    'Never Jailed'
                :
                '-'
              }
            </span>
            :
            <div className="skeleton w-28 h-6" />
          }
        </div>
        <div className="flex flex-col space-y-1">
          <span className="font-semibold">Avg. Jail Response Time</span>
          {jailed ?
            <span className="capitalize text-gray-500 dark:text-gray-400">
              {typeof jailed.avg_jail_response_time === 'number' ?
                jailed.times_jailed > 0 ?
                  jailed.avg_jail_response_time < 0 ?
                    'Never Unjailed'
                    :
                    moment(jailed.avg_jail_response_time).diff(moment(0), 'seconds') < 60 ?
                      `${moment(jailed.avg_jail_response_time).diff(moment(0), 'seconds')} sec`
                      :
                      moment(jailed.avg_jail_response_time).diff(moment(0), 'minutes') < 60 ?
                        `${moment(jailed.avg_jail_response_time).diff(moment(0), 'minutes')} min`
                        :
                        `${moment(jailed.avg_jail_response_time).diff(moment(0), 'hours')} hrs`
                  :
                  jailed.times_jailed < 0 ?
                    'Never Unjailed'
                    :
                    'Never Jailed'
                :
                '-'
              }
            </span>
            :
            <div className="skeleton w-28 h-6" />
          }
        </div>
      </div>
    </Widget>
  )
}