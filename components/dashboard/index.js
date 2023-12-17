import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'

import Metrics from './metrics'
import Interchain from './interchain'
import { GMPStats, GMPTotalVolume } from '../../lib/api/gmp'
import { transfersStats, transfersTotalVolume } from '../../lib/api/transfers'
import { getChainData } from '../../lib/config'
import { toArray, normalizeQuote } from '../../lib/utils'

export default () => {
  const { chains } = useSelector(state => ({ chains: state.chains }), shallowEqual)
  const { chains_data } = { ...chains }

  const [interchainData, setInterchainData] = useState(null)

  useEffect(
    () => {
      const metrics = ['GMPStats', 'GMPTotalVolume', 'transfersStats', 'transfersTotalVolume']

      const getData = async () => {
        const interchainData = Object.fromEntries(
          await Promise.all(
            toArray(
              metrics.map(m =>
                new Promise(
                  async resolve => {
                    switch (m) {
                      case 'GMPStats':
                        resolve([m, { ...await GMPStats() }])
                        break
                      case 'GMPTotalVolume':
                        resolve([m, await GMPTotalVolume() || 0])
                        break
                      case 'transfersStats':
                        resolve([m, await transfersStats()])
                        break
                      case 'transfersTotalVolume':
                        resolve([m, await transfersTotalVolume() || 0])
                        break
                      default:
                        resolve()
                        break
                    }
                  }
                )
              )
            )
          )
        )

        const { messages } = { ...interchainData?.GMPStats }
        const { data } = { ...interchainData?.transfersStats }
        interchainData.networkGraph = _.orderBy(
          Object.entries(
            _.groupBy(
              _.concat(
                toArray(messages).flatMap(m =>
                  toArray(m.source_chains).flatMap(s =>
                    toArray(s.destination_chains).map(d => {
                      const { num_txs, volume } = { ...d }
                      const source_chain = getChainData(normalizeQuote(s.key), chains_data)?.id || s.key
                      const destination_chain = getChainData(normalizeQuote(d.key), chains_data)?.id || d.key
                      return {
                        id: toArray([source_chain, destination_chain]).join('_'),
                        source_chain,
                        destination_chain,
                        num_txs,
                        volume,
                      }
                    })
                  )
                ),
                toArray(data).map(d => {
                  const { num_txs, volume } = { ...d }
                  const source_chain = getChainData(d.source_chain, chains_data)?.id || d.source_chain
                  const destination_chain = getChainData(d.destination_chain, chains_data)?.id || d.destination_chain
                  return {
                    id: toArray([source_chain, destination_chain]).join('_'),
                    source_chain,
                    destination_chain,
                    num_txs,
                    volume,
                  }
                }),
              )
              .filter(d => d.source_chain && d.destination_chain),
              'id',
            )
          )
          .map(([k, v]) => {
            return {
              ..._.head(v),
              id: k,
              num_txs: _.sumBy(v, 'num_txs'),
              volume: _.sumBy(v, 'volume'),
            }
          }),
          ['num_txs'], ['desc'],
        )

        setInterchainData(interchainData)
      }

      getData()
      const interval = setInterval(() => getData(), 3 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [],
  )

  useEffect(
    () => {
      if (chains_data && interchainData?.networkGraph && !interchainData.chainsLoaded) {
        const { networkGraph } = { ...interchainData }
        setInterchainData({
          ...interchainData,
          networkGraph: networkGraph.map(d => {
            const { source_chain, destination_chain } = { ...d }
            return {
              ...d,
              source_chain: getChainData(source_chain, chains_data)?.id || source_chain,
              destination_chain: getChainData(destination_chain, chains_data)?.id || destination_chain,
            }
          }),
          chainsLoaded: true,
        })
      }
    },
    [chains_data, interchainData],
  )

  return (
    <div className="children space-y-6 pt-6 px-2 sm:px-4">
      <Metrics />
      <Interchain data={{ ...interchainData, chains_data }} />
    </div>
  )
}