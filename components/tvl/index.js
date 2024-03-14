import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'

import Spinner from '../spinner'
import Datatable from '../datatable'
import Image from '../image'
import NumberDisplay from '../number'
import { PROJECT_ASSET, getChainData, getAssetData } from '../../lib/config'
import { toArray, equalsIgnoreCase, loaderColor } from '../../lib/utils'

const PAGE_SIZE = 100

export default () => {
  const { chains, assets, tvl } = useSelector(state => ({ chains: state.chains, assets: state.assets, tvl: state.tvl }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { tvl_data } = { ...tvl }

  const [data, setData] = useState(null)

  useEffect(
    () => {
      if (chains_data && assets_data && Object.keys({ ...tvl_data }).length > assets_data.length / 2) {
        setData(
          _.orderBy(
            _.orderBy(
              Object.entries(tvl_data).map(([k, v]) => {
                const { total_on_evm, total_on_cosmos, total, tvl } = { ...v }
                let { price } = { ...v }
                const asset_data = getAssetData(k, assets_data)
                price = typeof price === 'number' ? price : typeof asset_data?.price === 'number' ? asset_data.price : -1
                return {
                  ...v,
                  asset_data,
                  value_on_evm: (total_on_evm || 0) * price,
                  value_on_cosmos: (total_on_cosmos || 0) * price,
                  value: (total || 0) * price,
                  native: _.head(Object.entries({ ...tvl }).filter(([_k, _v]) => toArray([_v.contract_data, _v.denom_data]).findIndex(d => d.native_chain === _k || d.is_native) > -1).map(([_k, _v]) => { return { chain: _k, chain_data: getChainData(_k, chains_data), ..._v }})),
                }
              }),
              ['value'], ['desc'],
            )
            .map((d, i) => { return { ...d, i: equalsIgnoreCase(d.asset, PROJECT_ASSET) ? -1 : 0 } }),
            ['i'], ['asc'],
          )
        )
      }
    },
    [chains_data, assets_data, tvl_data],
  )

  return (
    <div className="children">
      {toArray(data).length > 0 && data.length >= toArray(assets_data).filter(a => !a.no_tvl).length - 5 ?
        <Datatable
          columns={
            _.orderBy(
              _.concat(
                {
                  Header: 'Asset',
                  accessor: 'asset_data',
                  sortType: (a, b) => a.original.i < b.original.i ? 1 : -1,
                  Cell: props => {
                    const { name, symbol, image } = { ...props.value }
                    return (
                      <div className="min-w-max flex items-start space-x-2">
                        <Image
                          src={image}
                          width={20}
                          height={20}
                        />
                        <div className="text-xs">
                          <div className="font-semibold">
                            {name}
                          </div>
                            <div className="text-slate-400 dark:text-slate-500">
                              {symbol}
                            </div>
                        </div>
                      </div>
                    )
                  },
                  className: 'bg-light dark:bg-dark sticky left-0 z-40',
                  order: 0,
                },
                {
                  Header: 'Native Chain',
                  accessor: 'native',
                  sortType: (a, b) => a.original.native?.chain > b.original.native?.chain ? 1 : -1,
                  Cell: props => {
                    const { name, image } = { ...props.value?.chain_data }
                    return (
                      <div className="min-w-max flex items-start space-x-2">
                        <Image
                          src={image}
                          width={18}
                          height={18}
                          className="rounded-full"
                        />
                        <span className="text-xs font-semibold">
                          {name}
                        </span>
                      </div>
                    )
                  },
                  headerClassName: 'whitespace-nowrap',
                  className: 'bg-white dark:bg-black sticky left-tvl-native-chain z-30',
                  order: 1,
                },
                {
                  Header: (
                    <div className="space-y-0.5">
                      <div className="normal-case text-2xs font-semibold">
                        Total Locked
                      </div>
                      <NumberDisplay
                        value={_.sumBy(data.filter(d => d.value > 0), 'value')}
                        format="0,0.0a"
                        prefix="$"
                        noTooltip={true}
                        className="uppercase text-green-500 text-xs font-bold"
                      />
                    </div>
                  ),
                  accessor: 'value',
                  sortType: (a, b) => a.original.value > b.original.value ? 1 : -1,
                  Cell: props => {
                    const { asset_data, native, total, value } = { ...props.row.original }
                    const { symbol } = { ...asset_data }
                    const { url } = { ...native }
                    const totalComponent = (
                      <NumberDisplay
                        value={total}
                        format="0,0.0a"
                        suffix={` ${symbol}`}
                        className="text-xs font-semibold"
                      />
                    )
                    const valueComponent = value > 0 && (
                      <NumberDisplay
                        value={value}
                        format="0,0.0a"
                        prefix="$"
                        className="text-slate-400 dark:text-slate-500 text-xs font-medium"
                      />
                    )
                    return (
                      <div className="flex flex-col items-start sm:items-end">
                        {url ?
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 dark:text-blue-500 text-xs"
                          >
                            {totalComponent}
                          </a> :
                          totalComponent
                        }
                        {valueComponent}
                      </div>
                    )
                  },
                  headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
                  className: 'bg-slate-50 dark:bg-slate-900 sticky left-tvl-total-locked z-30',
                  order: 2,
                },
                {
                  Header: (
                    <div className="space-y-0.5">
                      <div className="normal-case text-2xs font-semibold">
                        Moved to EVM
                      </div>
                      <NumberDisplay
                        value={_.sumBy(data.filter(d => d.value_on_evm > 0), 'value_on_evm')}
                        format="0,0.0a"
                        prefix="$"
                        noTooltip={true}
                        className="uppercase text-green-500 text-xs font-bold"
                      />
                    </div>
                  ),
                  accessor: 'value_on_evm',
                  sortType: (a, b) => a.original.value_on_evm > b.original.value_on_evm ? 1 : -1,
                  Cell: props => {
                    const { asset_data, total_on_evm, value_on_evm } = { ...props.row.original }
                    const { symbol } = { ...asset_data }
                    const totalComponent = (
                      <NumberDisplay
                        value={total_on_evm}
                        format="0,0.0a"
                        suffix={` ${symbol}`}
                        className="text-xs font-semibold"
                      />
                    )
                    const valueComponent = value_on_evm > 0 && (
                      <NumberDisplay
                        value={value_on_evm}
                        format="0,0.0a"
                        prefix="$"
                        className="text-slate-400 dark:text-slate-500 text-xs font-medium"
                      />
                    )
                    return (
                      <div className="flex flex-col items-start sm:items-end">
                        {totalComponent}
                        {valueComponent}
                      </div>
                    )
                  },
                  headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
                  className: 'bg-white dark:bg-black sticky z-20',
                  order: 3,
                },
                {
                  Header: (
                    <div className="space-y-0.5">
                      <div className="normal-case text-2xs font-semibold">
                        Moved to COSMOS
                      </div>
                      <NumberDisplay
                        value={_.sumBy(data.filter(d => d.value_on_cosmos > 0), 'value_on_cosmos')}
                        format="0,0.0a"
                        prefix="$"
                        noTooltip={true}
                        className="uppercase text-green-500 text-xs font-bold"
                      />
                    </div>
                  ),
                  accessor: 'value_on_cosmos',
                  sortType: (a, b) => a.original.value_on_cosmos > b.original.value_on_cosmos ? 1 : -1,
                  Cell: props => {
                    const { asset_data, total_on_cosmos, value_on_cosmos } = { ...props.row.original }
                    const { symbol } = { ...asset_data }
                    const totalComponent = (
                      <NumberDisplay
                        value={total_on_cosmos}
                        format="0,0.0a"
                        suffix={` ${symbol}`}
                        className="text-xs font-semibold"
                      />
                    )
                    const valueComponent = value_on_cosmos > 0 && (
                      <NumberDisplay
                        value={value_on_cosmos}
                        format="0,0.0a"
                        prefix="$"
                        className="text-slate-400 dark:text-slate-500 text-xs font-medium"
                      />
                    )
                    return (
                      <div className="flex flex-col items-start sm:items-end">
                        {totalComponent}
                        {valueComponent}
                      </div>
                    )
                  },
                  headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
                  className: 'bg-white dark:bg-black sticky z-20',
                  order: 4,
                },
                _.orderBy(
                  _.uniqBy(
                    chains_data.filter(c => !c.no_inflation && !c.no_tvl).map(c => {
                      const { id } = { ...c }
                      return {
                        ...c,
                        total_value: _.sumBy(
                          data.map(d => {
                            const { price, tvl } = { ...d }
                            const { supply, total } = { ...tvl?.[id] }
                            const amount = supply || total
                            const value = (amount * price) || 0
                            return { ...d, value }
                          })
                          .filter(d => d.value > 0),
                          'value',
                        ),
                      }
                    }),
                    'id',
                  ),
                  ['total_value'], ['desc'],
                )
                .map((c, i) => {
                  const { id, name, image, total_value } = { ...c }
                  return {
                    Header: (
                      <div>
                        <div className="min-w-max flex items-start space-x-1">
                          <Image
                            src={image}
                            width={16}
                            height={16}
                            className="rounded-full"
                          />
                          <span className="normal-case text-2xs font-semibold">
                            {name}
                          </span>
                        </div>
                        <NumberDisplay
                          value={total_value}
                          format="0,0.0a"
                          prefix="$"
                          noTooltip={true}
                          className="uppercase text-slate-500 dark:text-slate-300 text-xs font-bold"
                        />
                      </div>
                    ),
                    accessor: `tvl.${id}`,
                    sortType: (a, b) => (a.original.tvl?.[id]?.supply || a.original.tvl?.[id]?.total || -1) * a.original.price > (b.original.tvl?.[id]?.supply || b.original.tvl?.[id]?.total || -1) * b.original.price ? 1 : -1,
                    Cell: props => {
                      const { price, tvl } = { ...props.row.original }
                      const { supply, total, url } = { ...tvl?.[id] }
                      const amount = supply || total
                      const value = amount * price
                      const totalComponent = (
                        <NumberDisplay
                          value={amount}
                          format="0,0.0a"
                          className="text-xs font-semibold"
                        />
                      )
                      const valueComponent = value > 0 && (
                        <NumberDisplay
                          value={value}
                          format="0,0.0a"
                          prefix="$"
                          className="text-slate-400 dark:text-slate-500 text-xs font-medium"
                        />
                      )
                      return (
                        <div className="flex flex-col items-start sm:items-end">
                          {url ?
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 dark:text-blue-500 text-xs"
                            >
                              {totalComponent}
                            </a> :
                            totalComponent
                          }
                          {valueComponent}
                        </div>
                      )
                    },
                    headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
                    className: 'bg-light dark:bg-dark',
                    order: 5 + i,
                  }
                }),
              ),
              ['order'], ['asc'],
            )
          }
          data={data}
          defaultPageSize={PAGE_SIZE}
          pageSizes={[PAGE_SIZE]}
          noPagination={data.length <= PAGE_SIZE}
          noRecordPerPage={true}
          className="no-border no-shadow block-table"
        /> :
        <div className="loading">
          <Spinner name="Blocks" />
        </div>
      }
    </div>
  )
}