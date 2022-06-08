import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { TailSpin, ThreeDots } from 'react-loader-spinner'

import Datatable from '../../datatable'
import Image from '../../image'
import { chainName } from '../../../lib/object/chain'
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
    if (evm_chains_data && assets_data && Object.keys({ ...tvl_data }).length > 5) {
      setData(_.orderBy(
        Object.entries(_.groupBy(
          Object.entries(tvl_data).map(([k, v]) => {
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
          }),
          'asset'
        )).map(([k, v]) => {
          return {
            ..._.head(v),
            asset: k,
            chains: v,
            amount: {
              supply: _.sumBy(v, 'amount.supply'),
              gateway_balance: _.sumBy(v, 'amount.gateway_balance'),
              total: _.sumBy(v, 'amount.total'),
            },
            value: {
              supply: _.sumBy(v, 'value.supply'),
              gateway_balance: _.sumBy(v, 'value.gateway_balance'),
              total: _.sumBy(v, 'value.total'),
            },
          }
        }).map(d => {
          const { value } = { ...d }
          const { total } = { ...value }
          return {
            ...d,
            value: {
              ...value,
              total: typeof total === 'number' ?
                total : -1,
            },
          }
        }), ['value.total'], ['desc']).map(d => {
          const { chains } = { ...d }
          const _chains = Object.fromEntries(chains?.map(c => {
            const { chain } = { ...c }
            delete c.asset_data
            return [chain, c]
          }))
          delete d.chain_data
          delete d.chains
          return {
            ...d,
            ..._chains,
          }
        })
      )
    }
  }, [evm_chains_data, assets_data, tvl_data])

  return (
    data ?
      <Datatable
        columns={_.concat([
          {
            Header: 'Asset',
            accessor: 'asset_data',
            disableSortBy: true,
            Cell: props => {
              const { name, symbol, image } = { ...props.value }
              return (
                <div className={`min-w-max flex items-${name ? 'start' : 'center'} space-x-2`}>
                  {image && (
                    <Image
                      src={image}
                      className="w-5 h-5 rounded-full"
                    />
                  )}
                  <div className="flex flex-col">
                    <div className="font-bold">
                      {name || symbol}
                    </div>
                    {name && symbol && (
                      <div className="text-slate-400 dark:text-slate-200 font-semibold">
                        {symbol}
                      </div>
                    )}
                  </div>
                </div>
              )
            },
          },
        ], evm_chains_data?.map(c => {
          const { id, chain_id, image, explorer, gateway_address } = { ...c }
          const { url, contract_path } = { ...explorer }
          return {
            Header: (
              <div className="flex items-center space-x-1.5">
                {image && (
                  <Image
                    src={image}
                    className="w-5 h-5 rounded-full"
                  />
                )}
                <span>
                  {chainName(c)}
                </span>
              </div>
            ),
            accessor: id,
            sortType: (a, b) => a.original[id]?.value?.total > b.original[id]?.value?.total ? 1 : -1,
            Cell: props => {
              const { asset_data } = { ...props.row.original }
              const contract_data = asset_data?.contracts?.find(_c => _c?.chain_id === chain_id)
              const { contract_address } = { ...contract_data }
              const { amount, value } = { ...props.value }
              const is_supply = amount?.supply
              return (
                <div className="flex flex-col text-left sm:text-right">
                  {props.value || !contract_data ?
                    <div className="flex flex-col items-start sm:items-end space-y-0.5">
                      {typeof amount?.total === 'number' ?
                        <a
                          href={`${url}${contract_path.replace('{address}', contract_address)}${!is_supply ? `?a=${gateway_address}` : ''}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={number_format(amount.total, '0,0.000')}
                          className="uppercase text-blue-500 dark:text-white text-xs font-bold"
                        >
                          {number_format(amount.total, amount.total > 100000 ? '0,0.00a' : amount.total > 10000 ? '0,0.00' : '0,0.00000000')}
                        </a>
                        :
                        <span>
                          -
                        </span>
                      }
                      {typeof value?.total === 'number' && value.total > -1 && (
                        <span
                          title={number_format(value.total, '0,0.000')}
                          className="uppercase text-xs font-semibold"
                        >
                          {currency_symbol}
                          {number_format(value.total, value.total > 1000000 ? '0,0.00a' : value.total > 10000 ? '0,0' : '0,0.00')}
                        </span>
                      )}
                    </div>
                    :
                    <div className="flex justify-start sm:justify-end -mr-1">
                      <ThreeDots color={loader_color(theme)} width="24" height="24" />
                    </div>
                  }
                </div>
              )
            },
            headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
          }
        }), [
          {
            Header: 'Total',
            accessor: 'value',
            sortType: (a, b) => a.original.value?.total > b.original.value?.total ? 1 : -1,
            Cell: props => {
              const { asset_data, amount } = { ...props.row.original }
              const { total } = { ...props.value }
              return (
                <div className="flex flex-col text-left sm:text-right">
                  <div className="flex flex-col items-start sm:items-end space-y-0.5">
                    {typeof amount?.total === 'number' ?
                      <span
                        title={number_format(amount.total, '0,0.000')}
                        className="uppercase text-slate-400 dark:text-slate-200 text-xs font-bold"
                      >
                        {number_format(amount.total, amount.total > 100000 ? '0,0.00a' : amount.total > 10000 ? '0,0.00' : '0,0.00000000')} {asset_data?.symbol}
                      </span>
                      :
                      <span>
                        -
                      </span>
                    }
                    {typeof total === 'number' && total > -1 ?
                      <span
                        title={number_format(total, '0,0.000')}
                        className="uppercase text-xs font-semibold"
                      >
                        {currency_symbol}
                        {number_format(total, total > 1000000 ? '0,0.00a' : total > 10000 ? '0,0.00' : '0,0.00000000')}
                      </span>
                      :
                      <span>
                        -
                      </span>
                    }
                  </div>
                </div>
              )
            },
            headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
          },
        ])}
        data={data}
        noPagination={data.length <= 5}
        noRecordPerPage={true}
        defaultPageSize={5}
        pageSizes={[5]}
        className="no-border"
      />
      :
      <div className="h-full flex items-center justify-center pb-6">
        <TailSpin color={loader_color(theme)} width="40" height="40" />
      </div>
  )
}