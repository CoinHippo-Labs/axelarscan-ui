import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useSelector, shallowEqual } from 'react-redux'

import { BsArrowRight } from 'react-icons/bs'

import Copy from '../copy'

import { type } from '../../lib/object/id'
import { numberFormat, getName, ellipseAddress, convertToJson } from '../../lib/utils'

export default function TransactionLogs({ data }) {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const ReactJson = typeof window !== 'undefined' && dynamic(import('react-json-view'))

  const getHasActivities = a => a && !a.failed && !(['update_client'].includes(a.type)) && !(['KeygenTraffic', 'SignPendingTransfers', 'ExecutePendingTransfers', 'VoteConfirmDeposit', 'VoteSig'].includes(a.action))
  const alreadyShowBody = data?.activities?.findIndex(a => !getHasActivities(a)) > -1

  return (
    <div className="flex flex-col space-y-4 mt-3">
      {(data ?
        (data.activities || []).map((a, i) => { return { ...a, i, outPointInfo: convertToJson(a.outPointInfo) } })
        :
        [...Array(1).keys()].map(i => { return { i, skeleton: true } })
      ).map((a, i) => {
        const body = !a.skeleton && data?.tx && (
          <div className="max-w-3xl">
            <ReactJson src={data.tx.body?.messages || data.tx} theme={theme === 'dark' ? 'harmonic' : 'rjv-default'} />
          </div>
        )

        const hasActivities = getHasActivities(a)

        return (
          <div key={i}>
            <div className="md:min-w-max max-w-3xl bg-white dark:bg-gray-900 overflow-x-auto rounded-xl shadow-lg flex items-center space-x-4 p-4">
              {a.skeleton || hasActivities ?
                <>
                  {(a.skeleton || (a.sender && !a.depositor)) && (
                    <div className="flex flex-col">
                      {!a.skeleton ?
                        <>
                          <div className="flex items-center text-2xs lg:text-base space-x-1">
                            <Link href={`/${type(a.sender)}/${a.sender}`}>
                              <a className="uppercase text-blue-600 dark:text-white font-medium">
                                {ellipseAddress(a.sender, 16)}
                              </a>
                            </Link>
                            <Copy text={a.sender} />
                          </div>
                          <span className="text-xs font-semibold">{a.sender_name || 'Sender'}</span>
                        </>
                        :
                        <>
                          <div className="skeleton w-60 h-6" />
                          <div className="skeleton w-24 h-4 mt-2" />
                        </>
                      }
                    </div>
                  )}
                  {a.depositor && (
                    <div className="flex flex-col">
                      {!a.skeleton ?
                        <>
                          <div className="flex items-center text-2xs lg:text-base space-x-1">
                            <Link href={`/${type(a.depositor)}/${a.depositor}`}>
                              <a className="uppercase text-blue-600 dark:text-white font-medium">
                                {ellipseAddress(a.depositor, 16)}
                              </a>
                            </Link>
                            <Copy text={a.depositor} />
                          </div>
                          <span className="text-xs font-semibold">{a.depositor_name || 'Depositor'}</span>
                        </>
                        :
                        <>
                          <div className="skeleton w-60 h-6" />
                          <div className="skeleton w-24 h-4 mt-2" />
                        </>
                      }
                    </div>
                  )}
                  {a.module && (
                    <div className="flex flex-col">
                      {!a.skeleton ?
                        <>
                          <span className="h-6 text-xs mt-0.5 pt-1">Module</span>
                          <span className="uppercase font-semibold mt-1.5">{a.module}</span>
                        </>
                        :
                        <>
                          <div className="skeleton w-16 h-4" />
                          <div className="skeleton w-18 h-6 mt-2" />
                        </>
                      }
                    </div>
                  )}
                  {(a.skeleton || a.action) && (
                    <div className="flex flex-col items-start space-y-1">
                      {!a.skeleton ?
                        <>
                          {a.action ?
                            <span className="bg-gray-100 dark:bg-gray-800 rounded-lg capitalize text-gray-900 dark:text-gray-100 font-semibold px-2 py-1">
                              {getName(a.action)}
                            </span>
                            :
                            <BsArrowRight size={24} />
                          }
                          {a.market_id && a.market_price ?
                            <>
                              <span className="uppercase">{a.market_id}</span>
                              <span>{numberFormat(a.market_price, '0,0.00000000')}</span>
                            </>
                            :
                            a.value ?
                              <span className="capitalize">{a.value}</span>
                              :
                              /*typeof a.amount === 'number'*/a.amount > 0 ?
                                <span className="w-full max-w-sm break-all flex items-start justify-end space-x-1">
                                  <span className="whitespace-nowrap">{numberFormat(a.amount, '0,0.00000000')}</span>
                                  <span className="whitespace-nowrap font-medium">{ellipseAddress(a.symbol || a.denom, 12)}</span>
                                </span>
                                :
                                a.log ?
                                  <span className="max-w-md text-gray-400 dark:text-gray-600 text-xs">{a.log}</span>
                                  :
                                  <span className="h-3" />
                          }
                        </>
                        :
                        <>
                          <div className="skeleton w-12 h-6" />
                          <div />
                          <div className="skeleton w-12 h-4" />
                        </>
                      }
                    </div>
                  )}
                  {a.chain && (
                    <div className="flex flex-col">
                      {!a.skeleton ?
                        <>
                          <span className="h-6 text-xs mt-0.5 pt-1">Chain</span>
                          <span className="uppercase font-semibold mt-1.5">{a.chain}</span>
                        </>
                        :
                        <>
                          <div className="skeleton w-16 h-4" />
                          <div className="skeleton w-18 h-6 mt-2" />
                        </>
                      }
                    </div>
                  )}
                  {a.outPointInfo && (
                    <div className="flex flex-col space-y-1">
                      {!a.skeleton ?
                        <>
                          {a.outPointInfo.out_point && (
                            <div className="flex items-center text-xs space-x-1">
                              <span className="font-semibold">Out Point:</span>
                              <span className="text-gray-400 dark:text-gray-600">{ellipseAddress(a.outPointInfo.out_point)}</span>
                              <Copy text={a.outPointInfo.out_point} />
                            </div>
                          )}
                          {a.outPointInfo.amount && (
                            <div className="flex items-center text-xs space-x-1">
                              <span className="font-semibold">Amount:</span>
                              <span className="text-gray-400 dark:text-gray-600">{a.outPointInfo.amount}</span>
                            </div>
                          )}
                          {a.outPointInfo.address && (
                            <div className="flex items-center text-xs space-x-1">
                              <span className="font-semibold">Address:</span>
                              <span className="text-gray-400 dark:text-gray-600">{ellipseAddress(a.outPointInfo.address)}</span>
                              <Copy text={a.outPointInfo.address} />
                            </div>
                          )}
                        </>
                        :
                        <>
                          <div className="skeleton w-60 h-6" />
                          <div className="skeleton w-24 h-4 mt-2" />
                        </>
                      }
                    </div>
                  )}
                  {(a.skeleton || (a.recipient?.length > 0 && !a.validator)) && (
                    <div className="flex flex-col">
                      {!a.skeleton ?
                        <>
                          {Array.isArray(a.recipient) ?
                            a.recipient.map((recipient, i) => (
                              <div key={i} className="flex items-center text-2xs lg:text-base space-x-1">
                                <Link href={`/${type(recipient)}/${recipient}`}>
                                  <a className="uppercase text-blue-600 dark:text-white font-medium">
                                    {ellipseAddress(recipient, 16)}
                                  </a>
                                </Link>
                                <Copy text={recipient} />
                              </div>
                            ))
                            :
                            <div className="flex items-center text-2xs lg:text-base space-x-1">
                              <Link href={`/${type(a.recipient)}/${a.recipient}`}>
                                <a className="uppercase text-blue-600 dark:text-white font-medium">
                                  {ellipseAddress(a.recipient, 16)}
                                </a>
                              </Link>
                              <Copy text={a.recipient} />
                            </div>
                          }
                          <span className="text-xs font-semibold">{a.recipient_name || 'Recipient'}</span>
                        </>
                        :
                        <>
                          <div className="skeleton w-60 h-6" />
                          <div className="skeleton w-24 h-4 mt-2" />
                        </>
                      }
                    </div>
                  )}
                  {a.validator && (
                    <div className="flex flex-col">
                      {!a.skeleton ?
                        <>
                          <div className="flex items-center text-2xs lg:text-base space-x-1">
                            <Link href={`/${type(a.validator)}/${a.validator}`}>
                              <a className="uppercase text-blue-600 dark:text-white font-medium">
                                {ellipseAddress(a.validator, 16)}
                              </a>
                            </Link>
                            <Copy text={a.validator} />
                          </div>
                          <span className="text-xs">{a.validator_name || 'Validator'}</span>
                        </>
                        :
                        <>
                          <div className="skeleton w-60 h-6" />
                          <div className="skeleton w-24 h-4 mt-2" />
                        </>
                      }
                    </div>
                  )}
                </>
                :
                body
              }
            </div>
            {body && !alreadyShowBody && i === data.activities?.length - 1 && (
              <div className="mt-4">
                {body}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}