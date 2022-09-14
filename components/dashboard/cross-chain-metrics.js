import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { ProgressBar } from 'react-loader-spinner'

import { currency_symbol } from '../../lib/object/currency'
import { number_format, loader_color } from '../../lib/utils'

export default ({
  transfers,
  gmps,
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

  const metricClassName = 'bg-white dark:bg-zinc-900 shadow shadow-zinc-200 dark:shadow-zinc-700 rounded py-4 xl:py-3 px-5 xl:px-4'
  const titleClassName = 'text-2xl lg:text-xl xl:text-2xl font-semibold space-x-1'
  const subtitleClassName = 'text-slate-500 dark:text-slate-200 text-sm font-normal'

  const {
    num_chains,
  } = { ...transfers }
  const {
    num_contracts,
  } = { ...gmps }

  const num_txs = transfers && gmps ?
    _.sumBy(
      _.concat(
        transfers,
        gmps,
      ),
      'num_txs',
    ) :
    undefined

  const volume = transfers && gmps ?
    _.sumBy(
      _.concat(
        transfers,
        gmps,
      ),
      'volume',
    ) :
    undefined

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <Link href="/transfers">
        <a className={`order-1 sm:order-2 md:order-1 ${metricClassName}`}>
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
                color={loader_color(theme)}
                width="32"
                height="32"
              />
            }
          </div>
          <span className={subtitleClassName}>
            total transfer token volume
          </span>
        </a>
      </Link>
      <div className={`order-2 sm:order-1 md:order-2 sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 ${metricClassName}`}>
        <div className="sm:border-r border-zinc-200 dark:border-zinc-700">
          <div className={titleClassName}>
            {!isNaN(num_txs) ?
              number_format(
                num_txs,
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
            total transfers
          </span>
        </div>
        <Link href="/transfers">
          <a>
            <div className={titleClassName}>
              {!isNaN(transfers?.num_txs) ?
                number_format(
                  transfers.num_txs,
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
              token send
            </span>
          </a>
        </Link>
        <Link href="/gmp">
          <a>
            <div className={titleClassName}>
              {!isNaN(gmps?.num_txs) ?
                number_format(
                  gmps.num_txs,
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
              GMP calls
            </span>
          </a>
        </Link>
      </div>
      <Link href="/transfers">
        <a className={`order-3 ${metricClassName}`}>
          <div className={titleClassName}>
            {!isNaN(num_chains) ?
              number_format(
                num_chains,
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
            # connected chains
          </span>
        </a>
      </Link>
      <Link href="/gmp/stats">
        <a className={`order-4 ${metricClassName}`}>
          <div className={titleClassName}>
            {!isNaN(num_contracts) ?
              number_format(
                num_contracts,
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
            # of deployed contract
          </span>
        </a>
      </Link>
    </div>
  )
}