import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import moment from 'moment'
import { FallingLines } from 'react-loader-spinner'

import ValidatorProfile from '../validator-profile'
import Copy from '../copy'
import { number_format, ellipse, loader_color } from '../../lib/utils'

export default ({ data }) => {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const {
    latest_block,
    block_height,
    block_time,
    avg_block_time,
    active_validators,
    total_validators,
    online_voting_power,
    online_voting_power_percentage,
    total_voting_power,
    denom,
  } = { ...data }
  const {
    pre_votes,
    height,
    voting_power,
    operator_address,
    validator_description,
  } = { ...latest_block }
  const metricClassName = 'bg-white dark:bg-black border hover:border-transparent dark:border-slate-900 hover:dark:border-transparent shadow hover:shadow-lg dark:shadow-slate-400 rounded-lg space-y-0.5 py-4 px-5'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <Link href="/blocks">
        <div className={`${metricClassName} cursor-pointer`}>
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-1.5">
              <span className="whitespace-nowrap text-slate-500 dark:text-slate-300 text-base font-semibold">
                {pre_votes > 0 ?
                  'Pre Votes' : 'Consensus State'
                }
              </span>
              {pre_votes > 0 && (
                <div className={`${pre_votes > 2 / 3 ? 'bg-green-100 dark:bg-green-900 border border-green-500 dark:border-green-600 text-green-500 dark:text-green-600' : 'bg-red-100 dark:bg-red-900 border border-red-500 dark:border-red-600 text-red-500 dark:text-red-600'} rounded-lg text-xs font-semibold py-0.5 px-1.5`}>
                  {number_format(pre_votes, '0,0.00%')}
                </div>
              )}
            </div>
            {height && (
              <span className="text-slate-400 dark:text-slate-600 font-semibold">
                {number_format(height, '0,0')}
              </span>
            )}
          </div>
          <div className="text-3xl font-bold">
            {latest_block && operator_address ?
              <Link href={`/validator/${operator_address}`}>
                <a className="min-w-max h-9 flex items-center space-x-2">
                  <ValidatorProfile
                    validator_description={validator_description}
                    className="w-8 h-8"
                  />
                  <span className="text-blue-600 dark:text-white text-base font-bold">
                    {validator_description?.moniker ?
                      ellipse(validator_description.moniker) : ellipse(operator_address, 6)
                    }
                  </span>
                </a>
              </Link> :
              <FallingLines color={loader_color(theme)} width="36" height="36" />
            }
          </div>
          <div className="flex items-center justify-between space-x-2">
            <span className="text-slate-400 dark:text-slate-600 font-semibold">
              Proposer
            </span>
            {!isNaN(voting_power) && (
              <div className="flex items-center text-xs space-x-1">
                <span className="text-slate-400 dark:text-slate-600 font-bold">
                  VP:
                </span>
                <Link href={`/validator/${operator_address}`}>
                  <a className="text-slate-400 dark:text-slate-600 font-bold">
                    {number_format(voting_power, '0,0')}
                  </a>
                </Link>
              </div>
            )}
          </div>
        </div>
      </Link>
      <Link href={`/block${!isNaN(block_height) ? `/${block_height}` : 's'}`}>
        <a className={`${metricClassName}`}>
          <span className="text-slate-500 dark:text-slate-300 text-base font-semibold">
            Latest Block Height
          </span>
          <div className="text-3xl font-bold">
            {!isNaN(block_height) ?
              number_format(block_height, '0,0') :
              <FallingLines color={loader_color(theme)} width="36" height="36" />
            }
          </div>
          <span className="text-slate-400 dark:text-slate-600 text-sm font-medium">
            {moment(block_time).format('MMM D, YYYY h:mm:ss A z')}
          </span>
        </a>
      </Link>
      <Link href="/blocks">
        <a className={`${metricClassName}`}>
          <span className="text-slate-500 dark:text-slate-300 text-base font-semibold">
            Average Block Time
          </span>
          <div className="text-3xl font-bold">
            {!isNaN(avg_block_time) ?
              number_format(avg_block_time, '0,0.00') :
              <FallingLines color={loader_color(theme)} width="36" height="36" />
            }
          </div>
          <span className="text-slate-400 dark:text-slate-600 text-sm font-medium">
            seconds from last {number_format(process.env.NEXT_PUBLIC_NUM_AVG_BLOCK_TIME_BLOCKS, '0,0')} blocks
          </span>
        </a>
      </Link>
      <Link href="/validators">
        <a className={`${metricClassName}`}>
          <span className="text-slate-500 dark:text-slate-300 text-base font-semibold">
            Active Validators
          </span>
          <div className="text-3xl font-bold">
            {!isNaN(active_validators) ?
              number_format(active_validators, '0,0') :
              <FallingLines color={loader_color(theme)} width="36" height="36" />
            }
          </div>
          <span className="text-slate-400 dark:text-slate-600 text-sm font-medium">
            out of {total_validators && number_format(total_validators, '0,0')} validators
          </span>
        </a>
      </Link>
      <Link href="/validators">
        <a className={`${metricClassName}`}>
          <span className="text-slate-500 dark:text-slate-300 text-base font-semibold">
            Bonded Tokens
          </span>
          <div className="uppercase text-3xl font-bold">
            {!isNaN(online_voting_power) ?
              number_format(online_voting_power, '0,0.00a') :
              <FallingLines color={loader_color(theme)} width="36" height="36" />
            }
          </div>
          <span className="text-slate-400 dark:text-slate-600 text-sm font-medium">
            {online_voting_power_percentage && number_format(online_voting_power_percentage, '0,0.000')}% from {total_voting_power && number_format(total_voting_power, '0,0.0a').toUpperCase()} {denom}
          </span>
        </a>
      </Link>
    </div>
  )
}