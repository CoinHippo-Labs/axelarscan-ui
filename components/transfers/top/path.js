import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { ProgressBar } from 'react-loader-spinner'
import { MdChevronLeft, MdChevronRight } from 'react-icons/md'

import Image from '../../image'
import { getChain } from '../../../lib/object/chain'
import { getAsset } from '../../../lib/object/asset'
import { currency_symbol } from '../../../lib/object/currency'
import { number_format, loader_color } from '../../../lib/utils'

export default (
  {
    title = '',
    description = '',
    topData,
    n = 5,
    by = 'num_txs',
    num_days = 30,
    filters,      
  },
) => {
  const {
    preferences,
    evm_chains,
    cosmos_chains,
    assets,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        evm_chains: state.evm_chains,
        cosmos_chains: state.cosmos_chains,
        assets: state.assets,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    evm_chains_data,
  } = { ...evm_chains }
  const {
    cosmos_chains_data,
  } = { ...cosmos_chains }
  const {
    assets_data,
  } = { ...assets }

  const router = useRouter()
  const {
    pathname,
  } = { ...router }

  const [data, setData] = useState(null)

  useEffect(
    () => {
      if (
        topData &&
        evm_chains_data &&
        cosmos_chains_data &&
        assets_data
      ) {
        const {
          data,
        } = { ...topData }

        const chains_data =
          _.concat(
            evm_chains_data,
            cosmos_chains_data,
          )

        setData(
          data
            .map((d, i) => {
              const {
                source_chain,
                destination_chain,
                asset,
              } = { ...d }

              const source_chain_data =
                getChain(
                  source_chain,
                  chains_data,
                )

              const destination_chain_data =
                getChain(
                  destination_chain,
                  chains_data,
                )

              const asset_data =
                getAsset(
                  asset,
                  assets_data,
                )

              return {
                ...d,
                source_chain_data,
                destination_chain_data,
                asset_data,
              }
            })
        )
      }
    },
    [topData, evm_chains_data, cosmos_chains_data, assets_data],
  )

  const {
    fromTime,
    toTime,
  } = { ...filters }

  const _data =
    _.slice(
      _.orderBy(
        data,
        [by],
        ['desc'],
      ),
      0,
      n,
    )

  return (
    <div className="bg-white dark:bg-slate-900 rounded space-y-2 pt-4">
      <div className="flex items-center justify-between px-4">
        <div className="flex flex-col space-y-0.5">
          <span className="font-semibold">
            {title}
          </span>
          <span className="text-slate-400 dark:text-slate-500 text-xs">
            {description}
          </span>
        </div>
      </div>
      <div className="w-full h-52">
        {data ?
          <div className="flex flex-col">
            {
              _data
                .map((d, i) => (
                  <Link
                    key={i}
                    href={
                      `${pathname}/search?sourceChain=${d?.source_chain}&destinationChain=${d?.destination_chain}&fromTime=${
                        (
                          fromTime ?
                            moment(fromTime * 1000) :
                            moment()
                              .subtract(
                                num_days,
                                'days',
                              )
                        )
                        .valueOf()
                      }&toTime=${
                        (
                          toTime ?
                            moment(toTime * 1000) :
                            moment()
                              .add(
                                1,
                                'days',
                              )
                        )
                        .valueOf()
                      }&sortBy=value`
                    }
                  >
                    <a className="hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-base font-semibold hover:font-bold space-x-5 py-2 px-4">
                      <div className="flex items-center space-x-2">
                        <Image
                          src={d?.source_chain_data?.image}
                          title={d?.source_chain_data?.name}
                          className="w-6 h-6 rounded-full"
                        />
                        <div className="flex items-center">
                          <MdChevronLeft
                            size={18}
                          />
                          <Image
                            src={d?.asset_data?.image}
                            title={d?.asset_data?.name}
                            className="w-5 h-5 rounded-full"
                          />
                          <MdChevronRight
                            size={18}
                          />
                        </div>
                        <Image
                          src={d?.destination_chain_data?.image}
                          title={d?.destination_chain_data?.name}
                          className="w-6 h-6 rounded-full"
                        />
                      </div>
                      <span className="uppercase">
                        {by === 'volume' ?
                          `${currency_symbol}${
                            number_format(
                              d?.volume,
                              d?.volume > 1000000 ?
                                '0,0.00a' :
                                d?.volume > 100000 ?
                                  '0,0' :
                                  '0,0.00'
                            )
                          }` :
                          number_format(
                            d?.num_txs,
                            '0,0',
                          )
                        }
                      </span>
                    </a>
                  </Link>
                ))
            }
          </div> :
          <div className="w-full h-4/5 flex items-center justify-center">
            <ProgressBar
              borderColor={loader_color(theme)}
              width="36"
              height="36"
            />
          </div>
        }
      </div>
    </div>
  )
}