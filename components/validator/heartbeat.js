import Link from 'next/link'

import _ from 'lodash'
import { BsArrowRightShort } from 'react-icons/bs'
import { IoArrowUpCircle } from 'react-icons/io5'
import { MdCancel } from 'react-icons/md'
import { FiKey } from 'react-icons/fi'

import Widget from '../widget'
import Popover from '../popover'

import { numberFormat, getName } from '../../lib/utils'

export default function Heartbeat({ data, validator_data }) {
  return (
    <Widget
      title={<div className="flex items-center space-x-1">
        <span className="text-lg font-medium">Heartbeat</span>
        {data && (
          <span className="whitespace-nowrap text-gray-400 dark:text-gray-600 mt-0.5">({numberFormat(data.filter(_heartbeat => _heartbeat.up).length, '0,0')} / {numberFormat(data.length, '0,0')})</span>
        )}
      </div>}
      right={<span className="whitespace-nowrap text-gray-400 dark:text-gray-600 sm:mr-1 xl:mr-1.5">Latest {numberFormat(process.env.NEXT_PUBLIC_NUM_HEARTBEAT_BLOCKS, '0,0')} Blocks</span>}
      className="dark:border-gray-900"
    >
      <div className="flex flex-wrap items-center my-1 -ml-0.5">
        {(data || [...Array(Number(process.env.NEXT_PUBLIC_NUM_HEARTBEAT_BLOCKS) / Number(process.env.NEXT_PUBLIC_NUM_BLOCKS_PER_HEARTBEAT)).keys()].map(i => { return { i, skeleton: true } })
        ).map((block, i) => {
          const ineligibilities = (block?.ineligibilities && Object.entries(block.ineligibilities).filter(([key, value]) => value).map(([key, value]) => key)) || []

          return !block.skeleton ?
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
              content={<div className="flex flex-col space-y-1.5">
                {block.up ?
                  ineligibilities.length > 0 ?
                    <>
                      {ineligibilities.length > 0 && (
                        <div className="flex flex-col space-y-1.5">
                          <span className="font-bold space-x-1.5">
                            <span>Ineligibilities</span>
                          </span>
                          {ineligibilities.map((ineligibility, i) => (
                            <span key={i} className={`max-w-min bg-${['tombstoned', 'jailed'].includes(ineligibility) ? 'red' : 'yellow'}-500 rounded-xl whitespace-nowrap capitalize text-white font-semibold px-2 py-1`}>{getName(ineligibility)}</span>
                          ))}
                        </div>
                      )}
                    </>
                    :
                    <span className="flex items-center text-green-600 dark:text-green-400 text-lg space-x-1">
                      <IoArrowUpCircle size={24} />
                      <span>Up</span>
                    </span>
                  :
                  <span className="flex items-center text-red-600 dark:text-red-400 text-lg space-x-1">
                    <MdCancel size={24} />
                    <span>No Response</span>
                  </span>
                }
                {block?.key_ids && (
                  <div className="flex flex-col space-y-0 ml-0.5">
                    <span className="font-bold space-x-1.5">
                      <span>Key IDs</span>
                    </span>
                    {block.key_ids.length > 0 ?
                      <div className="max-h-24 overflow-y-auto">
                        {block.key_ids.map((key_id, i) => (
                          <span key={i} className="flex items-center space-x-1">
                            <FiKey size={16} className="text-gray-600 dark:text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400 font-medium">{key_id}</span>
                          </span>
                        ))}
                      </div>
                      :
                      <span>-</span>
                    }
                  </div>
                )}
              </div>}
              className="w-7 h-7"
            >
              <div
                title={numberFormat(block.height, '0,0')}
                className={`w-6 md:w-6 h-6 md:h-6 ${block.up ? ineligibilities.length > 0 ? ineligibilities.findIndex(ineligibility => ['tombstoned', 'jailed'].includes(ineligibility)) > -1 ? 'bg-red-600' : 'bg-yellow-400 dark:bg-yellow-500' : 'bg-green-600 dark:bg-green-700' : 'bg-gray-400 dark:bg-gray-700'} rounded m-1`}
              />
            </Popover>
            :
            <div key={i} className="w-7 h-7">
              <div className={`skeleton w-6 md:w-6 h-6 md:h-6 rounded m-0.5`} />
            </div>
        })}
      </div>
    </Widget>
  )
}