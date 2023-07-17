import { Card, CardBody } from '@material-tailwind/react'

import TimeSpent from './time-spent'
import Spinner from '../../../spinner'
import { toArray } from '../../../../lib/utils'

export default (
  {
    data,
    title = 'GMP Time Spent',
    description = 'The median time spent of General Message Passing from each chain',
  },
) => {
  const { GMPStatsAVGTimes } = { ...data }
  const { time_spents } = { ...GMPStatsAVGTimes }

  return (
    <Card className="card">
      <CardBody className="space-y-4">
        <div className="flex flex-col">
          <span className="text-black dark:text-white text-base font-semibold">
            {title}
          </span>
          {description && (
            <span className="text-slate-400 dark:text-slate-500 text-sm font-normal">
              {description}
            </span>
          )}
        </div>
        <div className="w-full">
          {data ?
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {toArray(time_spents).map((t, i) => <TimeSpent key={i} data={t} />)}
            </div> :
            <div className="w-full h-full flex items-center justify-center">
              <Spinner name="ProgressBar" width={36} height={36} />
            </div>
          }
        </div>
      </CardBody>
    </Card>
  )
}