import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import { Chip } from '@material-tailwind/react'
import Linkify from 'react-linkify'
import _ from 'lodash'
import moment from 'moment'

import Spinner from '../../spinner'
import NumberDisplay from '../../number'
import Copy from '../../copy'
import ValidatorProfile from '../../profile/validator'
import AccountProfile from '../../profile/account'
import { getType, getSender } from '../../../lib/transaction'
import { formatUnits } from '../../../lib/number'
import { toArray, includesStringList, ellipse, equalsIgnoreCase } from '../../../lib/utils'

const TIME_FORMAT = 'MMM D, YYYY h:mm:ss A'

export default ({ data }) => {
  const { validators } = useSelector(state => ({ validators: state.validators }), shallowEqual)
  const { validators_data } = { ...validators }

  const { tx, tx_response } = { ...data }
  const {
    txhash,
    height,
    code,
    timestamp,
    gas_used,
    gas_wanted,
  } = { ...tx_response }
  const { auth_info, body } = { ...tx }
  const { fee } = { ...auth_info }
  const { memo } = { ...body }
  const type = getType(tx_response)
  const sender = getSender(tx_response)
  const { operator_address, description } = { ...(sender && toArray(validators_data).find(v => includesStringList(sender, toArray([v.broadcaster_address, v.operator_address], 'lower')))) }
  const { moniker } = { ...description }

  const rowClassName = 'flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2'
  const titleClassName = 'w-40 lg:w-64 tracking-wider text-slate-600 dark:text-slate-400 text-sm lg:text-base font-semibold'

  return (
    <div className="bg-slate-50 dark:bg-slate-900 w-fit flex flex-col rounded-lg space-y-4 p-6">
      <div className={rowClassName}>
        <span className={titleClassName}>Tx Hash:</span>
        {data ?
          txhash && (
            <Copy
              size={20}
              value={txhash}
              title={
                <span className="text-sm lg:text-base font-semibold">
                  {ellipse(txhash, 16)}
                </span>
              }
            />
          ) :
          <Spinner name="ProgressBar" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>Block:</span>
        {data ?
          height && (
            <Link
              href={`/block/${height}`}
              className="text-blue-400 dark:text-blue-500 font-medium"
            >
              <NumberDisplay
                value={height}
                format="0,0"
                className="text-sm lg:text-base font-medium"
              />
            </Link>
          ) :
          <Spinner name="ProgressBar" />
        }
      </div>
      {type && (
        <div className={rowClassName}>
          <span className={titleClassName}>Type:</span>
          <div className="max-w-min bg-slate-100 dark:bg-slate-800 rounded capitalize text-sm lg:text-base font-medium py-1 px-2">
            {type}
          </div>
        </div>
      )}
      <div className={rowClassName}>
        <span className={titleClassName}>Status:</span>
        {data ?
          <Chip
            color={!code ? 'green' : 'red'}
            value={!code ? 'success' : 'failed'}
            className="chip text-sm lg:text-base font-medium py-0.5 px-2"
          /> :
          <Spinner name="ProgressBar" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>Time:</span>
        {data ?
          timestamp && (
            <span className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-sm lg:text-base font-medium">
              {moment(timestamp).fromNow()} ({moment(timestamp).format(TIME_FORMAT)})
            </span>
          ) :
          <Spinner name="ProgressBar" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>Sender:</span>
        {data ?
          <div className="text-sm lg:text-base">
            {description ?
              <div className="min-w-max flex items-start space-x-2">
                <Link
                  href={`/validator/${operator_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ValidatorProfile description={description} />
                </Link>
                <div className="flex flex-col">
                  <Link
                    href={`/validator/${operator_address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 font-medium"
                  >
                    {ellipse(moniker, 16)}
                  </Link>
                  <div className="flex items-center space-x-1">
                    <Link
                      href={`/validator/${operator_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 dark:text-slate-500"
                    >
                      {ellipse(operator_address, 10, 'axelarvaloper')}
                    </Link>
                    <Copy value={operator_address} />
                  </div>
                </div>
              </div> :
              operator_address ?
                <div className="flex items-center space-x-1">
                  <Link
                    href={`/validator/${operator_address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 font-medium"
                  >
                    {ellipse(operator_address, 10, 'axelarvaloper')}
                  </Link>
                  <Copy value={operator_address} />
                </div> :
                sender ?
                  <AccountProfile address={sender} url={true} /> :
                  '-'
            }
          </div> :
          <Spinner name="ProgressBar" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>Transaction Fee:</span>
        {data ?
          <NumberDisplay
            value={formatUnits(_.head(fee?.amount)?.amount || '0')}
            format="0,0.00000000"
            suffix=" AXL"
            className="text-sm lg:text-base font-semibold"
          /> :
          <Spinner name="ProgressBar" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>Gas Used:</span>
        {data ?
          gas_used && (
            <NumberDisplay
              value={gas_used}
              format="0,0"
              className="text-sm lg:text-base font-semibold"
            />
          ) :
          <Spinner name="ProgressBar" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>Gas Limit:</span>
        {data ?
          gas_wanted && (
            <NumberDisplay
              value={gas_wanted}
              format="0,0"
              className="text-sm lg:text-base font-semibold"
            />
          ) :
          <Spinner name="ProgressBar" />
        }
      </div>
      {memo && (
        <div className={rowClassName}>
          <span className={titleClassName}>Memo:</span>
          <span className="max-w-xl linkify break-words whitespace-pre-wrap text-slate-400 dark:text-slate-500 text-sm lg:text-base font-medium">
            <Linkify>
              {memo}
            </Linkify>
          </span>
        </div>
      )}
    </div>
  )
}