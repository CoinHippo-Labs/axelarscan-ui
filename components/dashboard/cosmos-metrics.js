import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import moment from 'moment'
import { ProgressBar } from 'react-loader-spinner'

import Popover from '../popover'
import { number_format, ellipse, loader_color } from '../../lib/utils'

export default ({
  data,
}) => {
  const {
    preferences,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }

  const {
    latest_block_height,
    latest_block_time,
    avg_block_time,
    active_validators,
    total_validators,
    online_voting_power,
    online_voting_power_percentage,
    total_voting_power,
    denom,
    inflation_data,
  } = { ...data }
  const {
    inflation,
  } = { ...inflation_data }

  const metricClassName = 'bg-white dark:bg-zinc-900 shadow shadow-zinc-200 dark:shadow-zinc-700 rounded py-4 xl:py-3 px-5 xl:px-4'
  const titleClassName = 'text-2xl font-semibold space-x-1'
  const subtitleClassName = 'text-slate-500 dark:text-slate-200 text-sm font-normal ml-0.5'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <Link href={`/block${!isNaN(latest_block_height) ? `/${latest_block_height}` : 's'}`}>
        <a className={`${metricClassName}`}>
          <Popover
            placement="bottom"
            title={null}
            content={<div className="w-full whitespace-nowrap text-black dark:text-white text-xs font-normal">
              {moment(latest_block_time).format('MMM D, YYYY h:mm:ss A z')}
            </div>}
            className="text-left"
          >
            <div className={titleClassName}>
              {!isNaN(latest_block_height) ?
                number_format(
                  latest_block_height,
                  '0,0',
                ) :
                <ProgressBar
                  color={loader_color(theme)}
                  width="32"
                  height="32"
                />
              }
            </div>
            <span className={subtitleClassName}>
              latest block height
            </span>
          </Popover>
        </a>
      </Link>
      <Link href="/blocks">
        <a className={`${metricClassName}`}>
          <Popover
            placement="bottom"
            title={null}
            content={<div className="w-full whitespace-nowrap text-black dark:text-white text-xs font-normal">
              the average block time from the last {
                number_format(
                  100,
                  '0,0',
                )
              } blocks
            </div>}
            className="text-left"
          >
            <div className={titleClassName}>
              {!isNaN(avg_block_time) ?
                <>
                  <span>
                    {number_format(
                      avg_block_time,
                      '0,0.00',
                    )}
                  </span>
                  <span>
                    sec
                  </span>
                </> :
                <ProgressBar
                  color={loader_color(theme)}
                  width="32"
                  height="32"
                />
              }
            </div>
            <span className={subtitleClassName}>
              average block time
            </span>
          </Popover>
        </a>
      </Link>
      <Link href="/validators">
        <a className={`${metricClassName}`}>
          <Popover
            placement="bottom"
            title={null}
            content={<div className="w-full whitespace-nowrap text-black dark:text-white text-xs font-normal">
              {!isNaN(active_validators) &&
                number_format(
                  active_validators,
                  '0,0',
                )
              } active validators out of {!isNaN(total_validators) &&
                number_format(
                  total_validators,
                  '0,0',
                )
              } validators
            </div>}
            className="text-left"
          >
            <div className={titleClassName}>
              {!isNaN(active_validators) ?
                number_format(
                  active_validators,
                  '0,0',
                ) :
                <ProgressBar
                  color={loader_color(theme)}
                  width="32"
                  height="32"
                />
              }
            </div>
            <span className={subtitleClassName}>
              active validators
            </span>
          </Popover>
        </a>
      </Link>
      <Link href="/validators">
        <a className={`${metricClassName}`}>
          <Popover
            placement="bottom"
            title={null}
            content={<div className="w-full whitespace-nowrap text-black dark:text-white text-xs font-normal">
              {!isNaN(online_voting_power_percentage) &&
                number_format(
                  online_voting_power_percentage,
                  '0,0.000',
                )
              }% bonded tokens from {!isNaN(total_voting_power) &&
                number_format(
                  total_voting_power,
                  total_voting_power > 250000000 ?
                    '0,0.0a' :
                    '0,0.00',
                ).toUpperCase()
              } {denom}
            </div>}
            className="text-left"
          >
            <div className={`uppercase ${titleClassName}`}>
              {!isNaN(online_voting_power) ?
                number_format(
                  online_voting_power,
                  online_voting_power > 250000000 ?
                    '0,0.00a' :
                    '0,0.00',
                ) :
                <ProgressBar
                  color={loader_color(theme)}
                  width="32"
                  height="32"
                />
              }
            </div>
            <span className={subtitleClassName}>
              bonded tokens
            </span>
          </Popover>
        </a>
      </Link>
      <div className={`${metricClassName}`}>
        <Popover
          placement="bottom"
          title={null}
          content={<div className="w-60 text-black dark:text-white text-xs font-normal">
            base inflation on the network + (inflation for EVM chains * # of EVM chains)
          </div>}
          className="text-left"
        >
          <div className={`uppercase ${titleClassName}`}>
            {!isNaN(inflation) ?
              <span>
                {number_format(
                  inflation * 100,
                  '0,0.000000',
                )}
                %
              </span> :
              <ProgressBar
                color={loader_color(theme)}
                width="32"
                height="32"
              />
            }
          </div>
          <span className={subtitleClassName}>
            inflation rate
          </span>
        </Popover>
      </div>
    </div>
  )
}