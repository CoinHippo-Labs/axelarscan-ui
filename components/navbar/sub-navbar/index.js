import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSelector, shallowEqual } from 'react-redux'
import moment from 'moment'
import { IoMdCube } from 'react-icons/io'
import { FaServer } from 'react-icons/fa'
import { RiFilePaperFill } from 'react-icons/ri'
import { MdNavigateBefore, MdNavigateNext } from 'react-icons/md'

import EVMVoteFilters from '../../evm-votes/filters'
import TransactionFilters from '../../transactions/filters'
import TransferFilters from '../../transfers/filters'
import SentFilters from '../../sents/filters'
import GMPFilters from '../../gmps/filters'
import TotalTVL from '../../tvl/total'
import BatchFilters from '../../batches/filters'
import Copy from '../../copy'
import EnsProfile from '../../ens-profile'
import Image from '../../image'
import { number_format, ellipse } from '../../../lib/utils'

export default () => {
  const {
    _status,
    _chain,
  } = useSelector(state =>
    (
      {
        _status: state.status,
        _chain: state.chain,
      }
    ),
    shallowEqual,
  )
  const {
    status_data,
  } = { ..._status }
  const {
    chain_data,
  } = { ..._chain }

  const router = useRouter()
  const {
    pathname,
    query,
  } = { ...router }
  const {
    status,
    height,
    address,
    tx,
    id,
  } = { ...query }

  const {
    latest_block_height,
  } = { ...status_data }
  const {
    staking_params,
    slashing_params,
  } = { ...chain_data }
  const {
    max_validators,
    unbonding_time,
  } = { ...staking_params }
  const {
    signed_blocks_window,
    min_signed_per_window,
    downtime_jail_duration,
  } = { ...slashing_params }

  let title,
    subtitle,
    right

  switch (pathname) {
    case '/':
      title = 'Axelar Network Status'
      right = (
        <a
          href={process.env.NEXT_PUBLIC_WEBSITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 font-light"
        >
          Learn more about Axelar
        </a>
      )
      break
    case '/validators':
    case '/validators/[status]':
    case '/validators/tier':
      title = 'Validators'
      break
    case '/validator/[address]':
      title = 'Validator'
      subtitle = (
        <Copy
          value={address}
          title={<div className="text-slate-400 dark:text-slate-600 text-sm">
            <span className="xl:hidden">
              {ellipse(
                address,
                12,
                process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
              )}
            </span>
            <span className="hidden xl:block">
              {ellipse(
                address,
                16,
                process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
              )}
            </span>
          </div>}
        />
      )
      break
    case '/account/[address]':
      title = 'Account'
      subtitle = (
        <Copy
          value={address}
          title={<div className="text-slate-400 dark:text-slate-600 text-sm">
            <span className="xl:hidden">
              {ellipse(
                address,
                12,
                process.env.NEXT_PUBLIC_PREFIX_ACCOUNT,
              )}
            </span>
            <span className="hidden xl:block">
              {ellipse(
                address,
                16,
                process.env.NEXT_PUBLIC_PREFIX_ACCOUNT,
              )}
            </span>
          </div>}
        />
      )
      break
    case '/evm-votes':
      title = 'EVM votes'
      right = (
        <EVMVoteFilters />
      )
      break
    case '/blocks':
      title = 'Latest Blocks'
      break
    case '/block/[height]':
      const _height = Number(height)

      title = `Block: ${number_format(
        _height,
        '0,0',
      )}`
      subtitle = (
        <div className="flex items-center space-x-2.5">
          <Link href={`/block/${_height - 1}`}>
            <a
              title={number_format(
                _height - 1,
                '0,0',
              )}
              className="bg-slate-100 hover:bg-zinc-100 dark:bg-slate-900 dark:hover:bg-zinc-900 shadow rounded py-1.5 px-2"
            >
              <MdNavigateBefore
                size={20}
              />
            </a>
          </Link>
          <Link href={`/block/${_height + 1}`}>
            <a
              title={number_format(
                _height + 1,
                '0,0',
              )}
              className="bg-slate-100 hover:bg-zinc-100 dark:bg-slate-900 dark:hover:bg-zinc-900 shadow dark:shadow-slate-700 rounded py-1.5 px-2"
            >
              <MdNavigateNext
                size={20}
              />
            </a>
          </Link>
        </div>
      )
      break
    case '/transactions':
    case '/transactions/search':
      title = 'Transactions'
      subtitle = (
        <div className="flex flex-wrap items-center">
          {[
            {
              title: 'Latest',
              path: '/transactions',
            },
            {
              title: 'Search',
              path: '/transactions/search',
            },
          ]
          .map((r, i) => {
            const {
              title,
              path,
            } = { ...r }

            const selected = path === pathname

            return (
              <div
                key={i}
                onClick={() => router.push(path)}
                className={`${selected ? 'bg-blue-400 dark:bg-blue-600 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 hover:bg-opacity-50 dark:hover:bg-opacity-50 text-slate-400 hover:text-blue-400 dark:text-slate-700 dark:hover:text-blue-600 hover:font-semibold'} shadow rounded-lg cursor-pointer mb-1 sm:mb-0 mr-1.5 py-1 px-2`}
              >
                <span className="whitespace-nowrap">
                  {title}
                </span>
              </div>
            )
          })}
        </div>
      )
      right = pathname.endsWith('/search') && (
        <TransactionFilters />
      )
      break
    case '/tx/[tx]':
      title = 'Transaction'
      subtitle = (
        <div className="flex items-center text-sm space-x-2">
          <div>
            <span className="xl:hidden">
              {ellipse(
                tx,
                16,
              )}
            </span>
            <span className="hidden xl:block">
              {ellipse(
                tx,
                24,
              )}
            </span>
          </div>
          <Copy
            value={tx}
          />
        </div>
      )
      break
    case '/participations':
      title = 'Participations'
      break
    case '/address/[address]':
      title = (
        <EnsProfile
          address={address}
          fallback={<span>
            Address
          </span>}
        />
      )
      subtitle = (
        <Copy
          value={address}
          title={<div className="text-slate-400 dark:text-slate-600 text-sm">
            <span className="xl:hidden">
              {ellipse(
                address,
                12,
              )}
            </span>
            <span className="hidden xl:block">
              {ellipse(
                address,
                16,
              )}
            </span>
          </div>}
        />
      )
      break
    case '/sent':
    case '/sent/search':
      right = pathname.endsWith('/search') && (
        <SentFilters />
      )
    case '/transfers':
    case '/transfers/search':
      title = 'Cross-chain Transfers'
      subtitle = (
        <div className="flex flex-wrap items-center">
          {[
            {
              title: 'Overview',
              path: '/transfers',
            },
            {
              title: pathname.endsWith('/search') ?
                'via Deposit Address' :
                'Search',
              path: '/transfers/search',
            },
            process.env.NEXT_PUBLIC_SUPPORT_TOKEN_SENT === 'true' &&
            pathname.endsWith('/search') && (
              {
                title: 'via sendToken',
                path: '/sent/search',
              }
            ),
          ]
          .filter(r => r)
          .map((r, i) => {
            const {
              title,
              path,
            } = { ...r }

            const selected = path === pathname

            return (
              <div
                key={i}
                onClick={() => router.push(path)}
                className={`${selected ? 'bg-blue-400 dark:bg-blue-600 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 hover:bg-opacity-50 dark:hover:bg-opacity-50 text-slate-400 hover:text-blue-400 dark:text-slate-700 dark:hover:text-blue-600 hover:font-semibold'} shadow rounded-lg cursor-pointer mb-1 sm:mb-0 mr-1.5 py-1 px-2`}
              >
                <span className="whitespace-nowrap">
                  {title}
                </span>
              </div>
            )
          })}
        </div>
      )
      right = right ||
        (
          pathname.endsWith('/search') && (
            <TransferFilters />
          )
        )
      break
    case '/transfer/[tx]':
      title = 'Cross-chain Transfer'
      subtitle = (
        <div className="flex items-center text-sm space-x-2">
          <div>
            <span className="xl:hidden">
              {ellipse(
                tx,
                16,
              )}
            </span>
            <span className="hidden xl:block">
              {ellipse(
                tx,
                24,
              )}
            </span>
          </div>
          <Copy
            value={tx}
          />
        </div>
      )
      break
    case '/transfer':
      title = 'Cross-chain Transfer'
      break
    case '/tvl':
      title = 'TVL'
      subtitle = 'Total assets on Axelar Network'
      right = (
        <TotalTVL />
      )
      break
    case '/sent/[tx]':
      title = 'Send Token'
      subtitle = (
        <div className="flex items-center text-sm space-x-2">
          <div>
            <span className="xl:hidden">
              {ellipse(
                tx,
                16,
              )}
            </span>
            <span className="hidden xl:block">
              {ellipse(
                tx,
                24,
              )}
            </span>
          </div>
          <Copy
            value={tx}
          />
        </div>
      )
      break
    case '/gmp':
    case '/gmp/search':
    case '/gmp/stats':
      title = 'General Message Passing'
      subtitle = (
        <div className="flex flex-wrap items-center">
          {[
            /*{
              title: 'Overview',
              path: '/gmp',
            },*/
            {
              title: 'Search',
              path: '/gmp/search',
            },
            {
              title: 'Statistics',
              path: `/gmp/stats?fromTime=${moment().subtract(7, 'days').valueOf()}`,
            },
          ]
          .map((r, i) => {
            const {
              title,
              path,
            } = { ...r }

            const selected = (
              path.includes('?') ?
                path.substring(
                  0,
                  path.indexOf('?'),
                ) :
                path
            ) === pathname

            return (
              <div
                key={i}
                onClick={() => router.push(path)}
                className={`${selected ? 'bg-blue-400 dark:bg-blue-600 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 hover:bg-opacity-50 dark:hover:bg-opacity-50 text-slate-400 hover:text-blue-400 dark:text-slate-700 dark:hover:text-blue-600 hover:font-semibold'} shadow rounded-lg cursor-pointer mb-1 sm:mb-0 mr-1.5 py-1 px-2`}
              >
                <span className="whitespace-nowrap">
                  {title}
                </span>
              </div>
            )
          })}
        </div>
      )
      right = [
        '/gmp/search',
        '/gmp/stats',
      ].includes(pathname) && (
        <GMPFilters />
      )
      break
    case '/gmp/[tx]':
      title = 'General Message Passing'
      subtitle = (
        <div className="flex items-center text-sm space-x-2">
          <div>
            <span className="xl:hidden">
              {ellipse(
                tx,
                16,
              )}
            </span>
            <span className="hidden xl:block">
              {ellipse(
                tx,
                24,
              )}
            </span>
          </div>
          <Copy
            value={tx}
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
        <div className="flex items-center text-sm space-x-2">
          <div>
            <span className="xl:hidden">
              {ellipse(
                id,
                16,
              )}
            </span>
            <span className="hidden xl:block">
              {ellipse(
                id,
                24,
              )}
            </span>
          </div>
          <Copy
            value={id}
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
      title = `Proposal: ${number_format(
        id,
        '0,0',
      )}`
      break
    default:
      break
  }

  const is_validator_path = [
    '/validator',
    '/participations',
    '/proposals',
  ].findIndex(p => pathname?.startsWith(p)) > -1
  const is_block_path = [
    '/block',
  ].findIndex(p => pathname?.startsWith(p)) > -1
  const is_assets_path = [
    '/transfers',
    '/tvl',
    '/assets',
  ].findIndex(p => pathname?.startsWith(p)) > -1

  return (
    <div className="w-full flex flex-col sm:flex-row sm:items-center py-2 sm:pt-4 px-2 sm:px-4">
      <div className="flex flex-col space-y-1">
        {title && (
          <h1 className="uppercase tracking-widest text-black dark:text-white text-sm sm:text-base font-medium">
            {title}
          </h1>
        )}
        {subtitle && (
          <h2 className="text-slate-400 dark:text-slate-600 text-sm">
            {subtitle}
          </h2>
        )}
      </div>
      <span className="sm:ml-auto" />
      {right ?
        <>
          <span className="mt-0.5 sm:mt-0 ml-auto" />
          {right}
        </> :
        <div className="overflow-x-auto flex items-center">
          {
            !isNaN(latest_block_height) &&
            !is_assets_path &&
            (
              <Link href={`/block/${latest_block_height}`}>
                <a className="flex items-center text-blue-400 dark:text-blue-500 space-x-1.5 ml-0 sm:ml-4 mr-4 sm:mr-0">
                  <IoMdCube
                    size={18}
                  />
                  <span className="font-normal">
                    {number_format(
                      latest_block_height,
                      '0,0',
                    )}
                  </span>
                </a>
              </Link>
            )
          }
          {
            is_validator_path &&
            (
              <>
                {staking_params && (
                  <>
                    {!isNaN(max_validators) && (
                      <Link href="/validators">
                        <a className="flex items-center text-blue-400 dark:text-blue-500 space-x-2 ml-0 sm:ml-4 mr-4 sm:mr-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-normal">
                              Max
                            </span>
                            <FaServer
                              size={16}
                            />
                          </div>
                          <span className="font-normal">
                            {number_format(
                              max_validators,
                              '0,0',
                            )}
                          </span>
                        </a>
                      </Link>
                    )}
                    {unbonding_time && (
                      <div className="flex items-center space-x-1.5 ml-0 sm:ml-4 mr-4 sm:mr-0">
                        <span className="whitespace-nowrap text-slate-400 dark:text-slate-600 font-normal">
                          Unbond
                        </span>
                        <span className="font-normal">
                          {unbonding_time}
                        </span>
                      </div>
                    )}
                  </>
                )}
                {slashing_params && (
                  <>
                    {
                      !isNaN(signed_blocks_window) &&
                      !isNaN(min_signed_per_window) &&
                      (
                        <div className="flex items-center space-x-1.5 ml-0 sm:ml-4 mr-4 sm:mr-0">
                          <span className="whitespace-nowrap text-slate-400 dark:text-slate-600 font-normal">
                            Max Missed
                          </span>
                          <span className="font-normal">
                            {number_format(
                              Number(signed_blocks_window) * (1 - Number(min_signed_per_window)),
                              '0,0',
                            )}
                          </span>
                        </div>
                      )
                    }
                    {downtime_jail_duration && (
                      <div className="flex items-center space-x-1.5 ml-0 sm:ml-4 mr-4 sm:mr-0">
                        <span className="whitespace-nowrap text-slate-400 dark:text-slate-600 font-normal">
                          Jail
                        </span>
                        <span className="font-normal">
                          {downtime_jail_duration}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </>
            )
          }
          {
            (
              is_validator_path ||
              is_block_path
            ) &&
            (
              <Link href="/proposals">
                <a className="flex items-center text-blue-400 dark:text-blue-500 space-x-1.5 ml-0 sm:ml-4 mr-4 sm:mr-0">
                  <RiFilePaperFill
                    size={18}
                  />
                  <span className="font-normal">
                    Proposals
                  </span>
                </a>
              </Link>
            )
          }
        </div>
      }
    </div>
  )
}