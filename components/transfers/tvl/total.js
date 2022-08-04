import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { TailSpin } from 'react-loader-spinner'

import Image from '../../image'
import { currency_symbol } from '../../../lib/object/currency'
import { number_format, equals_ignore_case, loader_color } from '../../../lib/utils'

export default () => {
  const { preferences, evm_chains, assets, tvl } = useSelector(state => ({ preferences: state.preferences, evm_chains: state.evm_chains, assets: state.assets, tvl: state.tvl }), shallowEqual)
  const { theme } = { ...preferences }
  const { evm_chains_data } = { ...evm_chains }
  const { assets_data } = { ...assets }
  const { tvl_data } = { ...tvl }

  const [data, setData] = useState(null)

  useEffect(() => {
    if (evm_chains_data && assets_data && Object.keys({ ...tvl_data }).length > 10) {
      setData(Object.entries(tvl_data).map(([k, v]) => {
        const chain = _.head(k.split('_'))
        const asset = k.replace(`${chain}_`, '')
        const chain_data = evm_chains_data.find(c => equals_ignore_case(c?.id, chain))
        const asset_data = assets_data.find(a => equals_ignore_case(a?.id, asset))
        const { price } = { ...asset_data }
        const { supply, gateway_balance, total } = { ...v }
        return {
          chain,
          asset,
          chain_data,
          asset_data,
          amount: {
            supply,
            gateway_balance,
            total,
          },
          value: typeof price === 'number' ? {
            supply: typeof supply === 'number' ?
              supply * price : null,
            gateway_balance: typeof gateway_balance === 'number' ?
              gateway_balance * price : null,
            total: typeof total === 'number' ?
              total * price : null,
          } : null,
        }
      }).map(d => {
        const { asset_data, amount, value } = { ...d }
        return {
          ...d,
          amount: {
            ...amount,
            total: asset_data?.contracts?.findIndex(c => c?.is_native) > -1 ?
              amount?.gateway_balance :
              amount?.total,
          },
          value: {
            ...value,
            total: asset_data?.contracts?.findIndex(c => c?.is_native) > -1 ?
              value?.gateway_balance :
              value?.total,
          },
        }
      }))
    }
  }, [evm_chains_data, assets_data, tvl_data])

  const total = _.sumBy(data, 'value.total')
  const gateway_balance = _.sumBy(data, 'value.gateway_balance')
  const supply = _.sumBy(data, 'value.supply')

  return (
    <div className="h-80 bg-white dark:bg-black shadow dark:shadow-slate-600 rounded-lg space-y-0.5 p-5">
      {data ?
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl uppercase text-4xl font-extrabold text-center py-20">
            <div className="py-2">
              {currency_symbol}
              {number_format(total, total > 50000000 ? '0,0.00a' : total > 10000000 ? '0,0' : '0,0.00')}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between space-x-2">
              <span className="text-slate-400 dark:text-slate-600 font-semibold">
                Gateway Balance:
              </span>
              <span
                title={number_format(gateway_balance, '0,0.000')}
                className="uppercase font-bold"
              >
                {currency_symbol}
                {number_format(gateway_balance, gateway_balance > 50000000 ? '0,0.00a' : gateway_balance > 10000000 ? '0,0' : '0,0.00')}
              </span>
            </div>
            <div className="flex items-center justify-between space-x-2">
              <span className="text-slate-400 dark:text-slate-600 font-semibold">
                Axelar Wrapped Supply:
              </span>
              <span
                title={number_format(supply, '0,0.000')}
                className="uppercase font-bold"
              >
                {currency_symbol}
                {number_format(supply, supply > 50000000 ? '0,0.00a' : supply > 10000000 ? '0,0' : '0,0.00')}
              </span>
            </div>
          </div>
        </div>
        :
        <div className="h-full flex items-center justify-center">
          <TailSpin color={loader_color(theme)} width="40" height="40" strokeWidth="8" />
        </div>
      }
    </div>
  )
}