import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { ColorRing } from 'react-loader-spinner'

import { native_asset_id } from '../../lib/object/asset'
import { currency_symbol } from '../../lib/object/currency'
import { number_format, loader_color } from '../../lib/utils'

export default () => {
  const {
    preferences,
    evm_chains,
    cosmos_chains,
    assets,
    tvl,
  } = useSelector(
    state => (
      { preferences: state.preferences,
        evm_chains: state.evm_chains,
        cosmos_chains: state.cosmos_chains,
        assets: state.assets,
        tvl: state.tvl,
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
  const {
    tvl_data,
  } = { ...tvl }

  const [data, setData] = useState(null)

  useEffect(() => {
    if (evm_chains_data && cosmos_chains_data && assets_data && Object.keys({ ...tvl_data }).length > 5) {
      setData(
        _.orderBy(
          Object.entries(tvl_data)
            .map(([k, v]) => {
              const {
                total_on_evm,
                total_on_cosmos,
                total,
              } = { ...v }
              let {
                price,
              } = { ...v }

              price = typeof price === 'number' ? price : -1

              return {
                ...v,
                value_on_evm: price * (total_on_evm || 0),
                value_on_cosmos: price * (total_on_cosmos || 0),
                value: price * (total || 0),
              }
            }),
          ['value'],
          ['desc'],
        )
      )
    }
  }, [evm_chains_data, cosmos_chains_data, assets_data, tvl_data])

  const value_on_evm =  _.sumBy((data || []).filter(d => d?.value_on_evm > 0 && ![].includes(d?.asset)), 'value_on_evm')
  const value_on_cosmos = _.sumBy((data || []).filter(d => d?.value_on_cosmos > 0 && ![].includes(d?.asset)), 'value_on_cosmos')
  const value = _.sumBy((data || []).filter(d => d?.value > 0 && ![].includes(d?.asset)), 'value')

  const staging = process.env.NEXT_PUBLIC_SITE_URL?.includes('staging')

  return (
    data?.length >= (assets_data || []).filter(a => a && !a.no_tvl && (!a.is_staging || staging)).length ?
      <div className="overflow-x-auto flex items-center space-x-2 sm:space-x-4 sm:ml-2 py-0.5">
        <div className="bg-zinc-100 dark:bg-zinc-900 rounded-xl shadow dark:shadow-zinc-600 text-center p-2 sm:pt-3.5 sm:pb-2.5 sm:px-4">
          <div
            title={`${currency_symbol}${number_format(value_on_evm, '0,0.000')}`.toUpperCase()}
            className="uppercase text-base font-bold"
          >
            {currency_symbol}
            {number_format(value_on_evm, value_on_evm > 1000000 ? '0,0.0a' : value_on_evm > 100000 ? '0,0.0' : '0,0.00')}
          </div>
          <div className="text-slate-400 dark:text-slate-500 text-2xs font-medium">
            to EVM
          </div>
        </div>
        <div className="bg-zinc-100 dark:bg-zinc-900 rounded-xl shadow dark:shadow-zinc-600 text-center p-2 sm:pt-3.5 sm:pb-2.5 sm:px-4">
          <div
            title={`${currency_symbol}${number_format(value_on_cosmos, '0,0.000')}`.toUpperCase()}
            className="uppercase text-base font-bold"
          >
            {currency_symbol}
            {number_format(value_on_cosmos, value_on_cosmos > 1000000 ? '0,0.0a' : value_on_cosmos > 100000 ? '0,0.0' : '0,0.00')}
          </div>
          <div className="text-slate-400 dark:text-slate-500 text-2xs font-medium">
            to Cosmos
          </div>
        </div>
        <div className="bg-green-100 dark:bg-green-900 dark:bg-opacity-50 rounded-xl shadow dark:shadow-green-500 border-2 border-green-600 dark:border-green-500 text-center p-1.5 sm:pt-2.5 sm:pb-2.5 sm:px-3">
          <div
            title={`${currency_symbol}${number_format(value, '0,0.000')}`.toUpperCase()}
            className="uppercase text-green-600 dark:text-green-500 text-lg font-extrabold"
          >
            {currency_symbol}
            {number_format(value, value > 1000000 ? '0,0.0a' : value > 100000 ? '0,0.0' : '0,0.00')}
          </div>
          <div className="text-green-600 dark:text-green-500 text-xs font-semibold">
            Total
          </div>
        </div>
      </div> :
      <div className="sm:h-full flex items-center sm:justify-end">
        <ColorRing
          color={loader_color(theme)}
          width="32"
          height="32"
        />
      </div>
  )
}