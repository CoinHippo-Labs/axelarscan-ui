import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Popover, PopoverHandler, PopoverContent, Tooltip } from '@material-tailwind/react'
import _ from 'lodash'
import moment from 'moment'
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs'

import Spinner from '../../spinner'
import NumberDisplay from '../../number'
import Copy from '../../copy'
import ValidatorProfile from '../../profile/validator'
import AccountProfile from '../../profile/account'
import { getValidatorSets } from '../../../lib/api/lcd'
import { toArray, includesStringList, ellipse, equalsIgnoreCase } from '../../../lib/utils'

const TIME_FORMAT = 'MMM D, YYYY h:mm:ss A'

export default ({ data }) => {
  const { _validators } = useSelector(state => ({ _validators: state.validators }), shallowEqual)
  const { validators_data } = { ..._validators }

  const [validatorSets, setValidatorSets] = useState(null)

  useEffect(
    () => {
      const getData = async () => {
        if (height && validators_data) {
          const response = await getValidatorSets(height)
          const { validators } = { ...response?.result }
          setValidatorSets(
            toArray(validators).map(v => {
              const { address } = { ...v }
              return {
                ...v,
                ...validators_data.find(_v => equalsIgnoreCase(_v.consensus_address, address)),
              }
            })
          )
        }
      }
      getData()
    },
    [data, validators_data],
  )

  const { block, block_id, round, validators } = { ...data }
  const { height, proposer_address, time } = { ...block?.header }
  const { txs } = { ...block?.data }
  const { hash } = { ...block_id }
  const { operator_address, description } = { ...(proposer_address && toArray(validators_data).find(v => includesStringList(proposer_address, toArray(v.consensus_address, 'lower')))) }
  const { moniker } = { ...description }

  const signed_validators_data = toArray(validatorSets).filter(v => toArray(validators).includes(v.address))
  const unsigned_validators_data = toArray(validatorSets).filter(v => !toArray(validators).includes(v.address))

  const renderValidators = data => {
    return (
      <div className="overflow-y-auto grid grid-flow-row grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {toArray(data).length > 0 ?
          toArray(data).map((d, i) => {
            const { operator_address, description } = { ...d }
            const { moniker } = { ...description }
            return (
              <div key={i}>
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
                      {/*<div className="flex items-center space-x-1">
                        <Link
                          href={`/validator/${operator_address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 dark:text-slate-500"
                        >
                          {ellipse(operator_address, 6, 'axelarvaloper')}
                        </Link>
                        <Copy value={operator_address} />
                      </div>*/}
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
                        {ellipse(operator_address, 6, 'axelarvaloper')}
                      </Link>
                      <Copy value={operator_address} />
                    </div> :
                    '-'
                }
              </div>
            )
          }) :
          '-'
        }
      </div>
    )
  }

  const rowClassName = 'flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2'
  const titleClassName = 'w-40 lg:w-64 tracking-wider text-slate-600 dark:text-slate-400 text-sm lg:text-base font-semibold'

  return (
    <div className="bg-slate-50 dark:bg-slate-900 w-fit flex flex-col rounded-lg space-y-4 p-6">
      <div className={`${rowClassName} sm:items-center`}>
        <span className={titleClassName}>Height:</span>
        {data ?
          height && (
            <div className="flex items-center space-x-3">
              <NumberDisplay
                value={height}
                format="0,0"
                className="text-sm lg:text-base font-semibold"
              />
              <div className="flex items-center space-x-1">
                <Tooltip content={Number(height) - 1}>
                  <Link
                    href={`/block/${Number(height) - 1}`}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded p-2"
                  >
                    <BsChevronLeft size={14} />
                  </Link>
                </Tooltip>
                <Tooltip content={Number(height) + 1}>
                  <Link
                    href={`/block/${Number(height) + 1}`}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded p-2"
                  >
                    <BsChevronRight size={14} />
                  </Link>
                </Tooltip>
              </div>
            </div>
          ) :
          <Spinner name="ProgressBar" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>Block Hash:</span>
        {data ?
          hash && (
            <Copy
              size={20}
              value={hash}
              title={
                <span className="text-sm lg:text-base font-medium">
                  {ellipse(hash, 16)}
                </span>
              }
            />
          ) :
          <Spinner name="ProgressBar" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>Block Time:</span>
        {data ?
          time && (
            <span className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-sm lg:text-base font-normal">
              {moment(time).fromNow()} ({moment(time).format(TIME_FORMAT)})
            </span>
          ) :
          <Spinner name="ProgressBar" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>Proposer:</span>
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
                proposer_address ?
                  <AccountProfile address={proposer_address} url={true} /> :
                  '-'
            }
          </div> :
          <Spinner name="ProgressBar" />
        }
      </div>
      {typeof round === 'number' && (
        <div className={rowClassName}>
          <span className={titleClassName}>Round:</span>
          <NumberDisplay
            value={round}
            format="0,0"
            className="text-sm lg:text-base font-semibold"
          />
        </div>
      )}
      {validators && validatorSets && (
        <div className={rowClassName}>
          <span className={titleClassName}>Signer / Absent:</span>
          <div className="flex items-center space-x-1.5">
            <Popover placement="bottom">
              <PopoverHandler>
                <button>
                  <NumberDisplay
                    value={_.sumBy(signed_validators_data, 'tokens') * 100 / _.sumBy(_.concat(signed_validators_data, unsigned_validators_data), 'tokens')}
                    format="0,0.00"
                    prefix={`${signed_validators_data.length} (`}
                    suffix="%)"
                    noTooltip={true}
                    className="text-sm lg:text-base font-semibold"
                  />
                </button>
              </PopoverHandler>
              <PopoverContent>
                <div className="space-y-2">
                  <div>Signed by</div>
                  {renderValidators(signed_validators_data)}
                </div>
              </PopoverContent>
            </Popover>
            <span>/</span>
            <Popover placement="bottom">
              <PopoverHandler>
                <button>
                  <NumberDisplay
                    value={unsigned_validators_data.length}
                    format="0,0"
                    noTooltip={true}
                    className="text-sm lg:text-base font-semibold"
                  />
                </button>
              </PopoverHandler>
              <PopoverContent>
                <div className="space-y-2">
                  <div>Missing</div>
                  {renderValidators(unsigned_validators_data)}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
      <div className={rowClassName}>
        <span className={titleClassName}>Transactions:</span>
        {data ?
          <NumberDisplay
            value={toArray(txs).length}
            format="0,0"
            className="text-sm lg:text-base font-semibold"
          /> :
          <Spinner name="ProgressBar" />
        }
      </div>
    </div>
  )
}