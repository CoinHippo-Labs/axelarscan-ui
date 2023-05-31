import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { ProgressBar } from 'react-loader-spinner'

import { currency_symbol } from '../../lib/object/currency'
import { number_format, loader_color } from '../../lib/utils'

export default (
  {
    transfers,
    gmps,
  },
) => {
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

  const metricClassName = 'bg-white dark:bg-zinc-900 shadow shadow-zinc-200 dark:shadow-zinc-700 rounded py-4 xl:py-6 px-5'
  const titleClassName = 'uppercase text-3xl lg:text-xl xl:text-3xl font-semibold space-x-1'
  const subtitleClassName = 'text-slate-500 dark:text-slate-200 text-base font-normal ml-1 lg:ml-0.5 xl:ml-1'

  const {
    num_chains,
  } = { ...transfers }
  const {
    num_contracts,
  } = { ...gmps }

  const num_txs =
    transfers &&
    gmps ?
      _.sumBy(
        _.concat(
          transfers,
          gmps,
        ),
        'num_txs',
      ) :
      undefined

  const volume =
    transfers &&
    gmps ?
      _.sumBy(
        _.concat(
          transfers,
          gmps,
        ),
        'volume',
      ) :
      undefined

  return (
    <div className="flex flex-col space-y-4">
      <div className={`space-y-1 ${metricClassName}`}>
        <div className={titleClassName}>
          {
            !isNaN(num_txs) ?
              number_format(
                num_txs,
                '0,0',
              ) :
              <ProgressBar
                borderColor={loader_color(theme)}
                width="32"
                height="32"
              />
          }
        </div>
        <span className={subtitleClassName}>
          total transactions
        </span>
      </div>
      <div className={`grid grid-cols-2 sm:grid-cols-2 gap-3 ${metricClassName}`}>
        <Link href="/transfers">
          <a className="sm:border-r border-zinc-200 dark:border-zinc-700 space-y-1">
            <div className={titleClassName}>
              {
                !isNaN(transfers?.num_txs) ?
                  number_format(
                    transfers.num_txs,
                    '0,0',
                  ) :
                  <ProgressBar
                    borderColor={loader_color(theme)}
                    width="32"
                    height="32"
                  />
              }
            </div>
            <span className={subtitleClassName}>
              asset transfers
            </span>
          </a>
        </Link>
        <Link href="/gmp">
          <a className="space-y-1">
            <div className={titleClassName}>
              {
                !isNaN(gmps?.num_txs) ?
                  number_format(
                    gmps.num_txs,
                    '0,0',
                  ) :
                  <ProgressBar
                    borderColor={loader_color(theme)}
                    width="32"
                    height="32"
                  />
              }
            </div>
            <span className={subtitleClassName}>
              GMP calls
            </span>
          </a>
        </Link>
      </div>
      <Link href="/transfers">
        <a className={`space-y-1 ${metricClassName}`}>
          <div className={titleClassName}>
            {!isNaN(volume) ?
              <span>
                {currency_symbol}
                {number_format(
                  volume,
                  volume > 5000000000 ?
                    '0,0.00a' :
                    volume > 1000000000 ?
                      '0,0' :
                      '0,0.00',
                )}
              </span> :
              <ProgressBar
                borderColor={loader_color(theme)}
                width="32"
                height="32"
              />
            }
          </div>
          <span className={subtitleClassName}>
            total token transfer volume
          </span>
        </a>
      </Link>
      <Link href="/transfers">
        <a className={`space-y-1 ${metricClassName}`}>
          <div className={titleClassName}>
            {!isNaN(num_chains) ?
              number_format(
                num_chains,
                '0,0',
              ) :
              <ProgressBar
                borderColor={loader_color(theme)}
                width="32"
                height="32"
              />
            }
          </div>
          <span className={subtitleClassName}>
            # of connected chains
          </span>
        </a>
      </Link>
      <Link href="/gmp/stats">
        <a className={`space-y-1 ${metricClassName}`}>
          <div className={titleClassName}>
            {!isNaN(num_contracts) ?
              number_format(
                num_contracts,
                '0,0',
              ) :
              <ProgressBar
                borderColor={loader_color(theme)}
                width="32"
                height="32"
              />
            }
          </div>
          <span className={subtitleClassName}>
            # of interchain contracts
          </span>
        </a>
      </Link>
    </div>
  )
}