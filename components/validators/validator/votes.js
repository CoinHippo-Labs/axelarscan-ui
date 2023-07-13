import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import { Tooltip } from '@material-tailwind/react'
import _ from 'lodash'

import NumberDisplay from '../../number'
import Image from '../../image'
import { getChainData } from '../../../lib/config'

const PAGE_SIZE = 200

export default ({ data }) => {
  const { chains } = useSelector(state => ({ chains: state.chains }), shallowEqual)
  const { chains_data } = { ...chains }

  return (
    <div className="space-y-2">
      <div className="tracking-widest text-slate-600 dark:text-slate-400 text-sm lg:text-base font-semibold">
        EVM Votes
      </div>
      <div className="flex flex-wrap items-center my-1 -ml-0.5">
        {(data || _.range(0, PAGE_SIZE).map(i => { return { skeleton: true } })).map((d, i) => {
          const { id, sender_chain, height, vote, skeleton } = { ...d }
          const { image } = { ...getChainData(sender_chain, chains_data) }
          return (
            !skeleton ?
              <Link
                key={i}
                href={id ? `/evm-poll/${id}` : `/block/${height}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7"
              >
                <Tooltip
                  content={
                    id ?
                      <div className="flex items-center space-x-1.5">
                        <Image
                          src={image}
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                        <span>{id}</span>
                      </div> :
                      <NumberDisplay
                        value={height}
                        format="0,0"
                        className="font-normal"
                      />
                  }
                >
                  <div className={`w-6 h-6 ${typeof vote === 'boolean' ? vote ? 'bg-green-500 dark:bg-green-600' : 'bg-red-500 dark:bg-red-600' : 'bg-slate-400 dark:bg-slate-600'} m-0.5`} />
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