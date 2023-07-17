import { useSelector, shallowEqual } from 'react-redux'
import { Tooltip } from '@material-tailwind/react'
import _ from 'lodash'

import NumberDisplay from '../../../number'
import Image from '../../../image'
import TimeSpent from '../../../time/timeSpent'
import { getChainData } from '../../../../lib/config'
import { toArray, fixDecimals } from '../../../../lib/utils'

export default (
  {
    data,
    numberFormat = '0,0',
    prefix = '',
  },
) => {
  const { chains } = useSelector(state => ({ chains: state.chains }), shallowEqual)
  const { chains_data } = { ...chains }

  const { key, num_txs, express_execute, confirm, approve, total } = { ...data }
  const { name, image } = { ...getChainData(key, chains_data) }

  const Point = ({ title, name, noTooltip = false }) => {
    const point = (
      <div className="flex flex-col space-y-0.5">
        <div className="w-2 h-2 bg-blue-400 dark:bg-blue-500 rounded-full p-1" />
        <span className="uppercase text-blue-400 dark:text-blue-500 text-2xs font-medium">
          {title}
        </span>
      </div>
    )

    return (
      !noTooltip ?
        <Tooltip content={name}>
          {point}
        </Tooltip> :
        point
    )
  }
    

  let points = toArray([
    express_execute && { id: 'express_execute', title: 'X', name: 'Express', time_spent: express_execute },
    confirm && { id: 'confirm', title: 'C', name: 'Confirm', time_spent: confirm },
    approve && { id: 'approve', title: 'A', name: 'Approve', time_spent: approve },
    total && { id: 'execute', title: 'E', name: 'Execute', label: 'Total', time_spent: total },
  ])

  if (total) {
    points = points.map((p, i) => {
      const { time_spent } = { ...p }
      const value = time_spent - (i > 0 ? points[i - 1].time_spent : 0)
      return {
        ...p,
        value,
        width: fixDecimals(value * 100 / total),
      }
    })
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-800 bg-opacity-50 dark:bg-opacity-50 rounded flex flex-col sm:flex-row sm:justify-between space-y-2 sm:space-y-0 sm:space-x-2 p-3">
      <div className="w-40 space-y-0.5">
        <div className="flex items-center space-x-2">
          <Image
            src={image}
            width={20}
            height={20}
            className="rounded-full"
          />
          <span className="text-black dark:text-white text-sm font-semibold">
            {name}
          </span>
        </div>
        <NumberDisplay
          value={num_txs}
          format="0,0.00a"
          suffix=" transactions"
          className="whitespace-nowrap text-slate-500 dark:text-slate-300 text-xs font-medium"
        />
      </div>
      {total > 0 && (
        <div className="w-full">
          <div className="w-full flex items-center justify-between">
            <Point title="S" name="Start" />
            {points.map((p, i) => {
              const { title, name, value, width } = { ...p }
              return (
                <Tooltip
                  key={i}
                  placement="top-end"
                  content={
                    <div className="space-y-0.5">
                      <span>{name}</span>
                      <TimeSpent
                        fromTime={0}
                        toTime={value}
                        noTooltip={true}
                        className="font-medium"
                      />
                    </div>
                  }
                >
                  <div className="flex justify-between" style={{ width: `${width}%` }}>
                    <div className="w-full h-0.5 bg-blue-400 dark:bg-blue-500" style={{ marginTop: '3px' }} />
                    <Point title={title} name={name} noTooltip={true} />
                  </div>
                </Tooltip>
              )
            })}
          </div>
          <div className="w-full flex items-center justify-between ml-2">
            {points.map((p, i) => {
              const { id, name, label, time_spent, width } = { ...p }
              return (
                <div key={i} className="flex justify-end ml-2" style={{ width: `${width}%` }}>
                  {['express_execute', 'execute'].includes(id) ?
                    <Tooltip placement="bottom" content={label || name}>
                      <div>
                        <TimeSpent
                          fromTime={0}
                          toTime={time_spent}
                          noTooltip={true}
                          className="whitespace-nowrap text-black dark:text-white text-2xs font-medium"
                        />
                      </div>
                    </Tooltip> :
                    <div />
                  }
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}