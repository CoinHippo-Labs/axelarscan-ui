import { useState, useEffect } from 'react'
import { ResponsiveContainer, BarChart, XAxis, YAxis, Bar, Tooltip } from 'recharts'
import { Card, CardBody } from '@material-tailwind/react'
import _ from 'lodash'
import moment from 'moment'

import Spinner from '../../../spinner'
import NumberDisplay from '../../../number'
import { split, toArray, _numberFormat, getTitle } from '../../../../lib/utils'

export default (
  {
    id = 'transactions',
    data,
    totalValue,
    field = 'num_txs',
    stacks = ['gmp', 'transfers'],
    colors = { gmp: '#ff7d20', transfers: '#009ef7' },
    scale = '',
    useStack = true,
    title = '',
    description = '',
    dateFormat = 'D MMM',
    granularity = 'day',
    numberFormat = '0,0',
    prefix = '',
  },
) => {
  const [chartData, setChartData] = useState(null)
  const [x, setX] = useState(null)

  useEffect(
    () => {
      if (data) {
        setChartData(
          toArray(data).map(d => {
            const { timestamp } = { ...d }
            const time = moment(timestamp).utc()
            const time_string = time.format(dateFormat)
            let focus_time_string
            switch (granularity) {
              case 'month':
                focus_time_string = time.format('MMM YY')
                break
              case 'week':
                focus_time_string = [time.format(dateFormat), moment(time).add(7, 'days').format(dateFormat)].join(' - ')
                break
              default:
                focus_time_string = time_string
                break
            }
            return {
              ...d,
              time_string,
              focus_time_string,
            }
          }).filter(d => scale !== 'log' || field !== 'volume' || d[field] > 100)
        )
      }
    },
    [data],
  )

  const CustomTooltip = ({ active, payload }) => {
    if (active) {
      const data = _.head(payload)?.payload
      const values = toArray(_.concat(stacks, 'total')).map(s => {
        return {
          key: s,
          value: data?.[`${s !== 'total' ? `${s}_` : ''}${field}`],
        }
      })

      return (
        <div className="bg-slate-50 dark:bg-black bg-opacity-75 dark:bg-opacity-75 rounded flex flex-col space-y-1 p-2">
          {toArray(values).map((v, i) => {
            const { key, value } = { ...v }
            return (
              <div key={i} className="flex items-center justify-between space-x-4">
                <span className="text-xs font-semibold">
                  {getTitle(key)}
                </span>
                <NumberDisplay
                  value={value}
                  format={numberFormat}
                  prefix={prefix}
                  noTooltip={true}
                  className="text-xs font-medium"
                />
              </div>
            )
          })}
        </div>
      )
    }
    else {
      return null
    }
  }

  const d = toArray(chartData).find(d => d.timestamp === x)
  const value = d ? d[field] : chartData ? totalValue || _.sumBy(chartData, field) : null
  const time_string = d ? d.focus_time_string : chartData ? toArray([_.head(split(_.head(chartData)?.focus_time_string, 'normal', ' - ')), _.last(split(_.last(chartData)?.focus_time_string, 'normal', ' - '))]).join(' - ') : null

  return (
    <Card key={id} className="card">
      <CardBody className="space-y-1.5 -mb-4">
        <div className="flex items-start justify-between space-x-2">
          <div className="flex flex-col space-y-0.5">
            <span className="text-black dark:text-white text-base font-semibold">
              {title}
            </span>
            {description && (
              <span className="text-slate-400 dark:text-slate-500 text-sm font-normal">
                {description}
              </span>
            )}
          </div>
          {typeof value === 'number' && (
            <div className="flex flex-col items-end space-y-0.5">
              <NumberDisplay
                value={value}
                format={numberFormat}
                prefix={prefix}
                noTooltip={true}
                className="text-black dark:text-white text-base font-semibold"
              />
              <span className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-sm text-right">
                {time_string}
              </span>
            </div>
          )}
        </div>
        <div className="w-full h-64">
          {chartData ?
            <ResponsiveContainer>
              <BarChart
                data={chartData}
                onMouseEnter={e => setX(_.head(e?.activePayload)?.payload?.timestamp)}
                onMouseMove={e => setX(_.head(e?.activePayload)?.payload?.timestamp)}
                onMouseLeave={() => setX(null)}
                margin={{ top: 12, right: 0, bottom: 0, left: scale ? -24 : 0 }}
              >
                <XAxis dataKey="time_string" axisLine={false} tickLine={false} />
                {scale && (
                  <YAxis
                    dataKey={field}
                    scale={scale}
                    domain={[useStack ? 'dataMin' : _.min(stacks.map(s => _.minBy(chartData, `${s}_${field}`)?.[`${s}_${field}`])), useStack ? 'dataMax' : _.max(stacks.map(s => _.maxBy(chartData, `${s}_${field}`)?.[`${s}_${field}`]))]}
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => _numberFormat(v, '0,0a')}
                  />
                )}
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                {_.reverse(_.cloneDeep(stacks)).map((s, i) => (
                  <Bar
                    key={i}
                    stackId={useStack ? id : undefined}
                    dataKey={`${s}_${field}`}
                    fill={colors[s]}
                    minPointSize={scale && i === 0 ? 10 : 0}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer> :
            <div className="w-full h-full flex items-center justify-center">
              <Spinner name="ProgressBar" width={36} height={36} />
            </div>
          }
        </div>
      </CardBody>
    </Card>
  )
}