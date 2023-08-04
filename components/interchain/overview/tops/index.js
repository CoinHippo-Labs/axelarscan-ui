import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'

import Top from './top'
import { getChainData } from '../../../../lib/config'
import { toArray, equalsIgnoreCase } from '../../../../lib/utils'
import accounts from '../../../../data/accounts'

const TOPS = ['chains', 'addresses']
const TOP_N = 5

export default ({ data, types }) => {
  const { chains } = useSelector(state => ({ chains: state.chains }), shallowEqual)
  const { chains_data } = { ...chains }

  const { GMPStats, GMPTopUsers, transfersStats, transfersTopUsers, transfersTopUsersByVolume } = { ...data }
  const { messages } = { ...GMPStats }

  const groupData = (data, groupBy = 'key') =>
    Object.entries(_.groupBy(toArray(data), groupBy)).map(([k, v]) => {
      return {
        key: _.head(v)?.key || k,
        num_txs: _.sumBy(v, 'num_txs'),
        volume: _.sumBy(v, 'volume'),
        chain: _.orderBy(_.uniq(toArray(groupBy === '_key' ? _.head(v)?.chain : v.map(_v => _v.chain))).map(c => getChainData(c, chains_data)), ['i'], ['asc']).map(c => c.id),
      }
    })

  const getTopData = (data, field = 'num_txs', n = TOP_N) => _.slice(_.orderBy(toArray(data), [field], ['desc']), 0, n)

  const render = id => {
    const chainPairs = groupData(
      _.concat(
        toArray(messages).flatMap(m =>
          toArray(m.source_chains).flatMap(s =>
            toArray(s.destination_chains).map(d => {
              const { key, num_txs, volume } = { ...d }
              return {
                key: `${s.key}_${key}`,
                num_txs,
                volume,
              }
            })
          )
        ),
        toArray(transfersStats?.data).map(d => {
          const { source_chain, destination_chain, num_txs, volume } = { ...d }
          return {
            key: `${source_chain}_${destination_chain}`,
            num_txs,
            volume,
          }
        }),
      )
    )
    const sourceChains = groupData(
      _.concat(
        toArray(messages).flatMap(m =>
          toArray(m.source_chains).flatMap(s =>
            toArray(s.destination_chains).map(d => {
              const { num_txs, volume } = { ...d }
              return {
                key: s.key,
                num_txs,
                volume,
              }
            })
          )
        ),
        toArray(transfersStats?.data).map(d => {
          const { source_chain, num_txs, volume } = { ...d }
          return {
            key: source_chain,
            num_txs,
            volume,
          }
        }),
      )
    )
    const destionationChains = groupData(
      _.concat(
        toArray(messages).flatMap(m =>
          toArray(m.source_chains).flatMap(s =>
            toArray(s.destination_chains).map(d => {
              const { key, num_txs, volume } = { ...d }
              return {
                key,
                num_txs,
                volume,
              }
            })
          )
        ),
        toArray(transfersStats?.data).map(d => {
          const { destination_chain, num_txs, volume } = { ...d }
          return {
            key: destination_chain,
            num_txs,
            volume,
          }
        }),
      )
    )
    const transfersUsers = groupData(
      toArray(transfersTopUsers?.data).map(d => {
        const { key, num_txs, volume } = { ...d }
        const { name } = { ...accounts.find(a => equalsIgnoreCase(a.address, key)) }
        return {
          key,
          _key: name || key,
          num_txs,
          volume,
        }
      }),
      '_key',
    )
    const transfersUsersByVolume = groupData(
      toArray(transfersTopUsersByVolume?.data).map(d => {
        const { key, num_txs, volume } = { ...d }
        const { name } = { ...accounts.find(a => equalsIgnoreCase(a.address, key)) }
        return {
          key,
          _key: name || key,
          num_txs,
          volume,
        }
      }),
      '_key',
    )
    const contracts = groupData(
      toArray(messages).flatMap(m =>
        toArray(m.source_chains).flatMap(s =>
          toArray(s.destination_chains).flatMap(d =>
            toArray(d.contracts).map(c => {
              const { key, num_txs, volume } = { ...c }
              const { name } = { ...accounts.find(a => equalsIgnoreCase(a.address, key)) }
              return {
                key: key?.toLowerCase(),
                _key: name || key?.toLowerCase(),
                num_txs,
                volume,
                chain: d.key,
              }
            })
          )
        )
      ),
      '_key',
    )
    const GMPUsers = groupData(
      toArray(GMPTopUsers?.data).map(d => {
        const { key, num_txs } = { ...d }
        const { name } = { ...accounts.find(a => equalsIgnoreCase(a.address, key)) }
        return {
          key: key?.toLowerCase(),
          _key: name || key?.toLowerCase(),
          num_txs,
        }
      }),
      '_key',
    )

    switch (id) {
      case 'chains':
        return (
          <div key={id} className={`grid grid-cols-2 sm:grid-cols-3 ${hasGMP ? 'lg:grid-cols-6' : ''} gap-4`}>
            <Top
              data={getTopData(chainPairs, 'num_txs', 100)}
              title="Top Paths"
              description="Top chain pairs by transactions"
              className="h-48"
            />
            <Top
              data={getTopData(sourceChains, 'num_txs', 100)}
              title="Top Sources"
              description="Top sources by transactions"
              className="h-48"
            />
            <Top
              data={getTopData(destionationChains, 'num_txs', 100)}
              title="Top Destinations"
              description="Top destinations by transactions"
              className="h-48"
            />
            <Top
              data={getTopData(chainPairs, 'volume', 100)}
              field="volume"
              title="Top Paths"
              description="Top chain pairs by volume"
              prefix="$"
              className="h-48"
            />
            <Top
              data={getTopData(sourceChains, 'volume', 100)}
              field="volume"
              title="Top Sources"
              description="Top sources by volume"
              prefix="$"
              className="h-48"
            />
            <Top
              data={getTopData(destionationChains, 'volume', 100)}
              field="volume"
              title="Top Destinations"
              description="Top destinations by volume"
              prefix="$"
              className="h-48"
            />
          </div>
        )
      case 'addresses':
        return (
          <div key={id} className={`grid sm:grid-cols-2 ${hasGMP ? 'lg:grid-cols-4' : ''} gap-4`}>
            <Top
              data={getTopData(transfersUsers, 'num_txs', 10)}
              type="address"
              tab="token_transfers"
              title="Top Users"
              description="Top users by token transfers transactions"
            />
            <Top
              data={getTopData(transfersUsersByVolume, 'volume', 10)}
              type="address"
              tab="token_transfers"
              field="volume"
              title="Top Users"
              description="Top users by token transfers volume"
              prefix="$"
            />
            {hasGMP && (
              <>
                <Top
                  data={getTopData(contracts, 'num_txs', 10)}
                  type="contract"
                  title="Top Contracts"
                  description="Top destination contracts by GMP transactions"
                />
                <Top
                  data={getTopData(GMPUsers, 'num_txs', 10)}
                  type="address"
                  tab="general_message_passing"
                  title="Top GMP Users"
                  description="Top users by GMP transactions"
                />
                {/*<Top
                  data={getTopData(contracts, 'volume', 10)}
                  type="contract"
                  field="volume"
                  title="Top Contracts"
                  description="Top destination contracts by GMP volume"
                  prefix="$"
                />*/}
              </>
            )}
          </div>
        )
      default:
        return null
    }
  }

  const hasGMP = toArray(types).includes('gmp')

  return (
    <div className={`grid ${hasGMP ? '' : 'lg:grid-cols-2'} gap-4`}>
      {TOPS.map(t => render(t))}
    </div>
  )
}