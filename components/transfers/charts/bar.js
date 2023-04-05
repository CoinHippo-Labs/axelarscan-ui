import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import {
  ResponsiveContainer,
  BarChart,
  linearGradient,
  stop,
  XAxis,
  Bar,
  Cell,
} from 'recharts'
import { ProgressBar } from 'react-loader-spinner'

import { number_format, loader_color, chart_color } from '../../../lib/utils'

export default (
  {
    id = 'transfers',
    title = '',
    description = '',
    date_format = 'D MMM',
    timeframe = 'day',
    value_field = 'num_txs',
    is_cumulative = false,
    chart_data,
  },
) => {
  const {
    preferences,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }

  const [data, setData] = useState(null)
  const [xFocus, setXFocus] = useState(null)

  useEffect(
    () => {
      if (chart_data) {
        const {
          data,
        } = { ...chart_data }

        setData(
          data.map((d, i) => {
            const {
              timestamp,
            } = { ...d }

            return {
              ...d,
              time_string: moment(timestamp).utc().format(date_format),
            }
          })
        )
      }
    },
    [chart_data],
  )

  const d = (data || []).find(d => d.timestamp === xFocus)

  const focus_value = d || is_cumulative ? (d || _.last(data))?.[value_field] : data ? _.sumBy(data, value_field) : null
  const focus_time_string = d || is_cumulative ? (d || _.last(data))?.time_string : data ? _.concat(_.head(data)?.time_string, _.last(data)?.time_string).filter(s => s).join(' - ') : null

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg space-y-2 pt-4 pb-0 sm:pb-1 px-4">
      <div className="flex items-start justify-between space-x-1">
        <div className="flex flex-col space-y-0.5">
          <span className="font-semibold">
            {title}
          </span>
          <span className="text-slate-400 dark:text-slate-500 text-xs">
            {description}
          </span>
        </div>
        {
          typeof focus_value === 'number' &&
          (
            <div className="flex flex-col items-end space-y-0.5">
              <span className="uppercase font-semibold">
                {number_format(focus_value, focus_value > 1000000 ? '0,0.00a' : '0,0')}
              </span>
              <span className="leading-4 whitespace-nowrap text-slate-400 dark:text-slate-500 text-2xs sm:text-xs font-medium text-right">
                {focus_time_string}
              </span>
            </div>
          )
        }
      </div>
      <div className="w-full h-52">
        {data ?
          <ResponsiveContainer>
            <BarChart
              data={data}
              onMouseEnter={
                e => {
                  if (e) {
                    setXFocus(_.head(e.activePayload)?.payload?.timestamp)
                  }
                }
              }
              onMouseMove={
                e => {
                  if (e) {
                    setXFocus(_.head(e.activePayload)?.payload?.timestamp)
                  }
                }
              }
              onMouseLeave={() => setXFocus(null)}
              margin={{ top: 10, right: 2, bottom: 4, left: 2 }}
              className="small-x"
            >
              <defs>
                <linearGradient
                  id={`gradient-${id}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="50%"
                    stopColor={chart_color(theme, timeframe)}
                    stopOpacity={0.66}
                  />
                  <stop
                    offset="100%"
                    stopColor={chart_color(theme, timeframe)}
                    stopOpacity={0.33}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time_string"
                axisLine={false}
                tickLine={false}
              />
              <Bar
                dataKey={value_field}
                minPointSize={5}
              >
                {data
                  .map((entry, i) => (
                    <Cell
                      key={i}
                      fillOpacity={1}
                      fill={`url(#gradient-${id})`}
                    />
                  ))
                }
              </Bar>
            </BarChart>
          </ResponsiveContainer> :
          <div className="w-full h-4/5 flex items-center justify-center">
            <ProgressBar
              borderColor={loader_color(theme)}
              width="36"
              height="36"
            />
          </div>
        }
      </div>
    </div>
  )
}