import Link from 'next/link'
import { Tooltip } from '@material-tailwind/react'
import _ from 'lodash'

import NumberDisplay from '../../number'

const PAGE_SIZE = 200

export default ({ data }) => {
  return (
    <div className="space-y-2">
      <div className="tracking-widest text-slate-600 dark:text-slate-400 text-sm lg:text-base font-semibold">
        Uptimes
      </div>
      <div className="flex flex-wrap items-center my-1 -ml-0.5">
        {(data || _.range(0, PAGE_SIZE).map(i => { return { skeleton: true } })).map((d, i) => {
          const { height, status, skeleton } = { ...d }
          return (
            !skeleton ?
              <Link
                key={i}
                href={`/block/${height}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7"
              >
                <Tooltip content={<NumberDisplay value={height} format="0,0" className="font-normal" />}>
                  <div className={`w-6 h-6 ${status ? 'bg-green-500 dark:bg-green-600' : 'bg-slate-400 dark:bg-slate-600'} m-0.5`} />
                </Tooltip>
              </Link> :
              <div key={i} className="w-7 h-7">
                <div className="skeleton w-6 h-6 m-0.5" />
              </div>
          )
        })}
      </div>
    </div>
  )
}