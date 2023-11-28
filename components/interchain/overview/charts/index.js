import _ from 'lodash'

import Bar from './bar'
import { toArray } from '../../../../lib/utils'

const CHARTS = ['transactions', 'volumes', 'active_users', 'fees']

export default ({ data, granularity }) => {
  const { GMPStats, GMPChart, GMPTotalVolume, GMPTotalFee, GMPTotalActiveUsers, transfersStats, transfersChart, transfersAirdropChart, transfersTotalVolume, transfersTotalFee, transfersTotalActiveUsers } = { ...data }
  const { messages } = { ...GMPStats }
  const dateFormat = granularity === 'month' ? 'MMM' : undefined

  const render = id => {
    const _data = _.orderBy(
      Object.entries(
        _.groupBy(
          _.concat(
            toArray(GMPChart?.data).map(d => {
              const { num_txs, volume, fee, users } = { ...d }
              return {
                ...d,
                gmp_num_txs: num_txs,
                gmp_volume: volume,
                gmp_fee: fee,
                gmp_users: users,
              }
            }),
            toArray(transfersChart?.data).map(d => {
              const { num_txs, volume, fee, users } = { ...d }
              return {
                ...d,
                transfers_num_txs: num_txs,
                transfers_volume: volume,
                transfers_fee: fee,
                transfers_users: users,
              }
            }),
            toArray(transfersAirdropChart?.data).map(d => {
              const { num_txs, volume, fee, users } = { ...d }
              return {
                ...d,
                transfers_airdrop_num_txs: num_txs,
                transfers_airdrop_volume: volume,
                transfers_airdrop_fee: fee,
                transfers_airdrop_users: users,
              }
            }),
          ),
          'timestamp',
        )
      )
      .map(([k, v]) => {
        return {
          timestamp: Number(k),
          num_txs: _.sumBy(v, 'num_txs'),
          volume: _.sumBy(v, 'volume'),
          fee: _.sumBy(v, 'fee'),
          users: _.sumBy(v, 'users'),
          gmp_num_txs: _.sumBy(v.filter(_v => _v.gmp_num_txs > 0), 'gmp_num_txs'),
          gmp_volume: _.sumBy(v.filter(_v => _v.gmp_volume > 0), 'gmp_volume'),
          gmp_fee: _.sumBy(v.filter(_v => _v.gmp_fee > 0), 'gmp_fee'),
          gmp_users: _.sumBy(v.filter(_v => _v.gmp_users > 0), 'gmp_users'),
          transfers_num_txs: _.sumBy(v.filter(_v => _v.transfers_num_txs > 0), 'transfers_num_txs'),
          transfers_volume: _.sumBy(v.filter(_v => _v.transfers_volume > 0), 'transfers_volume'),
          transfers_fee: _.sumBy(v.filter(_v => _v.transfers_fee > 0), 'transfers_fee'),
          transfers_users: _.sumBy(v.filter(_v => _v.transfers_users > 0), 'transfers_users'),
          transfers_airdrop_num_txs: _.sumBy(v.filter(_v => _v.transfers_airdrop_num_txs > 0), 'transfers_airdrop_num_txs'),
          transfers_airdrop_volume: _.sumBy(v.filter(_v => _v.transfers_airdrop_volume > 0), 'transfers_airdrop_volume'),
          transfers_airdrop_fee: _.sumBy(v.filter(_v => _v.transfers_airdrop_fee > 0), 'transfers_airdrop_fee'),
          transfers_airdrop_users: _.sumBy(v.filter(_v => _v.transfers_airdrop_users > 0), 'transfers_airdrop_users'),
        }
      })
      .map(d => {
        const { gmp_volume, transfers_volume, transfers_airdrop_volume } = { ...d }
        return {
          ...d,
          transfers_airdrop_volume_value: transfers_airdrop_volume > 0 ? transfers_airdrop_volume > 100000 ? _.mean([gmp_volume, transfers_volume]) : transfers_airdrop_volume : 0,
        }
      }),
      ['timestamp'], ['asc'],
    )

    let total
    switch (id) {
      case 'transactions':
        total = (_.sumBy(messages, 'num_txs') || 0) + (transfersStats?.total || 0)
        return (
          <Bar
            key={id}
            id={id}
            data={_data}
            totalValue={total}
            field="num_txs"
            title="Transactions"
            description={`Number of transactions by ${granularity}`}
            dateFormat={dateFormat}
            granularity={granularity}
          />
        )
      case 'volumes':
        total = (GMPTotalVolume || 0) + (transfersTotalVolume || 0)
        const maxPerMean = _.maxBy(_data, 'volume')?.volume / (_.meanBy(_data, 'volume') || 1)
        const hasAirdropActivities = _data.find(d => d.transfers_airdrop_volume > 0)
        const scale = maxPerMean > 5 && !hasAirdropActivities ? 'log' : undefined
        const useStack = maxPerMean <= 5 || maxPerMean > 10 || hasAirdropActivities
        return (
          <Bar
            key={id}
            id={id}
            data={_data}
            totalValue={total}
            field="volume"
            stacks={['transfers_airdrop', 'gmp', 'transfers']}
            colors={scale === 'log' && useStack ? { gmp: '#33b700', transfers: '#33b700', transfers_airdrop: '#33b700' } : undefined}
            scale={scale}
            useStack={useStack}
            title="Volume"
            description={`Transfer volume by ${granularity}`}
            dateFormat={dateFormat}
            granularity={granularity}
            prefix="$"
          />
        )
      case 'active_users':
        total = (GMPTotalActiveUsers || 0) + (transfersTotalActiveUsers || 0)
        return (
          <Bar
            key={id}
            id={id}
            data={_data}
            totalValue={total}
            field="users"
            title="Active Users"
            description={`Number of active users by ${granularity}`}
            dateFormat={dateFormat}
            granularity={granularity}
          />
        )
      case 'fees':
        total = (GMPTotalFee || 0) + (transfersTotalFee || 0)
        return (
          <Bar
            key={id}
            id={id}
            data={_data}
            totalValue={total}
            field="fee"
            title="Gas Fees"
            description={`Gas fees by ${granularity}`}
            dateFormat={dateFormat}
            granularity={granularity}
            prefix="$"
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {CHARTS.map(c => render(c))}
    </div>
  )
}