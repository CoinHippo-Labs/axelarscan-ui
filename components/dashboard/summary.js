import Link from 'next/link'

import moment from 'moment'

import Copy from '../copy'

import { number_format, ellipse } from '../../lib/utils'

export default function Summary({ data }) {
  return (
    <div className="w-full grid grid-flow-row grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-2 sm:mt-4">
      <Link href="/blocks">
        <div
          title={<div className="flex items-center justify-between space-x-1.5">
            <span className="flex items-center space-x-1.5">
              <span>{data?.latest_block?.pre_votes > 0 ? 'Pre Votes' : 'Consensus State'}</span>
              {data?.latest_block?.pre_votes > 0 && (
                <div className={`bg-${data.latest_block.pre_votes > 2 / 3 ? 'green' : 'red'}-500 rounded-xl text-white text-xs py-0.5 px-2`}>
                  <span className="font-mono">{number_format(data.latest_block.pre_votes * 100, '0,0.00')}</span>%
                </div>
              )}
            </span>
            {data?.latest_block?.height && (
              <span className="font-mono text-gray-600 dark:text-gray-400 text-2xs">{number_format(data.latest_block.height, '0,0')}</span>
            )}
          </div>}
          className="bg-transparent sm:bg-white sm:dark:bg-gray-900 shadow border-0 cursor-pointer px-4 sm:py-4"
        >
          <div className="flex flex-col space-y-1 mt-1">
            {data ?
              <span className="h-8">
                {data?.latest_block?.operator_address ?
                  <div className={`flex items-${data.latest_block.proposer_name ? /*'start'*/'center' : 'center'} space-x-2.5`}>
                    <Link href={`/validator/${data.latest_block.operator_address}`}>
                      <a>
                        {data.latest_block.proposer_image ?
                          <img
                            src={data.latest_block.proposer_image}
                            alt=""
                            className="w-8 h-8 rounded-full"
                            style={{ minWidth: '2rem' }}
                          />
                          :
                          <div className="skeleton w-8 h-8 rounded-full" />
                        }
                      </a>
                    </Link>
                    <div className="flex flex-col">
                      {data.latest_block.proposer_name && (
                        <Link href={`/validator/${data.latest_block.operator_address}`}>
                          <a className="leading-4 text-base text-blue-600 dark:text-white font-semibold">
                            {ellipse(data.latest_block.proposer_name, 16) || ellipse(data.latest_block.operator_address, 8)}
                          </a>
                        </Link>
                      )}
                      {/*<span className="flex items-center space-x-1">
                        <Link href={`/validator/${data.latest_block.operator_address}`}>
                          <a className="text-3xs text-gray-600 dark:text-gray-200 font-normal">
                            {ellipse(data.latest_block.operator_address, 16)}
                          </a>
                        </Link>
                        <Copy size={14} value={data.latest_block.operator_address} />
                      </span>*/}
                    </div>
                  </div>
                  :
                  data && !data.latest_block ?
                    <span className="text-3xl">-</span>
                    :
                    <div className="flex items-center space-x-2.5">
                      <div className="skeleton w-8 h-8 rounded-full" />
                      <div className="flex flex-col space-y-1">
                        <div className="skeleton w-24 h-6" />
                        {/*<div className="skeleton w-32 h-3.5" />*/}
                      </div>
                    </div>
                }
              </span>
              :
              <div className="skeleton w-24 h-7 mt-1" />
            }
            <span className="flex items-center justify-between text-gray-400 dark:text-gray-600 text-sm font-normal space-x-1">
              <span>Proposer</span>
              <div className="flex items-center space-x-1.5">
                <span>VP:</span>
                {data?.latest_block?.voting_power ?
                  <Link href={`/validator/${data.latest_block.operator_address}`}>
                    <span className="cursor-pointer font-mono text-black dark:text-white font-semibold">
                      {number_format(data.latest_block.voting_power, '0,0')}
                    </span>
                  </Link>
                  :
                  <div className="skeleton w-6 h-3.5" />
                }
              </div>
            </span>
          </div>
        </div>
      </Link>
      <Link href={`/block${typeof data?.block_height === 'number' ? `/${data.block_height}` : 's'}`}>
        <div
          title="Latest Block Height"
          className="bg-transparent sm:bg-white sm:dark:bg-gray-900 shadow border-0 cursor-pointer px-4 sm:py-4"
        >
          <div className="flex flex-col space-y-1 mt-1">
            {data ?
              <span className="h-8 font-mono text-3xl font-semibold">
                {typeof data.block_height === 'number' && number_format(data.block_height, '0,0')}
              </span>
              :
              <div className="skeleton w-24 h-7 mt-1" />
            }
            <span className="text-gray-400 dark:text-gray-600 text-sm font-normal">
              {data ?
                data.block_height_at && moment(data.block_height_at).format('MMM D, YYYY h:mm:ss A z')
                :
                <div className="skeleton w-32 h-3.5 mt-0.5" />
              }
            </span>
          </div>
        </div>
      </Link>
      <Link href="/blocks">
        <div
          title="Average Block Time"
          className="bg-transparent sm:bg-white sm:dark:bg-gray-900 shadow border-0 cursor-pointer px-4 sm:py-4"
        >
          <div className="flex flex-col item space-y-1 mt-1">
            {data ?
              <span className="h-8 font-mono text-3xl font-semibold">
                {typeof data.avg_block_time === 'number' && number_format(data.avg_block_time, '0.00')}
              </span>
              :
              <div className="skeleton w-24 h-7 mt-1" />
            }
            <span className="text-gray-400 dark:text-gray-600 text-sm font-normal">seconds</span>
          </div>
        </div>
      </Link>
      <Link href="/validators">
        <div
          title="Active Validators"
          className="bg-transparent sm:bg-white sm:dark:bg-gray-900 shadow border-0 cursor-pointer px-4 sm:py-4"
        >
          <div className="flex flex-col space-y-1 mt-1">
            {typeof data?.active_validators === 'number' ?
              <span className="h-8 font-mono text-3xl font-semibold">
                {number_format(data.active_validators, '0,0')}
              </span>
              :
              <div className="skeleton w-24 h-7 mt-1" />
            }
            <span className="flex items-center text-gray-400 dark:text-gray-600 text-sm font-normal space-x-1">
              <span>out of</span>
              {typeof data?.total_validators === 'number' ?
                <span className="text-gray-600 dark:text-gray-200 font-medium">
                  {number_format(data.total_validators, '0,0')}
                </span>
                :
                <div className="skeleton w-6 h-3.5" />
              }
              <span>validators</span>
            </span>
          </div>
        </div>
      </Link>
      <Link href="/validators">
        <div
          title="Online Voting Power"
          className="bg-transparent sm:bg-white sm:dark:bg-gray-900 shadow border-0 cursor-pointer px-4 sm:py-4"
        >
          <div className="flex flex-col space-y-1 mt-1">
            {data?.online_voting_power_now ?
              <span className="h-8 font-mono uppercase text-3xl font-semibold">
                {data.online_voting_power_now}
              </span>
              :
              <div className="skeleton w-24 h-7 mt-1" />
            }
            <span className="flex items-center text-gray-400 dark:text-gray-600 text-sm font-normal space-x-1">
              {typeof data?.online_voting_power_now_percentage === 'number' ?
                <span className="text-gray-600 dark:text-gray-200 font-medium">
                  {number_format(data.online_voting_power_now_percentage, '0,0.000000')}%
                </span>
                :
                <div className="skeleton w-6 h-3.5" />
              }
              <span>from</span>
              {data?.total_voting_power ?
                <span className="uppercase text-gray-600 dark:text-gray-200 font-medium">
                  {data.total_voting_power}
                </span>
                :
                <div className="skeleton w-8 h-3.5" />
              }
              <span className="text-gray-600 dark:text-gray-400 font-medium">
                {data && ellipse(data.denom)}
              </span>
            </span>
          </div>
        </div>
      </Link>
    </div>
  )
}