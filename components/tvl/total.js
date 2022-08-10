import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { ThreeDots } from 'react-loader-spinner'

import { currency_symbol } from '../../lib/object/currency'
import { number_format, loader_color } from '../../lib/utils'

export default () => {
  const { preferences, evm_chains, cosmos_chains, assets, tvl } = useSelector(state => ({ preferences: state.preferences, evm_chains: state.evm_chains, cosmos_chains: state.cosmos_chains, assets: state.assets, tvl: state.tvl }), shallowEqual)
  const { theme } = { ...preferences }
  const { evm_chains_data } = { ...evm_chains }
  const { cosmos_chains_data } = { ...cosmos_chains }
  const { assets_data } = { ...assets }
  const { tvl_data } = { ...tvl }

  const [data, setData] = useState(null)

  useEffect(() => {
    if (evm_chains_data && cosmos_chains_data && assets_data && Object.keys({ ...tvl_data }).length > 5) {
      setData(_.orderBy(
        Object.entries(tvl_data).map(([k, v]) => {
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
        ['value'], ['desc']
      ))
    }
  }, [evm_chains_data, cosmos_chains_data, assets_data, tvl_data])

  const value_on_evm = _.sumBy(data, 'value_on_evm')
  const value_on_cosmos = _.sumBy(data, 'value_on_cosmos')
  const value = _.sumBy(data, 'value')

  return (
    data ?
      <div className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto ml-2 py-0.5">
        <div className="bg-zinc-100 dark:bg-zinc-900 rounded-xl shadow dark:shadow-zinc-600 text-center p-2 sm:pt-3.5 sm:pb-2.5 sm:px-4">
          <div
            title={number_format(value_on_evm, `${currency_symbol}0,0.000000`)}
            className="uppercase text-base font-bold"
          >
            {currency_symbol}
            {number_format(value_on_evm, value_on_evm > 1000000 ? '0,0.00a' : value_on_evm > 10000 ? '0,0.00' : '0,0.000000')}
          </div>
          <div className="text-slate-400 dark:text-slate-500 text-2xs">
            on EVM
          </div>
        </div>
        <div className="bg-zinc-100 dark:bg-zinc-900 rounded-xl shadow dark:shadow-zinc-600 text-center p-2 sm:pt-3.5 sm:pb-2.5 sm:px-4">
          <div
            title={number_format(value_on_cosmos, `${currency_symbol}0,0.000000`)}
            className="uppercase text-base font-bold"
          >
            {currency_symbol}
            {number_format(value_on_cosmos, value_on_cosmos > 1000000 ? '0,0.00a' : value_on_cosmos > 10000 ? '0,0.00' : '0,0.000000')}
          </div>
          <div className="text-slate-400 dark:text-slate-500 text-2xs">
            on Cosmos
          </div>
        </div>
        <div className="bg-green-100 dark:bg-green-800 rounded-xl shadow dark:shadow-green-400 border-2 border-green-600 dark:border-green-400 text-center p-1.5 sm:pt-3 sm:pb-2 sm:px-3">
          <div
            title={number_format(value, `${currency_symbol}0,0.000000`)}
            className="uppercase text-green-600 dark:text-green-400 text-lg font-extrabold"
          >
            {currency_symbol}
            {number_format(value, value > 1000000 ? '0,0.00a' : value > 10000 ? '0,0.00' : '0,0.000000')}
          </div>
          <div className="text-slate-500 dark:text-slate-200 text-xs font-semibold">
            Total
          </div>
        </div>
      </div>
      :
      <div className="h-full flex items-center justify-end">
        <ThreeDots
          color={loader_color(theme)}
          width="40"
          height="40"
        />
      </div>
  )
}