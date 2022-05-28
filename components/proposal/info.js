import dynamic from 'next/dynamic'
import { useSelector, shallowEqual } from 'react-redux'
import moment from 'moment'

import { number_format, name, to_json } from '../../lib/utils'

export default ({ data }) => {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const ReactJson = typeof window !== 'undefined' && dynamic(import('react-json-view'))
  const rowClassName = 'flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2'
  const titleClassName = 'w-40 lg:w-64 text-xs lg:text-base font-bold'

  return (
    <div className="w-full flex flex-col space-y-4">
      <div className={rowClassName}>
        <span className={titleClassName}>
          Title:
        </span>
        {data ?
          <span className="text-xs lg:text-base font-semibold">
            {data.content?.title}
          </span>
          :
          <div className="skeleton w-40 h-6 mt-1" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Description:
        </span>
        {data ?
          <span className="break-all text-slate-400 dark:text-slate-600 text-xs lg:text-base">
            {data.content?.description}
          </span>
          :
          <div className="skeleton w-40 h-6 mt-1" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Status:
        </span>
        {data ?
          data.status && (
            <span className={`${['UNSPECIFIED', 'DEPOSIT_PERIOD'].includes(data.status) ? 'bg-slate-100 dark:bg-slate-900' : ['VOTING_PERIOD', 'DEPOSIT_PERIOD'].includes(data.status) ? 'bg-yellow-400 dark:bg-yellow-500 text-white' : ['REJECTED', 'FAILED'].includes(data.status) ? 'bg-red-400 dark:bg-red-500 text-white' : 'bg-green-400 dark:bg-green-500 text-white'} rounded-lg uppercase text-xs lg:text-base font-semibold py-0.5 px-2`}>
              {data.status?.replace('_', ' ')}
            </span>
          )
          :
          <div className="skeleton w-40 h-6 mt-1" />
        }
      </div>
      {(!data || data.type) && (
        <div className={rowClassName}>
          <span className={titleClassName}>
            Type:
          </span>
          {data ?
            <span className="bg-slate-100 dark:bg-slate-900 rounded-lg capitalize text-xs lg:text-base font-semibold py-0.5 px-2">
              {name(data.type)}
            </span>
            :
            <div className="skeleton w-40 h-6 mt-1" />
          }
        </div>
      )}
      {data?.content?.plan && (
        <>
          <div className={rowClassName}>
            <span className={titleClassName}>
              Plan:
            </span>
            <span className="text-xs lg:text-base font-semibold">
              {data.content.plan.name}
            </span>
          </div>
          <div className={rowClassName}>
            <span className={titleClassName}>
              Block:
            </span>
            <span className="text-xs lg:text-base font-semibold">
              {number_format(data.content.plan.height, '0,0')}
            </span>
          </div>
          {data.content.plan.info && (
            <div className={rowClassName}>
              <span className={titleClassName}>
                {name(data.type)}:
              </span>
              <div className="text-xs lg:text-base font-semibold">
                {typeof to_json(data.content.plan.info) === 'object' ?
                  <div className="max-w-lg max-h-96 overflow-y-auto">
                    <ReactJson
                      src={to_json(data.content.plan.info)}
                      theme={theme === 'dark' ? 'harmonic' : 'rjv-default'}
                    />
                  </div>
                  :
                  <span className="bg-slate-100 dark:bg-slate-900 rounded-lg capitalize py-0.5 px-2">
                    {data.content.plan.info}
                  </span>
                }
              </div>
            </div>
          )}
        </>
      )}
      {data?.content?.changes?.filter(c => c?.subspace).map((c, i) => (
        <div key={i} className={rowClassName}>
          <span className={titleClassName}>
            {c.key}:
          </span>
          <div className="text-xs lg:text-base font-semibold">
            {typeof to_json(c.value) === 'object' ?
              <div className="space-y-2">
                <span className="bg-slate-100 dark:bg-slate-900 rounded-lg capitalize py-0.5 px-2">
                  {name(c.subspace)}
                </span>
                <div className="max-w-lg max-h-96 overflow-y-auto">
                  <ReactJson
                    src={to_json(c.value)}
                    theme={theme === 'dark' ? 'harmonic' : 'rjv-default'}
                  />
                </div>
              </div>
              :
              <span className="bg-slate-100 dark:bg-slate-900 rounded-lg capitalize py-0.5 px-2">
                {name(c.subspace)} = {c.value}
              </span>
            }
          </div>
        </div>
      ))}
      <div className={rowClassName}>
        <span className={titleClassName}>
          Submit Time:
        </span>
        {data ?
          data.submit_time && (
            <span className="text-slate-400 dark:text-slate-600 text-xs lg:text-base font-medium">
              {moment(data.submit_time).fromNow()} ({moment(data.submit_time).format('MMM D, YYYY h:mm:ss A')})
            </span>
          )
          :
          <div className="skeleton w-40 h-6 mt-1" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Deposit End Time:
        </span>
        {data ?
          data.deposit_end_time && (
            <span className="text-slate-400 dark:text-slate-600 text-xs lg:text-base font-medium">
              {moment(data.deposit_end_time).fromNow()} ({moment(data.deposit_end_time).format('MMM D, YYYY h:mm:ss A')})
            </span>
          )
          :
          <div className="skeleton w-40 h-6 mt-1" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Voting Start Time:
        </span>
        {data ?
          data.voting_start_time && (
            <span className="text-slate-400 dark:text-slate-600 text-xs lg:text-base font-medium">
              {moment(data.voting_start_time).fromNow()} ({moment(data.voting_start_time).format('MMM D, YYYY h:mm:ss A')})
            </span>
          )
          :
          <div className="skeleton w-40 h-6 mt-1" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Voting End Time:
        </span>
        {data ?
          data.voting_end_time && (
            <span className="text-slate-400 dark:text-slate-600 text-xs lg:text-base font-medium">
              {moment(data.voting_end_time).fromNow()} ({moment(data.voting_end_time).format('MMM D, YYYY h:mm:ss A')})
            </span>
          )
          :
          <div className="skeleton w-40 h-6 mt-1" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Total Deposit:
        </span>
        {data ?
          <div className="flex flex-col space-y-1.5">
            {data.total_deposit ?
              data.total_deposit.map((d, i) => (
                <span
                  key={i}
                  className="text-xs lg:text-base font-semibold"
                >
                  {number_format(d.amount, '0,0.00')} {d.symbol || d.denom}
                </span>
              ))
              :
              <span>
                -
              </span>
            }
          </div>
          :
          <div className="skeleton w-40 h-6 mt-1" />
        }
      </div>
    </div>
  )
}