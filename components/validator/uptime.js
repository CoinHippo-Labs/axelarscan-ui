import Link from 'next/link'

import { BsArrowRightShort } from 'react-icons/bs'
import { IoArrowUpCircle } from 'react-icons/io5'
import { MdCancel } from 'react-icons/md'

import Widget from '../widget'
import Popover from '../popover'

import { numberFormat } from '../../lib/utils'

export default function Uptime({ data, validator_data }) {
  return (
    <Widget
      title={<span className="text-lg font-medium">Uptime</span>}
      right={<span className="whitespace-nowrap text-gray-400 dark:text-gray-600 sm:mr-1 xl:mr-1.5">Latest {numberFormat(process.env.NEXT_PUBLIC_NUM_UPTIME_DISPLAY_BLOCKS, '0,0')} Blocks</span>}
      className="dark:border-gray-900"
    >
      <div className="flex flex-wrap items-center my-1 -ml-0.5">
        {(data || [...Array(Number(process.env.NEXT_PUBLIC_NUM_UPTIME_DISPLAY_BLOCKS)).keys()].map(i => { return { i, skeleton: true } })
        ).map((block, i) => (
          !block.skeleton ?
            <Popover
              key={i}
              placement="top"
              title={<div className="flex items-center justify-between space-x-2">
                <span className="font-bold">Block: {numberFormat(block.height, '0,0')}</span>
                <Link href={`/block/${block.height}`}>
                  <a className="flex items-center text-blue-600 dark:text-white ml-auto">
                    <span className="text-xs">Go to Block</span>
                    <BsArrowRightShort size={16} />
                  </a>
                </Link>
              </div>}
              content={<div className="flex flex-col space-y-2">
                {block.up ?
                  <span className="flex items-center text-green-600 dark:text-green-400 text-lg space-x-1">
                    <IoArrowUpCircle size={24} />
                    <span>Up</span>
                  </span>
                  :
                  <span className="flex items-center text-red-600 dark:text-red-400 text-lg space-x-1">
                    <MdCancel size={24} />
                    <span>Down</span>
                  </span>
                }
              </div>}
              className="w-7 h-7"
            >
              <div
                title={numberFormat(block.height, '0,0')}
                className={`w-6 md:w-6 h-6 md:h-6 ${block.up ? 'bg-green-600 dark:bg-green-700' : 'bg-gray-400 dark:bg-gray-700'} rounded m-1`}
              />
            </Popover>
            :
            <div key={i} className="w-7 h-7">
              <div className={`skeleton w-6 md:w-6 h-6 md:h-6 rounded m-0.5`} />
            </div>
        ))}
      </div>
    </Widget>
  )
}