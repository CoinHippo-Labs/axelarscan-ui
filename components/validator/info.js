import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import moment from 'moment'
import Linkify from 'react-linkify'

import Copy from '../copy'
import ValidatorProfile from '../validator-profile'
import { assetManager } from '../../lib/object/asset'
import { number_format, name, ellipse } from '../../lib/utils'

export default ({
  data,
  votingPower,
}) => {
  const { assets, chain } = useSelector(state => ({ assets: state.assets, chain: state.chain }), shallowEqual)
  const { assets_data } = { ...assets }
  const { chain_data } = { ...chain }

  const {
    deregistering,
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
  const { voting_power } = { ...votingPower }
  const { staking_pool } = { ...chain_data }
  const { bonded_tokens } = { ...staking_pool }
  const { moniker, details, website } = { ...description }
  const { commission_rates } = { ...commission }
  const { rate, max_rate, max_change_rate } = { ...commission_rates }
  const rowClassName = 'flex flex-col lg:flex-row items-start space-y-2 lg:space-y-0 space-x-0 lg:space-x-2'
  const titleClassName = 'w-40 lg:w-64 whitespace-nowrap text-sm lg:text-base font-bold'

  return (
    <div className="w-full flex flex-col space-y-4">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-3">
          <ValidatorProfile
            validator_description={description}
            className="lg:w-9 lg:h-9"
          />
          {data ?
            <span className="text-lg font-bold">
              {ellipse(moniker, 16)}
            </span>
            :
            <div className="skeleton w-40 h-6 mt-0.5" />
          }
        </div>
        <div className="flex flex-wrap items-center space-x-1.5">
          {deregistering && (
            <div className="bg-slate-100 dark:bg-slate-900 rounded capitalize text-xs sm:text-sm font-bold py-1 px-1.5">
              Deregistering
            </div>
          )}
          {tombstoned && (
            <div className="bg-slate-400 dark:bg-slate-500 rounded capitalize text-white text-xs sm:text-sm font-bold py-1 px-1.5">
              Tombstoned
            </div>
          )}
          {jailed && (
            <div className="bg-red-500 dark:bg-red-600 rounded capitalize text-white text-xs sm:text-sm font-bold py-1 px-1.5">
              Jailed
            </div>
          )}
          {status && (
            <div className={`${status.includes('UN') ? status.endsWith('ED') ? 'bg-red-500 dark:bg-red-600' : 'bg-yellow-400 dark:bg-yellow-500' : 'bg-green-500 dark:bg-green-600'} rounded capitalize text-white text-xs sm:text-sm font-bold py-1 px-1.5`}>
              {status.replace('BOND_STATUS_', '').toLowerCase()}
            </div>
          )}
        </div>
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Operator Address:
        </span>
        {data ?
          operator_address && (
            <Copy
              value={operator_address}
              title={<span className="cursor-pointer break-all text-black dark:text-white text-sm lg:text-base font-semibold">
                {ellipse(operator_address, 12, process.env.NEXT_PUBLIC_PREFIX_VALIDATOR)}
              </span>}
              size={20}
            />
          )
          :
          <div className="skeleton w-40 h-6 mt-1" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Consensus Address:
        </span>
        {data ?
          consensus_address && (
            <Copy
              value={consensus_address}
              title={<span className="cursor-pointer break-all text-black dark:text-white text-sm lg:text-base font-semibold">
                {ellipse(consensus_address, 12, process.env.NEXT_PUBLIC_PREFIX_CONSENSUS)}
              </span>}
              size={20}
            />
          )
          :
          <div className="skeleton w-40 h-6 mt-1" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Delegator Address:
        </span>
        {data ?
          delegator_address && (
            <div className="flex items-center space-x-1">
              <Link href={`/account/${delegator_address}`}>
                <a className="break-all text-blue-600 dark:text-blue-400 text-sm lg:text-base font-semibold">
                  {ellipse(delegator_address, 16, process.env.NEXT_PUBLIC_PREFIX_ACCOUNT)}
                </a>
              </Link>
              <Copy
                value={delegator_address}
                size={20}
              />
            </div>
          )
          :
          <div className="skeleton w-40 h-6 mt-1" />
        }
      </div>
      {broadcaster_address && (
        <div className={rowClassName}>
          <span className={titleClassName}>
            Broadcaster Address:
          </span>
          <div className="flex items-center space-x-1">
            <Link href={`/account/${broadcaster_address}`}>
              <a className="break-all text-blue-600 dark:text-blue-400 text-sm lg:text-base font-semibold">
                {ellipse(broadcaster_address, 16, process.env.NEXT_PUBLIC_PREFIX_ACCOUNT)}
              </a>
            </Link>
            <Copy
              value={broadcaster_address}
              size={20}
            />
          </div>
        </div>
      )}
      {(!data || details) && (
        <div className={rowClassName}>
          <span
            className={titleClassName}
            style={{ minWidth: '16rem' }}
          >
            Validator Details:
          </span>
          {data ?
            details && (
              <div className="linkify text-slate-400 dark:text-slate-200 text-sm lg:text-base">
                <Linkify>
                  {details}
                </Linkify>
              </div>
            )
            :
            <div className="skeleton w-40 h-6 mt-1" />
          }
        </div>
      )}
      {(!data || website) && (
        <div className={rowClassName}>
          <span className={titleClassName}>
            Website:
          </span>
          {data ?
            website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 text-sm lg:text-base font-semibold"
              >
                {website}
              </a>
            )
            :
            <div className="skeleton w-40 h-6 mt-1" />
          }
        </div>
      )}
      <div className={rowClassName}>
        <span className={titleClassName}>
          Voting Power:
        </span>
        {data ?
          (voting_power || tokens) && (
            <span className="flex items-center text-sm lg:text-base font-semibold space-x-1.5">
              <span>
                {!isNaN(voting_power) ?
                  number_format(voting_power, '0,0') :
                  !isNaN(tokens) ?
                    number_format(Math.floor(assetManager.amount(tokens, assets_data[0]?.id, assets_data)), '0,0') : '-'
                }
              </span>
              {!isNaN(bonded_tokens) && (
                <span className="whitespace-nowrap">
                  ({number_format(
                    (!isNaN(voting_power) ?
                      Number(voting_power) : Math.floor(assetManager.amount(tokens, assets_data[0]?.id, assets_data))
                    )
                    * 100 / Math.floor(bonded_tokens),
                    '0,0.00'
                  )}%)
                </span>
              )}
            </span>
          )
          :
          <div className="skeleton w-40 h-6 mt-1" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Commission:
        </span>
        {data ?
          commission_rates && (
            <span className="flex items-center text-sm lg:text-base font-semibold space-x-1.5">
              <span>
                {!isNaN(rate) ?
                  `${number_format(rate * 100, '0,0.00')}%` : '-'
                }
              </span>
              {!isNaN(max_rate) && (
                <span className="whitespace-nowrap">
                  (Max: {number_format(max_rate * 100, '0,0.00')}%)
                </span>
              )}
              {!isNaN(max_change_rate) && (
                <span className="whitespace-nowrap">
                  (Max Change: {number_format(max_change_rate * 100, '0,0.00')}%)
                </span>
              )}
            </span>
          )
          :
          <div className="skeleton w-40 h-6 mt-1" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Min Self Delegation:
        </span>
        {data ?
          <span className="text-sm lg:text-base font-semibold">
            {number_format(min_self_delegation, '0,0')} AXL
          </span>
          :
          <div className="skeleton w-40 h-6 mt-1" />
        }
      </div>
      {start_height > 0 && (
        <div className={rowClassName}>
          <span className={titleClassName}>
            Start Block:
          </span>
          <span className="text-sm lg:text-base font-semibold">
            {number_format(start_height, '0,0')}
          </span>
        </div>
      )}
    </div>
  )
}