import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import Linkify from 'react-linkify'
import { ProgressBar } from 'react-loader-spinner'

import Copy from '../copy'
import ValidatorProfile from '../validator-profile'
import { assetManager } from '../../lib/object/asset'
import { number_format, name, ellipse, loader_color } from '../../lib/utils'

export default ({
  data,
  votingPower,
}) => {
  const {
    preferences,
    assets,
    chain,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        assets: state.assets,
        chain: state.chain,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    assets_data,
  } = { ...assets }
  const {
    chain_data,
  } = { ...chain }

  const {
    tombstoned,
    jailed,
    status,
    operator_address,
    consensus_address,
    delegator_address,
    broadcaster_address,
    description,
    tokens,
    commission,
    min_self_delegation,
    start_height,
  } = { ...data }

  const {
    voting_power,
  } = { ...votingPower }
  const {
    staking_pool,
  } = { ...chain_data }
  const {
    bonded_tokens,
  } = { ...staking_pool }
  const {
    moniker,
    details,
    website,
  } = { ...description }
  const {
    commission_rates,
  } = { ...commission }
  const {
    rate,
    max_rate,
    max_change_rate,
  } = { ...commission_rates }

  const rowClassName = 'flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2'
  const titleClassName = 'w-40 lg:w-64 tracking-wider text-slate-600 dark:text-slate-300 text-sm lg:text-base font-medium'

  return (
    <div className="w-full flex flex-col space-y-3">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-3">
          <ValidatorProfile
            validator_description={description}
            className="lg:w-9 lg:h-9"
          />
          {data ?
            <span className="text-lg font-semibold">
              {ellipse(
                moniker,
                16,
              )}
            </span> :
            <ProgressBar
              borderColor={loader_color(theme)}
              width="24"
              height="24"
            />
          }
        </div>
        <div className="flex flex-wrap items-center space-x-1.5">
          {
            status &&
            (
              <>
                <div className={`${status.includes('UN') ? status.endsWith('ED') ? 'bg-red-200 dark:bg-red-300 border-2 border-red-400 dark:border-red-600 text-red-500 dark:text-red-700' : 'bg-yellow-200 dark:bg-yellow-300 border-2 border-yellow-400 dark:border-yellow-600 text-yellow-500 dark:text-yellow-700' : 'bg-green-200 dark:bg-green-300 border-2 border-green-400 dark:border-green-600 text-green-500 dark:text-green-700'} rounded-xl text-xs font-semibold py-0.5 px-2`}>
                  {status
                    .replace(
                      'BOND_STATUS_',
                      '',
                    )
                  }
                </div>
                {
                  tombstoned &&
                  (
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-xl capitalize text-slate-600 dark:text-slate-200 text-xs font-medium py-1 px-2">
                      Tombstoned
                    </div>
                  )
                }
                {
                  jailed &&
                  (
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-xl capitalize text-slate-600 dark:text-slate-200 text-xs font-medium py-1 px-2">
                      Jailed
                    </div>
                  )
                }
              </>
            )
          }
        </div>
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Operator Address:
        </span>
        {data ?
          operator_address &&
          (
            <Copy
              size={20}
              value={operator_address}
              title={
                <span className="cursor-pointer break-all text-slate-400 dark:text-slate-200 text-sm lg:text-base font-medium">
                  {ellipse(
                    operator_address,
                    12,
                    process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                  )}
                </span>
              }
            />
          ) :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Consensus Address:
        </span>
        {data ?
          consensus_address &&
          (
            <Copy
              size={20}
              value={consensus_address}
              title={
                <span className="cursor-pointer break-all text-slate-400 dark:text-slate-200 text-sm lg:text-base font-medium">
                  {ellipse(
                    consensus_address,
                    12,
                    process.env.NEXT_PUBLIC_PREFIX_CONSENSUS,
                  )}
                </span>
              }
            />
          ) :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Delegator Address:
        </span>
        {data ?
          delegator_address &&
          (
            <div className="flex items-center space-x-1">
              <Link href={`/account/${delegator_address}`}>
                <a className="break-all text-blue-400 dark:text-blue-500 text-sm lg:text-base font-medium">
                  {ellipse(
                    delegator_address,
                    16,
                    process.env.NEXT_PUBLIC_PREFIX_ACCOUNT,
                  )}
                </a>
              </Link>
              <Copy
                size={20}
                value={delegator_address}
              />
            </div>
          ) :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      {
        broadcaster_address &&
        (
          <div className={rowClassName}>
            <span className={titleClassName}>
              Broadcaster Address:
            </span>
            <div className="flex items-center space-x-1">
              <Link href={`/account/${broadcaster_address}`}>
                <a className="break-all text-blue-400 dark:text-blue-500 text-sm lg:text-base font-medium">
                  {ellipse(
                    broadcaster_address,
                    16,
                    process.env.NEXT_PUBLIC_PREFIX_ACCOUNT,
                  )}
                </a>
              </Link>
              <Copy
                size={20}
                value={broadcaster_address}
              />
            </div>
          </div>
        )
      }
      {
        (
          !data ||
          details
        ) &&
        (
          <div className={rowClassName}>
            <span
              className={titleClassName}
              style={{ minWidth: '16rem' }}
            >
              Validator Details:
            </span>
            {data ?
              details &&
              (
                <div className="linkify text-slate-400 dark:text-slate-200 text-sm lg:text-base">
                  <Linkify>
                    {details}
                  </Linkify>
                </div>
              ) :
              <ProgressBar
                borderColor={loader_color(theme)}
                width="24"
                height="24"
              />
            }
          </div>
        )
      }
      {
        (
          !data ||
          website
        ) &&
        (
          <div className={rowClassName}>
            <span className={titleClassName}>
              Website:
            </span>
            {data ?
              website &&
              (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 dark:text-blue-500 text-sm lg:text-base font-medium"
                >
                  {website}
                </a>
              ) :
              <ProgressBar
                borderColor={loader_color(theme)}
                width="24"
                height="24"
              />
            }
          </div>
        )
      }
      <div className={rowClassName}>
        <span className={titleClassName}>
          Voting Power:
        </span>
        {data ?
          (
            voting_power ||
            tokens
          ) &&
          (
            <span className="flex items-center text-sm lg:text-base font-medium space-x-1.5">
              <span>
                {!isNaN(voting_power) ?
                  number_format(
                    voting_power,
                    '0,0',
                  ) :
                  !isNaN(tokens) ?
                    number_format(
                      Math.floor(
                        assetManager
                          .amount(
                            tokens,
                            _.head(
                              assets_data
                            )?.id,
                            assets_data,
                          )
                      ),
                      '0,0',
                    ) :
                    '-'
                }
              </span>
              {
                !isNaN(bonded_tokens) &&
                (
                  <span className="whitespace-nowrap">
                    (
                    {number_format(
                      (!isNaN(voting_power) ?
                        Number(voting_power) :
                        Math.floor(
                          assetManager
                            .amount(
                              tokens,
                                _.head(
                                assets_data
                              )?.id,
                              assets_data,
                            )
                        )
                      )
                      * 100 /
                      Math.floor(bonded_tokens),
                      '0,0.00',
                    )}
                    %)
                  </span>
                )
              }
            </span>
          ) :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Commission:
        </span>
        {data ?
          commission_rates &&
          (
            <span className="flex items-center text-sm lg:text-base font-medium space-x-1.5">
              <span>
                {!isNaN(rate) ?
                  `${
                    number_format(
                      rate * 100,
                      '0,0.00',
                    )
                  }%` :
                  '-'
                }
              </span>
              {
                !isNaN(max_rate) &&
                (
                  <span className="whitespace-nowrap">
                    (Max: {
                      number_format(
                        max_rate * 100,
                        '0,0.00',
                      )
                    }%)
                  </span>
                )
              }
              {
                !isNaN(max_change_rate) &&
                (
                  <span className="whitespace-nowrap">
                    (Max Change: {
                      number_format(
                        max_change_rate * 100,
                        '0,0.00',
                      )
                    }%)
                  </span>
                )
              }
            </span>
          ) :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Min Self Delegation:
        </span>
        {data ?
          <span className="text-sm lg:text-base font-medium">
            {
              number_format(
                min_self_delegation,
                '0,0',
              )
            } AXL
          </span> :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      {
        start_height > 0 &&
        (
          <div className={rowClassName}>
            <span className={titleClassName}>
              Start Block:
            </span>
            <span className="text-sm lg:text-base font-medium">
              {number_format(
                start_height,
                '0,0',
              )}
            </span>
          </div>
        )
      }
    </div>
  )
}