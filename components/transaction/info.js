import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import moment from 'moment'
import { BiCheckCircle, BiXCircle } from 'react-icons/bi'

import Copy from '../copy'
import ValidatorProfile from '../validator-profile'
import { number_format, name, ellipse, equals_ignore_case } from '../../lib/utils'

export default ({ data }) => {
  const { validators } = useSelector(state => ({ validators: state.validators }), shallowEqual)
  const { validators_data } = { ...validators }

  const validator_data = data?.sender && validators_data?.find(v => equals_ignore_case(v?.broadcaster_address, data.sender))
  const rowClassName = 'flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2'
  const titleClassName = 'w-40 lg:w-64 text-sm lg:text-base font-bold'

  return (
    <div className="w-full flex flex-col space-y-4">
      <div className={rowClassName}>
        <span className={titleClassName}>
          Tx Hash:
        </span>
        {data ?
          data.txhash && (
            <Copy
              value={data.txhash}
              title={<span className="cursor-pointer break-all text-black dark:text-white text-sm lg:text-base font-semibold">
                {data.txhash}
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
          Block:
        </span>
        {data ?
          data.height && (
            <Link href={`/block/${data.height}`}>
              <a className="text-blue-600 dark:text-white text-sm lg:text-base font-bold">
                {number_format(data.height, '0,0')}
              </a>
            </Link>
          )
          :
          <div className="skeleton w-40 h-6 mt-1" />
        }
      </div>
      {(!data || data.type) && (
        <div className={rowClassName}>
          <span className={titleClassName}>
            Type:
          </span>
          {data ?
            <div className="max-w-min bg-slate-100 dark:bg-slate-900 rounded-lg capitalize text-sm lg:text-base font-semibold py-0.5 px-2">
              {name(data.type)}
            </div>
            :
            <div className="skeleton w-40 h-6 mt-1" />
          }
        </div>
      )}
      <div className={rowClassName}>
        <span className={titleClassName}>
          Status:
        </span>
        {data ?
          data.status && (
            <div className={`max-w-min ${data.status === 'success' ? 'bg-green-400 dark:bg-green-500 text-white' : 'bg-red-400 dark:bg-red-500 text-white'} rounded-lg uppercase flex items-center text-sm lg:text-base font-semibold space-x-1 py-0.5 px-2`}>
              {data.status === 'success' ?
                <BiCheckCircle size={20} />
                :
                <BiXCircle size={20} />
              }
              <span>
                {data.status}
              </span>
            </div>
          )
          :
          <div className="skeleton w-40 h-6 mt-1" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Time:
        </span>
        {data ?
          data.timestamp && (
            <span className="text-slate-400 dark:text-slate-600 text-sm lg:text-base font-medium">
              {moment(data.timestamp).fromNow()} ({moment(data.timestamp).format('MMM D, YYYY h:mm:ss A')})
            </span>
          )
          :
          <div className="skeleton w-40 h-6 mt-1" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Sender:
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
            data.sender ?
              <div className="flex items-center space-x-1">
                <Link href={`/account/${data.sender}`}>
                  <a className="text-blue-600 dark:text-white text-sm lg:text-base font-semibold">
                    {ellipse(data.sender, 12, process.env.NEXT_PUBLIC_PREFIX_ACCOUNT)}
                  </a>
                </Link>
                <Copy
                  value={data.sender}
                  size={18}
                />
              </div>
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
          Transaction Fee:
        </span>
        {data ?
          <span className="text-sm lg:text-base font-semibold">
            {data.fee > 0 ?
              `${number_format(data.fee, '0,0.00000000')} ${data.symbol?.toUpperCase() || ''}` :
              'No Fee'
            }
          </span>
          :
          <div className="skeleton w-40 h-6 mt-1" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Gas Used:
        </span>
        {data ?
          <span className="text-sm lg:text-base font-semibold">
            {number_format(data.gas_used, '0,0') || '-'}
          </span>
          :
          <div className="skeleton w-40 h-6 mt-1" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Gas Limit:
        </span>
        {data ?
          <span className="text-sm lg:text-base font-semibold">
            {number_format(data.gas_limit, '0,0') || '-'}
          </span>
          :
          <div className="skeleton w-40 h-6 mt-1" />
        }
      </div>
      {data?.memo && (
        <div className={rowClassName}>
          <span className={titleClassName}>
            Memo:
          </span>
          {data ?
            <span className="break-all text-slate-400 dark:text-slate-600 text-sm lg:text-base">
              {data.memo}
            </span>
            :
            <div className="skeleton w-40 h-6 mt-1" />
          }
        </div>
      )}
    </div>
  )
}