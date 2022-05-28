import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import moment from 'moment'

import Copy from '../copy'
import ValidatorProfile from '../validator-profile'
import { number_format, ellipse, equals_ignore_case } from '../../lib/utils'

export default ({ data }) => {
  const { validators } = useSelector(state => ({ validators: state.validators }), shallowEqual)
  const { validators_data } = { ...validators }

  const { height, hash, time, num_txs, proposer_address } = { ...data }
  const validator_data = validators_data?.find(v => equals_ignore_case(v?.consensus_address, proposer_address))
  const rowClassName = 'flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2'
  const titleClassName = 'w-40 lg:w-64 text-xs lg:text-base font-bold'

  return (
    <div className="w-full flex flex-col space-y-4">
      <div className={rowClassName}>
        <span className={titleClassName}>
          Height:
        </span>
        {data ?
          height && (
            <span className="text-xs lg:text-base font-semibold">
              {number_format(height, '0,0')}
            </span>
          )
          :
          <div className="skeleton w-40 h-6 mt-1" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Block Hash:
        </span>
        {data ?
          hash && (
            <Copy
              value={hash}
              title={<span className="cursor-pointer break-all text-black dark:text-white text-xs lg:text-base font-semibold">
                {hash}
              </span>}
              size={20}
            />
          )
          :
          <div className="skeleton w-40 h-6 mt-1" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
         Block Time:
        </span>
        {data ?
          time && (
            <span className="text-slate-400 dark:text-slate-600 text-xs lg:text-base font-medium">
              {moment(time).fromNow()} ({moment(time).format('MMM D, YYYY h:mm:ss A')})
            </span>
          )
          :
          <div className="skeleton w-40 h-6 mt-1" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Proposer:
        </span>
        {data ?
          validator_data ?
            <div className="min-w-max flex items-start space-x-2">
              <Link href={`/validator/${validator_data.operator_address}`}>
                <a>
                  <ValidatorProfile validator_description={validator_data.description} />
                </a>
              </Link>
              <div className="flex flex-col">
                {validator_data.description?.moniker && (
                  <Link href={`/validator/${validator_data.operator_address}`}>
                    <a className="text-blue-600 dark:text-white font-bold">
                      {ellipse(validator_data.description.moniker, 16)}
                    </a>
                  </Link>
                )}
                <div className="flex items-center space-x-1">
                  <Link href={`/validator/${validator_data.operator_address}`}>
                    <a className="text-slate-400 dark:text-slate-600 font-medium">
                      {ellipse(validator_data.operator_address, 12, process.env.NEXT_PUBLIC_PREFIX_VALIDATOR)}
                    </a>
                  </Link>
                  <Copy value={validator_data.operator_address} />
                </div>
              </div>
            </div>
            :
            proposer_address ?
              <Copy
                value={proposer_address}
                title={<span className="cursor-pointer text-slate-400 dark:text-slate-600 text-xs lg:text-base font-semibold">
                  {ellipse(proposer_address, 8, process.env.NEXT_PUBLIC_PREFIX_CONSENSUS)}
                </span>}
                size={18}
              />
              :
              <span>
                -
              </span>
          :
          <div className="skeleton w-40 h-6 mt-1" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Transactions:
        </span>
        {data ?
          <span className="font-mono text-xs lg:text-base font-semibold">
            {num_txs > -1 ?
              `${number_format(num_txs, '0,0')}` : '-'
            }
          </span>
          :
          <div className="skeleton w-40 h-6 mt-1" />
        }
      </div>
    </div>
  )
}