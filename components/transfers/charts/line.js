import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import {
  ResponsiveContainer,
  AreaChart,
  linearGradient,
  stop,
  XAxis,
  Area,
} from 'recharts'
import { TailSpin } from 'react-loader-spinner'

import { currency_symbol } from '../../../lib/object/currency'
import { number_format, loader_color, chart_color } from '../../../lib/utils'

export default ({
  title = '',
  description = '',
  chartData,
}) => {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const [data, setData] = useState(null)
  const [xFocus, setXFocus] = useState(moment().utc().startOf('month').valueOf())

  useEffect(() => {
    if (chartData) {
      const { data } = { ...chartData }
      setData(data.map((d, i) => {
        return {
          ...d,
          time_string: moment(d.timestamp).utc().format('MMM YYYY'),
        }
      }))
    }
  }, [chartData])

  const d = data?.find(d => d.timestamp === xFocus)
  const { time_string, cumulative_volume } = { ...d }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg space-y-2 pt-4 pb-0 sm:pb-1 px-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col space-y-0.5">
          <span className="font-bold">
            {title}
          </span>
          <span className="text-slate-400 dark:text-slate-200 text-xs font-medium">
            {description}
          </span>
        </div>
        {data && (
          <div className="flex flex-col items-end space-y-0.5">
            <span className="uppercase font-bold">
              {currency_symbol}{number_format(cumulative_volume, cumulative_volume > 50000000 ? '0,0.00a' : cumulative_volume > 10000000 ? '0,0' : '0,0.00')}
            </span>
            <span className="text-slate-400 dark:text-slate-200 text-xs font-medium">
              {time_string}
            </span>
          </div>
        )}
      </div>
      <div className="w-full h-56">
        {data ?
          <ResponsiveContainer>
            <AreaChart
              data={data}
              onMouseEnter={e => {
                if (e) {
                  setXFocus(e?.activePayload?.[0]?.payload?.timestamp)
                }
              }}
              onMouseMove={e => {
                if (e) {
                  setXFocus(e?.activePayload?.[0]?.payload?.timestamp)
                }
              }}
              onMouseLeave={e => {
                if (e) {
                  setXFocus(_.last(data)?.timestamp)
                }
              }}
              margin={{
                top: 10,
                right: 2,
                bottom: 4,
                left: 2,
              }}
            >
              <defs>
                <linearGradient
                  id="gradient-volume"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="50%"
                    stopColor={chart_color(theme)}
                    stopOpacity={0.66}
                  />
                  <stop
                    offset="100%"
                    stopColor={chart_color(theme)}
                    stopOpacity={0.33}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time_string"
                axisLine={false}
                tickLine={false}
              />
              <Area
                type="basis"
                dataKey="cumulative_volume"
                stroke={chart_color(theme)}
                fillOpacity={1}
                fill="url(#gradient-volume)"
              />
            </AreaChart>
          </ResponsiveContainer>
          :
          <div className="w-full h-4/5 flex items-center justify-center">
            <TailSpin color={loader_color(theme)} width="32" height="32" />
          </div>
        }
      </div>
    </div>
  )
}