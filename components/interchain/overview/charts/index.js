import _ from 'lodash'

import Bar from './bar'
import { toArray } from '../../../../lib/utils'

const CHARTS = ['transactions', 'volumes', 'active_users', 'fees']

export default ({ data, granularity }) => {
  const { GMPStats, GMPChart, GMPTotalVolume, GMPTotalFee, GMPTotalActiveUsers, transfersStats, transfersChart, transfersTotalVolume, transfersTotalFee, transfersTotalActiveUsers } = { ...data }
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
        return (
          <Bar
            key={id}
            id={id}
            data={_data}
            totalValue={total}
            field="volume"
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
            title="Fee"
            description={`Transfer fee by ${granularity}`}
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