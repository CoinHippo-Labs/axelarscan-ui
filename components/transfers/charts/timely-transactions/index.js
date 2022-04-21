import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import { Img } from 'react-image'
import {
  ResponsiveContainer,
  BarChart,
  linearGradient,
  stop,
  XAxis,
  Bar,
  Cell,
  Tooltip,
} from 'recharts'
import Loader from 'react-loader-spinner'

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
        <div className={`grid grid-flow-row grid-cols-${data.elements?.length > 1 ? 2 : 1} gap-y-1 gap-x-4 text-xs mt-1`}>
          {data.elements?.length > 0 ?
            _.orderBy(data.elements.map(e => { return { ...e, time: e?.times?.find(t => t.time === data.time) } }), ['time.tx'], ['desc']).map((e, i) => (
              <div key={i} className="flex items-center justify-between space-x-4">
                <div className="flex items-center space-x-1.5">
                  <Img
                    src={e.to_chain?.image}
                    alt=""
                    className="w-5 h-5 rounded-full"
                  />
                  <span className="text-3xs font-medium">{e.to_chain?.short_name}</span>
                </div>
                <span className="font-mono font-semibold">{numberFormat(e.time?.tx, '0,0')}</span>
              </div>
            ))
            :
            <div className="space-x-1.5">
              {data.tx > 0 && (
                <span className="font-mono font-semibold">{numberFormat(data.tx, '0,0')}</span>
              )}
              <span className="font-medium">{!data.tx && 'No '}Transaction{data.tx !== 1 ? 's' : ''}</span>
            </div>
          }
        </div>
      </div>
    )
  }

  return null
}

export default function TimelyTransactions({ txsData, setTimeFocus }) {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const [data, setData] = useState(null)

  useEffect(() => {
    if (txsData) {
      const _data = txsData.times?.map((t, i) => {
        return {
          ...t,
          day_string: i % 2 === 0 && moment(t.time).utc().format('DD'),
          elements: txsData.data,
        }
      })

      setData(_data || [])
    }
  }, [txsData])

  const loaded = data

  return (
    <div className={`w-full h-56 bg-white dark:bg-gray-900 rounded-lg mt-2 ${loaded ? 'pb-0' : ''}`}>
      {loaded ?
        <ResponsiveContainer>
          <BarChart
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
              <linearGradient id="gradient-tx" x1="0" y1="0" x2="0" y2="1">
                <stop offset="50%" stopColor={theme === 'dark' ? '#e5e5e5' : '#e2e8f0'} stopOpacity={0.95} />
                <stop offset="100%" stopColor={theme === 'dark' ? '#e5e5e5' : '#e2e8f0'} stopOpacity={0.75} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day_string" axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }}/> 
            <Bar dataKey="tx" minPointSize={5}>
              {data.map((entry, i) => (<Cell key={i} fillOpacity={1} fill="url(#gradient-tx)" />))}
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