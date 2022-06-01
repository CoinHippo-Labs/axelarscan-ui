import Link from 'next/link'
import { RiArrowUpCircleFill, RiArrowDownCircleFill } from 'react-icons/ri'

import Popover from '../popover'
import { number_format } from '../../lib/utils'

const num_heartbeat_display_blocks = parseInt(Number(process.env.NEXT_PUBLIC_NUM_HEARTBEAT_BLOCKS) / Number(process.env.NEXT_PUBLIC_NUM_BLOCKS_PER_HEARTBEAT))

export default ({ data }) => {
  return (
    <div className="flex flex-wrap items-center my-1 -ml-0.5">
      {(data || [...Array(num_heartbeat_display_blocks).keys()].map(i => { return { skeleton: true } })).map((b, i) => (
        !b?.skeleton ?
          <Popover
            key={i}
            placement="top"
            title={<div className="flex items-center space-x-1.5">
              <span className="normal-case text-base font-semibold">Block:</span>
              {b?.height && (
                <Link href={`/block/${b.height}`}>
                  <a className="text-base text-blue-600 dark:text-white font-bold">
                    {number_format(b.height, '0,0')}
                  </a>
                </Link>
              )}
            </div>}
            content={<div className={`flex items-center ${b?.up ? 'text-green-500 dark:text-green-600' : 'text-red-500 dark:text-red-600'} space-x-1.5`}>
              {b?.up ?
                <RiArrowUpCircleFill size={24} /> :
                <RiArrowDownCircleFill size={24} />
              }
              <span className="uppercase text-lg font-bold">
                {b?.up ?
                  'up' : 'down'
                }
              </span>
            </div>}
            className="w-7 h-7"
          >
            <Link href={`/block/${b.height}`}>
              <div
                title={number_format(b?.height, '0,0')}
                className={`w-6 h-6 ${b?.up ? 'bg-green-500 dark:bg-green-600' : 'bg-slate-400 dark:bg-slate-600'} rounded m-1`}
              />
            </Link>
          </Popover>
          :
          <div
            key={i}
            className="w-7 h-7"
          >
            <div className="skeleton w-6 h-6 rounded m-0.5" />
          </div>
      ))}
    </div>
  )
}