import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import moment from 'moment'
import Linkify from 'react-linkify'
import { ProgressBar } from 'react-loader-spinner'
import { BiCheckCircle, BiXCircle } from 'react-icons/bi'

import Copy from '../copy'
import ValidatorProfile from '../validator-profile'
import AccountProfile from '../account-profile'
import { number_format, name, ellipse, equalsIgnoreCase, loader_color } from '../../lib/utils'

export default (
  {
    data,
  },
) => {
  const {
    preferences,
    validators,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        validators: state.validators,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    validators_data,
  } = { ...validators }

  const {
    txhash,
    height,
    type,
    status,
    timestamp,
    sender,
    fee,
    symbol,
    gas_used,
    gas_limit,
    memo,
  } = { ...data }

  const validator_data =
    sender &&
    (validators_data || [])
      .find(v =>
        equalsIgnoreCase(
          v?.broadcaster_address,
          sender,
        )
      )

  const {
    operator_address,
    description,
  } = { ...validator_data }
  const {
    moniker,
  } = { ...description }

  const rowClassName = 'flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2'
  const titleClassName = 'w-40 lg:w-64 tracking-wider text-slate-600 dark:text-slate-300 text-sm lg:text-base font-medium'

  return (
    <div className="bg-slate-100 dark:bg-slate-900 bg-opacity-75 dark:bg-opacity-75 w-fit flex flex-col rounded-lg space-y-4 py-6 px-5">
      <div className={rowClassName}>
        <span className={titleClassName}>
          Tx Hash:
        </span>
        {data ?
          txhash &&
          (
            <Copy
              size={20}
              value={txhash}
              title={
                <span className="cursor-pointer break-all text-black dark:text-white text-sm lg:text-base font-medium">
                  {txhash}
                </span>
              }
            />
          ) :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Block:
        </span>
        {data ?
          height &&
          (
            <Link href={`/block/${height}`}>
              <a className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 text-sm lg:text-base font-medium">
                {number_format(
                  height,
                  '0,0',
                )}
              </a>
            </Link>
          ) :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      {
        (
          !data ||
          type
        ) &&
        (
          <div className={rowClassName}>
            <span className={titleClassName}>
              Type:
            </span>
            {data ?
              <div className="max-w-min bg-slate-200 dark:bg-slate-800 rounded capitalize text-sm lg:text-base font-medium py-1 px-2">
                {name(type)}
              </div> :
              <ProgressBar
                borderColor={loader_color(theme)}
                width="24"
                height="24"
              />
            }
          </div>
        )
      }
      <div className={rowClassName}>
        <span className={titleClassName}>
          Status:
        </span>
        {data ?
          status &&
          (
            <div className={`${status === 'success' ? 'text-green-400 dark:text-green-300' : 'text-red-500 dark:text-red-600'} flex items-center space-x-1`}>
              {status === 'success' ?
                <BiCheckCircle
                  size={20}
                /> :
                <BiXCircle
                  size={20}
                />
              }
              <span className="uppercase text-sm lg:text-base font-semibold">
                {status}
              </span>
            </div>
          ) :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Time:
        </span>
        {data ?
          timestamp &&
          (
            <span className="whitespace-nowrap text-slate-400 dark:text-slate-600 text-sm lg:text-base font-normal">
              {
                moment(timestamp)
                  .fromNow()
              } ({
                moment(timestamp)
                  .format('MMM D, YYYY h:mm:ss A')
              })
            </span>
          ) :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Sender:
        </span>
        {data ?
          validator_data ?
            <div className={`min-w-max flex items-${moniker ? 'start' : 'center'} space-x-2`}>
              <Link href={`/validator/${operator_address}`}>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ValidatorProfile
                    validator_description={description}
                  />
                </a>
              </Link>
              <div className="flex flex-col">
                {
                  moniker &&
                  (
                    <Link href={`/validator/${operator_address}`}>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                      >
                        {ellipse(
                          moniker,
                          16,
                        )}
                      </a>
                    </Link>
                  )
                }
                <div className="flex items-center space-x-1">
                  <Link href={`/validator/${operator_address}`}>
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 dark:text-slate-600"
                    >
                      {ellipse(
                        operator_address,
                        10,
                        process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                      )}
                    </a>
                  </Link>
                  <Copy
                    value={operator_address}
                  />
                </div>
              </div>
            </div> :
            sender ?
              <AccountProfile
                address={sender}
                url={true}
              /> :
              <span>
                -
              </span> :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Transaction Fee:
        </span>
        {data ?
          <span className="uppercase text-sm lg:text-base font-medium space-x-1">
            {fee > 0 ?
              <>
                <span>
                  {number_format(
                    fee,
                    '0,0.00000000',
                    true,
                  )}
                </span>
                <span>
                  {symbol}
                </span>
              </> :
              'No Fee'
            }
          </span> :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Gas Used:
        </span>
        {data ?
          gas_used &&
          (
            <span className="text-sm lg:text-base font-medium">
              {number_format(
                gas_used,
                '0,0',
                true,
              )}
            </span>
          ) :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Gas Limit:
        </span>
        {data ?
          gas_limit &&
          (
            <span className="text-sm lg:text-base font-medium">
              {number_format(
                gas_limit,
                '0,0',
                true,
              )}
            </span>
          ) :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      {
        memo &&
        (
          <div className={rowClassName}>
            <span className={titleClassName}>
              Memo:
            </span>
            <span className="linkify break-all text-slate-400 dark:text-slate-600 text-sm lg:text-base font-normal">
              <Linkify>
                {memo}
              </Linkify>
            </span>
          </div>
        )
      }
    </div>
  )
}