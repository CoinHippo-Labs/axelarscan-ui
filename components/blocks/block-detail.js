import Link from 'next/link'

import moment from 'moment'
import { Img } from 'react-image'

import Widget from '../widget'
import Copy from '../copy'

import { numberFormat, ellipseAddress } from '../../lib/utils'

export default function BlockDetail({ data, validator_data }) {
  if (data?.proposer_address && validator_data?.consensus_address === data.proposer_address) {
    data.operator_address = validator_data.operator_address

    if (validator_data.description) {
      data.proposer_name = validator_data.description.moniker
      data.proposer_image = validator_data.description.image
    }
  }

  return (
    <Widget>
      <div className="w-full grid grid-flow-row grid-cols-1 sm:grid-cols-2 gap-2 lg:gap-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center space-x-0 lg:space-x-2">
          <span className="font-semibold">Height:</span>
          {data ?
            <span>{numberFormat(data.height, '0,0')}</span>
            :
            <div className="skeleton w-16 h-4" />
          }
        </div>
        <div className="flex flex-col lg:flex-row items-start lg:items-center space-x-0 lg:space-x-2">
          <span className="font-semibold">Block Hash:</span>
          {data ?
            <span className="flex items-center space-x-1">
              <span>{ellipseAddress(data.hash, 16)}</span>
              <Copy text={data.hash} />
            </span>
            :
            <div className="skeleton w-60 h-4" />
          }
        </div>
        <div className="flex flex-col lg:flex-row items-start lg:items-center space-x-0 lg:space-x-2">
          <span className="font-semibold">Block Time:</span>
          {data ?
            <div className="flex items-center space-x-1">
              <span className="text-gray-500 dark:text-gray-400">{moment(data.time).fromNow()}</span>
              <span className="text-xs font-medium">({moment(data.time).format('MMM D, YYYY h:mm:ss A')})</span>
            </div>
            :
            <div className="skeleton w-48 h-4" />
          }
        </div>
        <div className="flex flex-col lg:flex-row items-start lg:items-center space-x-0 lg:space-x-2">
          <span className="font-semibold">No. of TXs:</span>
          {data ?
            data.txs > -1 ?
              <span>{numberFormat(data.txs, '0,0')}</span>
              :
              <span>-</span>
            :
            <div className="skeleton w-10 h-4" />
          }
        </div>
        <div className={`flex flex-col lg:flex-row items-start lg:items-${!data || data.proposer_name ? 'start' : 'center'} space-x-0 lg:space-x-2`}>
          <span className="font-semibold">Proposer:</span>
          {data ?
            data.operator_address ?
              <div className={`min-w-max flex items-${data.proposer_name ? 'start' : 'center'} space-x-2`}>
                <Link href={`/validator/${data.operator_address}`}>
                  <a>
                    {data.proposer_image ?
                      <Img
                        src={data.proposer_image}
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                      :
                      <div className="skeleton w-6 h-6 rounded-full" />
                    }
                  </a>
                </Link>
                <div className="flex flex-col">
                  {data.proposer_name && (
                    <Link href={`/validator/${data.operator_address}`}>
                      <a className="text-blue-600 dark:text-white font-medium">
                        {data.proposer_name || data.operator_address}
                      </a>
                    </Link>
                  )}
                  <span className="flex items-center space-x-1">
                    <Link href={`/validator/${data.operator_address}`}>
                      <a className="text-gray-500 font-light">
                        {process.env.NEXT_PUBLIC_PREFIX_VALIDATOR}{ellipseAddress(data.operator_address?.replace(process.env.NEXT_PUBLIC_PREFIX_VALIDATOR, ''), 8)}
                      </a>
                    </Link>
                    <Copy text={data.operator_address} />
                  </span>
                </div>
              </div>
              :
              data.proposer_address ?
                <div className="flex items-center space-x-1">
                  <span className="text-gray-500">
                    {process.env.NEXT_PUBLIC_PREFIX_CONSENSUS}{ellipseAddress(data.proposer_address?.replace(process.env.NEXT_PUBLIC_PREFIX_CONSENSUS, ''), 8)}
                  </span>
                  <Copy text={data.proposer_address} />
                </div>
                :
                null
            :
            <div className="flex items-start space-x-2">
              <div className="skeleton w-6 h-6 rounded-full" />
              <div className="flex flex-col space-y-1.5">
                <div className="skeleton w-24 h-4" />
                <div className="skeleton w-32 h-3" />
              </div>
            </div>
          }
        </div>
      </div>
    </Widget>
  )
}