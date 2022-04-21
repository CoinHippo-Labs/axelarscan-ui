import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import { Img } from 'react-image'
import {
  ResponsiveContainer,
  AreaChart,
  linearGradient,
  stop,
  XAxis,
  Area,
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
        <div className="flex items-center justify-between space-x-2">
          {data.elements?.length > 0 && (
            <span className="uppercase text-xs font-semibold">
              To Chain
            </span>
          )}
          <span className="text-gray-400 dark:text-gray-600 text-sm font-medium">
            {moment(data?.time).utc().format('MMM D, YYYY [(UTC)]')}
          </span>
        </div>
        <div className="grid grid-flow-row grid-cols-1 gap-y-2 text-xs mt-1">
          {data.elements?.length > 0 ?
            _.orderBy(data.elements.map(e => { return { ...e, time: e?.times?.find(t => t.time === data.time) } }), ['time.value', 'time.amount'], ['desc', 'desc']).map((e, i) => (
              <div key={i} className="flex items-center justify-between space-x-6">
                <div className="flex items-center space-x-1.5">
                  <Img
                    src={e.to_chain?.image}
                    alt=""
                    className="w-5 h-5 rounded-full"
                  />
                  <span className="text-3xs font-medium">{chainTitle(e.to_chain)}</span>
                </div>
                {e.time && (
                  <div className="flex flex-col items-end space-y-1">
                    <div className="flex items-center space-x-1">
                      <span className="font-mono text-2xs font-semibold">{numberFormat(e.time.amount, '0,0.00000000')}</span>
                      <span className="text-gray-400 dark:text-gray-500 text-2xs">{data.asset?.symbol}</span>
                    </div>
                    {e.time.value > 0 && (
                      <span className="font-mono text-gray-400 dark:text-gray-500 text-3xs font-medium">
                        ({currency_symbol}{numberFormat(e.time.value, '0,0.00')})
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
            :
            <div className="flex items-center space-x-1.5">
              <span className="font-medium">{!data.amount && 'No '}Volume</span>
              {data.amount > 0 && (
                <div className="flex items-center space-x-1.5">
                  <div className="flex items-center space-x-1">
                    <span className="font-mono text-xs font-semibold">{numberFormat(data.amount, '0,0.00000000')}</span>
                    <span className="text-gray-400 dark:text-gray-500 text-xs">{data.asset?.symbol}</span>
                  </div>
                  {data.value > 0 && (
                    <span className="font-mono text-gray-600 dark:text-gray-400 text-3xs font-medium">
                      ({currency_symbol}{numberFormat(data.value, '0,0.00')})
                    </span>
                  )}
                </div>
              )}
            </div>
          }
        </div>
      </div>
    )
  }

  return null
}

export default function TimelyVolume({ volumeData, setTimeFocus }) {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const [data, setData] = useState(null)

  useEffect(() => {
    if (volumeData) {
      const _data = volumeData.times?.map((t, i) => {
        return {
          ...t,
          day_string: i % 2 === 1 && moment(t.time).utc().format('DD'),
          asset: volumeData.asset,
          elements: volumeData.data,
        }
      })

      setData(_data || [])
    }
  }, [volumeData])

  const loaded = data

  return (
    <div className={`w-full h-56 bg-white dark:bg-gray-900 rounded-lg mt-2 ${loaded ? 'pb-0' : ''}`}>
      {loaded ?
        <ResponsiveContainer>
          <AreaChart
            data={data}
            onMouseEnter={event => {
              if (event) {
                if (setTimeFocus) {
                  setTimeFocus(event?.activePayload?.[0]?.payload?.time)
                }
              }
            }}
            onMouseMove={event => {
              if (event) {
                if (setTimeFocus) {
                  setTimeFocus(event?.activePayload?.[0]?.payload?.time)
                }
              }
            }}
            onMouseLeave={() => {
              if (event) {
                if (setTimeFocus) {
                  setTimeFocus(_.last(data)?.time)
                }
              }
            }}
            margin={{ top: 10, right: 2, left: 2, bottom: 4 }}
            className="mobile-hidden-x"
          >
            <defs>
              <linearGradient id="gradient-vol" x1="0" y1="0" x2="0" y2="1">
                <stop offset="50%" stopColor={theme === 'dark' ? '#e5e5e5' : '#e2e8f0'} stopOpacity={0.95} />
                <stop offset="100%" stopColor={theme === 'dark' ? '#e5e5e5' : '#e2e8f0'} stopOpacity={0.75} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day_string" axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }}/> 
            <Area type="basis" dataKey="amount" stroke={theme === 'dark' ? '#e5e5e5' : '#e2e8f0'} fillOpacity={1} fill="url(#gradient-vol)" />
          </AreaChart>
        </ResponsiveContainer>
        :
        <div className="w-full h-4/5 flex items-center justify-center">
          <Loader type="Oval" color={theme === 'dark' ? 'white' : '#3B82F6'} width="24" height="24" />
        </div>
      }
    </div>
  )
}