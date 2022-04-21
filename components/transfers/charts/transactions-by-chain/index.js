import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import { Img } from 'react-image'
import {
  ResponsiveContainer,
  BarChart,
  linearGradient,
  stop,
  XAxis,
  Bar,
  LabelList,
  Cell,
  Tooltip,
} from 'recharts'
import Loader from 'react-loader-spinner'

import { chainTitle } from '../../../../lib/object/chain'
import { currency_symbol } from '../../../../lib/object/currency'
import { numberFormat } from '../../../../lib/utils'

const CustomTooltip = ({ active, payload, label }) => {
  if (active) {
    const data = { ...payload?.[0]?.payload }

    return (
      <div className="bg-gray-50 dark:bg-black shadow-lg rounded-lg p-2">
        <div className="flex flex-col space-y-1.5">
          <div className="flex items-center space-x-1.5">
            <Img
              src={data?.chain?.image}
              alt=""
              className="w-5 h-5 rounded-full"
            />
            <span className="text-xs font-semibold">{chainTitle(data?.chain)}</span>
          </div>
          <div className="flex flex-col items-start space-y-1">
            <div className="flex items-center space-x-1.5">
              {data?.tx > 0 && (
                <span className="font-mono text-xs font-semibold">{numberFormat(data.tx, '0,0')}</span>
              )}
              <span className="text-gray-400 dark:text-gray-500 text-xs font-medium">{!data?.tx && 'No '}Transaction{data?.tx !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default function TransactionsByChain({ txsData }) {
  const { preferences, chains, cosmos_chains } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, cosmos_chains: state.cosmos_chains }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { cosmos_chains_data } = { ...cosmos_chains }

  const [data, setData] = useState(null)

  useEffect(() => {
    if (txsData && chains_data) {
      let _data = []

      for (let i = 0; i < cosmos_chains_data.length; i++) {
        const chain = cosmos_chains_data[i]

        _data.push(txsData.data?.find(d => d?.to_chain?.id === chain?.id) || { chain, asset: _.head(txsData.data)?.asset, tx: 0 })
      }

      for (let i = 0; i < chains_data.length; i++) {
        const chain = chains_data[i]

        _data.push(txsData.data?.find(d => d?.to_chain?.id === chain?.id) || { chain, asset: _.head(txsData.data)?.asset, tx: 0 })
      }

      _data = _data.map(d => {
        return {
          ...d,
          chain: d?.chain || d?.to_chain,
          tx_string: `${numberFormat(d?.tx, d?.tx >= 1000000 ? '0,0.00a' : '0,0')}`.toUpperCase(),
        }
      })

      setData(_data)
    }
  }, [chains_data, txsData])

  const loaded = data

  return (
    <div className={`w-full h-56 bg-white dark:bg-gray-900 rounded-lg mt-2 ${loaded ? 'pb-0' : ''}`}>
      {loaded ?
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 20, right: 10, left: 10, bottom: 0 }}
          >
            <defs>
              {data.map((entry, i) => (
                <linearGradient key={i} id={`gradient-tx-${entry?.chain?.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="25%" stopColor={entry?.chain?.color} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={entry?.chain?.color} stopOpacity={0.75} />
                </linearGradient>
              ))}
            </defs>
            <XAxis dataKey="chain.short_name" axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }}/> 
            <Bar dataKey="tx" minPointSize={10}>
              <LabelList dataKey="tx_string" position="top" cursor="default" />
              {data.map((entry, i) => (<Cell key={i} fillOpacity={1} fill={`url(#gradient-tx-${entry?.chain?.id})`} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        :
        <div className="w-full h-4/5 flex items-center justify-center">
          <Loader type="Oval" color={theme === 'dark' ? 'white' : '#3B82F6'} width="24" height="24" />
        </div>
      }
    </div>
  )
}