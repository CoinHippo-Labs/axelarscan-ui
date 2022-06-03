import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSelector, shallowEqual } from 'react-redux'
import { FiBox } from 'react-icons/fi'
import { BiServer } from 'react-icons/bi'
import { HiOutlineExternalLink } from 'react-icons/hi'
import { MdNavigateBefore, MdNavigateNext } from 'react-icons/md'

import EVMVoteFilters from '../../evm-votes/filters'
import TransactionFilters from '../../transactions/filters'
import TransferFilters from '../../transfers/filters'
import GMPFilters from '../../gmps/filters'
import BatchFilters from '../../batches/filters'
import Copy from '../../copy'
import EnsProfile from '../../ens-profile'
import { currency, currency_symbol } from '../../../lib/object/currency'
import { number_format, ellipse } from '../../../lib/utils'

export default () => {
  const { _status, _chain } = useSelector(state => ({ _status: state.status, _chain: state.chain }), shallowEqual)
  const { status_data } = { ..._status }
  const { chain_data } = { ..._chain }

  const router = useRouter()
  const { pathname, query } = { ...router }
  const { status, height, address, tx, id } = { ...query }

  const { token_data } = { ...chain_data }
  let title, subtitle, right
  switch (pathname) {
    case '/':
      title = 'Overview'
      break
    case '/validators':
    case '/validators/[status]':
      title = 'Validators'
      break
    case '/validator/[address]':
      title = 'Validator'
      subtitle = (
        <Copy
          value={address}
          title={<span className="text-slate-400 dark:text-slate-200 text-sm xl:text-base">
            <div>
              <span className="xl:hidden">
                {ellipse(address, 12, process.env.NEXT_PUBLIC_PREFIX_VALIDATOR)}
              </span>
              <span className="hidden xl:block">
                {ellipse(address, 16, process.env.NEXT_PUBLIC_PREFIX_VALIDATOR)}
              </span>
            </div>
          </span>}
          size={18}
        />
      )
      break
    case '/account/[address]':
      title = 'Account'
      subtitle = (
        <Copy
          value={address}
          title={<span className="text-slate-400 dark:text-slate-200 text-sm xl:text-base">
            <div>
              <span className="xl:hidden">
                {ellipse(address, 12, process.env.NEXT_PUBLIC_PREFIX_ACCOUNT)}
              </span>
              <span className="hidden xl:block">
                {ellipse(address, 16, process.env.NEXT_PUBLIC_PREFIX_ACCOUNT)}
              </span>
            </div>
          </span>}
          size={18}
        />
      )
      break
    case '/evm-votes':
      title = 'EVM votes'
      right = (
        <EVMVoteFilters />
      )
      break
    case '/participations':
      title = 'Participations'
      break
    case '/blocks':
      title = 'Latest Blocks'
      break
    case '/block/[height]':
      title = `Block: ${number_format(height, '0,0')}`
      subtitle = (
        <div className="flex items-center space-x-2">
          <Link href={`/block/${Number(height) - 1}`}>
            <a className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-lg p-1.5">
              <MdNavigateBefore size={20} />
            </a>
          </Link>
          <Link href={`/block/${Number(height) + 1}`}>
            <a className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-lg p-1.5">
              <MdNavigateNext size={20} />
            </a>
          </Link>
        </div>
      )
      break
    case '/transactions':
    case '/transactions/search':
      title = 'Transactions'
      subtitle = (
        <div className="flex items-center space-x-1">
          {[
            { title: 'Latest', path: '/transactions' },
            { title: 'Search', path: '/transactions/search' },
          ].map((r, i) => (
            <div
              key={i}
              onClick={() => router.push(r.path)}
              className={`${r.path === pathname ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800'} cursor-pointer rounded-lg py-1 px-2.5`}
            >
              <span className="font-semibold">
                {r.title}
              </span>
            </div>
          ))}
        </div>
      )
      right = pathname.endsWith('/search') && (
        <TransactionFilters />
      )
      break
    case '/tx/[tx]':
      title = 'Transaction'
      subtitle = (
        <div className="flex items-center text-sm xl:text-base space-x-2 xl:space-x-1">
          <div>
            <span className="xl:hidden">
              {ellipse(tx, 16)}
            </span>
            <span className="hidden xl:block">
              {ellipse(tx, 24)}
            </span>
          </div>
          <Copy
            value={tx}
            size={18}
          />
        </div>
      )
      break
    case '/address/[address]':
      title = (
        <EnsProfile
          address={address}
          fallback={<span>Address</span>}
        />
      )
      subtitle = (
        <Copy
          value={address}
          title={<span className="text-slate-400 dark:text-slate-200 text-sm xl:text-base">
            <div>
              <span className="xl:hidden">
                {ellipse(address, 12)}
              </span>
              <span className="hidden xl:block">
                {ellipse(address, 16)}
              </span>
            </div>
          </span>}
          size={18}
        />
      )
      break
    case '/transfers':
    case '/transfers/search':
      title = 'Cross-chain Transfers'
      subtitle = (
        <div className="flex items-center space-x-1">
          {[
            { title: 'Overview', path: '/transfers' },
            { title: 'Search', path: '/transfers/search' },
          ].map((r, i) => (
            <div
              key={i}
              onClick={() => router.push(r.path)}
              className={`${r.path === pathname ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800'} cursor-pointer rounded-lg py-1 px-2.5`}
            >
              <span className="font-semibold">
                {r.title}
              </span>
            </div>
          ))}
        </div>
      )
      right = pathname.endsWith('/search') && (
        <TransferFilters />
      )
      break
    case 'transfers/[tx]':
      title = 'Cross-chain Transfers'
      subtitle = (
        <div className="flex items-center text-sm xl:text-base space-x-2 xl:space-x-1">
          <div>
            <span className="xl:hidden">
              {ellipse(tx, 16)}
            </span>
            <span className="hidden xl:block">
              {ellipse(tx, 24)}
            </span>
          </div>
          <Copy
            value={tx}
            size={18}
          />
        </div>
      )
      break
    case '/gmp':
    case '/gmp/search':
      title = 'General Message Passing'
      subtitle = (
        <div className="flex items-center space-x-1">
          {[
            { title: 'Overview', path: '/gmp' },
            { title: 'Search', path: '/gmp/search' },
          ].map((r, i) => (
            <div
              key={i}
              onClick={() => router.push(r.path)}
              className={`${r.path === pathname ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800'} cursor-pointer rounded-lg py-1 px-2.5`}
            >
              <span className="font-semibold">
                {r.title}
              </span>
            </div>
          ))}
        </div>
      )
      right = pathname.endsWith('/search') && (
        <GMPFilters />
      )
      break
    case '/gmp/[tx]':
      title = 'General Message Passing'
      subtitle = (
        <div className="flex items-center text-sm xl:text-base space-x-2 xl:space-x-1">
          <div>
            <span className="xl:hidden">
              {ellipse(tx, 16)}
            </span>
            <span className="hidden xl:block">
              {ellipse(tx, 24)}
            </span>
          </div>
          <Copy
            value={tx}
            size={18}
          />
        </div>
      )
      break
    case '/batches':
      title = 'Batches'
      right = (
        <BatchFilters />
      )
      break
    case '/batch/[chain]/[id]':
      title = 'Batch'
      subtitle = (
        <div className="flex items-center text-sm xl:text-base space-x-2 xl:space-x-1">
          <div>
            <span className="xl:hidden">
              {ellipse(id, 16)}
            </span>
            <span className="hidden xl:block">
              {ellipse(id, 24)}
            </span>
          </div>
          <Copy
            value={tx}
            size={18}
          />
        </div>
      )
      break
    case '/assets':
      title = 'EVM assets'
      break
    case '/proposals':
      title = 'Proposals'
      break
    case '/proposal/[id]':
      title = `Proposal: ${number_format(id, '0,0')}`
      break
    default:
      break
  }

  const is_validator_path = ['/validator', '/participations', '/proposals'].findIndex(p => pathname?.includes(p)) > -1
  const is_block_path = ['/block'].findIndex(p => pathname?.includes(p)) > -1

  return (
    <div className="w-full overflow-x-auto flex items-center py-2 sm:py-3 px-2 sm:px-4">
      <div className="flex flex-col space-y-1">
        {title && (
          <div className="text-base font-bold">
            {title}
          </div>
        )}
        {subtitle && (
          <div className="text-slate-400 dark:text-slate-500 text-sm">
            {subtitle}
          </div>
        )}
      </div>
      {token_data && (
        <div className="bg-slate-100 dark:bg-slate-900 rounded-lg flex items-center space-x-1.5 ml-4 py-2 px-3">
          <div className="min-w-max flex items-center space-x-1.5">
            <span className="uppercase font-bold">
              {token_data.symbol}
            </span>
          </div>
          {typeof token_data.market_data?.current_price?.[currency] === 'number' ?
            <span className="font-mono font-semibold">
              {currency_symbol}{number_format(token_data.market_data.current_price[currency], '0,0.00000000')}
            </span>
            :
            <span>-</span>
          }
          {typeof token_data.market_data?.price_change_percentage_24h_in_currency?.[currency] === 'number' && (
            <span className={`text-${token_data.market_data.price_change_percentage_24h_in_currency[currency] < 0 ? 'red' : 'green'}-500 font-medium`}>
              {number_format(token_data.market_data.price_change_percentage_24h_in_currency[currency], '+0,0.000')}%
            </span>
          )}
        </div>
      )}
      <span className="sm:ml-auto" />
      {right ?
        <>
          <span className="ml-auto" />
          {right}
        </>
        :
        <>
          {status_data?.latest_block_height && (
            <Link href={`/block/${status_data.latest_block_height}`}>
              <a className="flex items-center text-blue-600 dark:text-white space-x-1.5 ml-4">
                <FiBox size={16} />
                <span className="font-bold">
                  {number_format(status_data.latest_block_height, '0,0')}
                </span>
              </a>
            </Link>
          )}
          {is_validator_path && (
            <>
              {chain_data?.staking_params && (
                <>
                  {chain_data.staking_params.max_validators && (
                    <Link href="/validators">
                      <a className="flex items-center text-blue-600 dark:text-white space-x-1.5 ml-4">
                        <div className="flex items-center space-x-1">
                          <span className="font-semibold">
                            Max
                          </span>
                          <BiServer size={14} />
                          :
                        </div>
                        <span className="font-bold">
                          {number_format(chain_data.staking_params.max_validators, '0,0')}
                        </span>
                      </a>
                    </Link>
                  )}
                  <div className="flex items-center space-x-1.5 ml-4">
                    <span className="whitespace-nowrap text-slate-400 dark:text-slate-600 font-semibold">
                      Unbonding:
                    </span>
                    {chain_data.staking_params.unbonding_time ?
                      <span className="font-bold">
                        {chain_data.staking_params.unbonding_time}
                      </span>
                      :
                      <span>
                        -
                      </span>
                    }
                  </div>
                </>
              )}
              {chain_data?.slashing_params && (
                <>
                  <div className="flex items-center space-x-1.5 ml-4">
                    <span className="whitespace-nowrap text-slate-400 dark:text-slate-600 font-semibold">
                      Max Missed:
                    </span>
                    {chain_data.slashing_params.signed_blocks_window && chain_data.slashing_params.min_signed_per_window ?
                      <span className="font-bold">
                        {number_format(Number(chain_data.slashing_params.signed_blocks_window) - (Number(chain_data.slashing_params.min_signed_per_window) * Number(chain_data.slashing_params.signed_blocks_window)), '0,0')}
                      </span>
                      :
                      <span>
                        -
                      </span>
                    }
                  </div>
                  <div className="flex items-center space-x-1.5 ml-4">
                    <span className="whitespace-nowrap text-slate-400 dark:text-slate-600 font-semibold">
                      Jail:
                    </span>
                    {chain_data.slashing_params.downtime_jail_duration ?
                      <span className="font-bold">
                        {chain_data.slashing_params.downtime_jail_duration}
                      </span>
                      :
                      <span>
                        -
                      </span>
                    }
                  </div>
                  <div className="flex items-center space-x-1.5 ml-4">
                    <span className="whitespace-nowrap text-slate-400 dark:text-slate-600 font-semibold">
                      x2 Sign:
                    </span>
                    {chain_data.slashing_params.slash_fraction_double_sign ?
                      <span className="font-bold">
                        {number_format(chain_data.slashing_params.slash_fraction_double_sign, '0,0.00000000')}
                      </span>
                      :
                      <span>
                        -
                      </span>
                    }
                  </div>
                </>
              )}
            </>
          )}
          {(is_validator_path || is_block_path) && (
            <>
              {!['/validator/[address]'].includes(pathname) && chain_data?.distribution_params && (
                <>
                  <div className="flex items-center space-x-1.5 ml-4">
                    <span className="whitespace-nowrap text-slate-400 dark:text-slate-600 font-semibold">
                      Proposer Reward:
                    </span>
                    {chain_data.distribution_params.base_proposer_reward ?
                      <div className="whitespace-nowrap space-x-1">
                        <span className="font-bold">
                          {number_format(Number(chain_data.distribution_params.base_proposer_reward) * 100, '0,0.00')}%
                        </span>
                        {!isNaN(chain_data.distribution_params.bonus_proposer_reward) && (
                          <span className="font-medium">
                            (+{number_format(Number(chain_data.distribution_params.bonus_proposer_reward) * 100, '0,0.00')}%)
                          </span>
                        )}
                      </div>
                      :
                      <span>
                        -
                      </span>
                    }
                  </div>
                  <div className="flex items-center space-x-1.5 ml-4">
                    <span className="whitespace-nowrap text-slate-400 dark:text-slate-600 font-semibold">
                      Community Tax:
                    </span>
                    {chain_data.distribution_params.community_tax ?
                      <span className="font-bold">
                        {number_format(Number(chain_data.distribution_params.community_tax) * 100, '0,0.00')}%
                      </span>
                      :
                      <span>
                        -
                      </span>
                    }
                  </div>
                </>
              )}
              <div className="flex items-center space-x-1.5 ml-4">
                <span className="whitespace-nowrap text-slate-400 dark:text-slate-600 font-semibold">
                  Proposals:
                </span>
                <Link href="/proposals">
                  <a className="text-blue-600 dark:text-white">
                    <HiOutlineExternalLink size={16} />
                  </a>
                </Link>
              </div>
            </>
          )}
        </>
      }
    </div>
  )
}