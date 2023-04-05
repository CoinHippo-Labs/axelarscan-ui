import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { BiRightArrowAlt } from 'react-icons/bi'

import Copy from '../copy'
import Image from '../image'
import ValidatorProfile from '../validator-profile'
import AccountProfile from '../account-profile'
import { getChain } from '../../lib/object/chain'
import { assetManager } from '../../lib/object/asset'
import { number_format, name, ellipse, equalsIgnoreCase, to_json, to_hex, decode_base64, json_theme } from '../../lib/utils'

const FORMATS =
  [
    {
      id: 'formatted',
      name: 'Formatted',
    },
    {
      id: 'json',
      name: 'JSON',
    },
  ]

const FORMATTABLE_TYPES =
  [
    'MsgSend',
    'ConfirmDeposit',
    'ConfirmERC20Deposit',
    'ConfirmERC20TokenDeployment',
    'ConfirmGatewayTx',
    'ConfirmTransferKey',
    'Vote',
    'MsgTransfer',
    'RetryIBCTransfer',
    'RouteIBCTransfers',
    'MsgUpdateClient',
    'MsgAcknowledgement',
    'MsgDelegate',
    'MsgUndelegate',
    'CreatePendingTransfers',
    'ExecutePendingTransfers',
  ]

export default (
  {
    data,
  },
) => {
  const {
    preferences,
    evm_chains,
    cosmos_chains,
    assets,
    validators,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        evm_chains: state.evm_chains,
        cosmos_chains: state.cosmos_chains,
        assets: state.assets,
        validators: state.validators,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    evm_chains_data,
  } = { ...evm_chains }
  const {
    cosmos_chains_data,
  } = { ...cosmos_chains }
  const {
    assets_data,
  } = { ...assets }
  const {
    validators_data,
  } = { ...validators }

  const [txFormat, setTxFormat] = useState('formatted')
  const [logsFormat, setLogsFormat] = useState('formatted')

  useEffect(
    () => {
      const {
        raw_log,
        type,
        activities,
      } = { ...data }

      if (data) {
        if (!(
          FORMATTABLE_TYPES.includes(type) &&
          activities?.length > 0
        )) {
          setTxFormat('json')
        }

        if (!to_json(raw_log)) {
          setLogsFormat('json')
        }
      }
    },
    [data],
  )

  const ReactJson =
    typeof window !== 'undefined' &&
    dynamic(
      import('react-json-view')
    )

  const chains_data =
    _.concat(
      evm_chains_data,
      cosmos_chains_data,
    )

  const {
    tx,
    raw_log,
    type,
    activities,
  } = { ...data }
  const {
    messages,
  } = { ...tx?.body }

  const txFormattable =
    FORMATTABLE_TYPES.includes(type) &&
    activities?.length > 0

  const logsFormattable = !!to_json(raw_log)

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <div className="flex items-center space-x-3 px-4">
          <div className="text-slate-600 dark:text-slate-300 text-base lg:text-lg font-medium">
            Activities
          </div>
          {
            txFormattable &&
            (
              <div className="w-fit bg-slate-100 dark:bg-zinc-900 rounded-xl flex flex-wrap item-center space-x-1 p-1">
                {
                  FORMATS
                    .map((f, i) => {
                    const {
                      id,
                      name,
                    } = { ...f }

                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setTxFormat(id)}
                        className={`${id === txFormat ? 'bg-white dark:bg-black shadow dark:shadow-zinc-800 text-black dark:text-white font-semibold' : 'bg-transparent text-slate-400 dark:text-slate-600 hover:text-slate-800 dark:hover:text-slate-200 font-normal hover:font-medium'} rounded-lg py-1 px-2`}
                      >
                        {name}
                      </button>
                    )
                  })
                }
              </div>
            )
          }
        </div>
        {
          txFormat === 'formatted' &&
          txFormattable ?
            <div className="space-y-3">
              {activities
                .map((a, i) => {
                  const {
                    chain,
                    sender,
                    signer,
                    deposit_address,
                    burner_address,
                    tx_id,
                    asset_data,
                    amount,
                    poll_id,
                    status,
                    events,
                    source_channel,
                    destination_channel,
                    packet,
                    acknowledgement,
                    timeout_timestamp,
                  } = { ...a }
                  let {
                    recipient,
                    sender_chain,
                    recipient_chain,
                    deposit_address_chain,
                    symbol,
                  } = { ...a }
                  const {
                    contracts,
                    ibc,
                  } = { ...asset_data }
                  let {
                    image,
                  } = { ...asset_data }

                  recipient =
                    Array.isArray(recipient) ?
                      _.head(recipient) : 
                      recipient

                  sender_chain =
                    sender_chain ||
                    (chains_data || [])
                      .find(c =>
                        sender?.startsWith(c?.prefix_address)
                      )?.id

                  recipient_chain =
                    recipient_chain ||
                    (chains_data || [])
                      .find(c =>
                        recipient?.startsWith(c?.prefix_address)
                      )?.id

                  deposit_address_chain =
                    deposit_address_chain ||
                    (chains_data || [])
                      .find(c =>
                        deposit_address?.startsWith(c?.prefix_address)
                      )?.id

                  const chain_data =
                    getChain(
                      chain,
                      chains_data,
                    )

                  const sender_chain_data =
                    getChain(
                      sender_chain,
                      chains_data,
                    )

                  const recipient_chain_data =
                    getChain(
                      recipient_chain,
                      chains_data,
                    )

                  const deposit_address_chain_data =
                    getChain(
                      deposit_address_chain,
                      chains_data,
                    )

                  const sender_validator_data =
                    [
                      process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                      process.env.NEXT_PUBLIC_PREFIX_ACCOUNT,
                    ].findIndex(p =>
                      sender?.startsWith(p)
                    ) > -1 &&
                    (validators_data || [])
                      .find(v =>
                        equalsIgnoreCase(
                          v?.operator_address,
                          sender,
                        ) ||
                        equalsIgnoreCase(
                          v?.broadcaster_address,
                          sender,
                        )
                      )

                  const recipient_validator_data =
                    [
                      process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                      process.env.NEXT_PUBLIC_PREFIX_ACCOUNT,
                    ].findIndex(p =>
                      recipient?.startsWith(p)
                    ) > -1 &&
                      (validators_data || [])
                        .find(v =>
                          equalsIgnoreCase(
                            v?.operator_address,
                            recipient,
                          ) ||
                          equalsIgnoreCase(
                            v?.broadcaster_address,
                            recipient,
                          )
                        )

                  symbol =
                    (contracts || [])
                      .find(c =>
                        c?.chain_id === chain_data?.chain_id
                      )?.symbol ||
                    (ibc || [])
                      .find(i =>
                        i?.chain_id === chain_data?.id
                      )?.symbol ||
                    symbol

                  image =
                    (contracts || [])
                      .find(c =>
                        c?.chain_id === chain_data?.chain_id
                      )?.image ||
                    (ibc || [])
                      .find(i =>
                        i?.chain_id === chain_data?.id
                      )?.image ||
                    image

                  if (to_json(symbol)) {
                    const {
                      denom,
                    } = { ...to_json(symbol) }

                    symbol =
                      assetManager
                        .symbol(
                          denom,
                          assets_data,
                        )

                    image =
                      image ||
                      assetManager
                        .image(
                          denom,
                          assets_data,
                        )
                  }

                  return (
                    <div
                      key={i}
                      className="w-fit bg-slate-100 dark:bg-slate-900 bg-opacity-75 shadow dark:shadow-slate-600 rounded-lg space-y-3 p-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center space-y-3 sm:space-y-0">
                        {
                          sender &&
                          (
                            <div className="space-y-1 my-2 mr-4 sm:mr-6">
                              {sender_validator_data ?
                                <div className={`min-w-max flex items-${sender_validator_data.description?.moniker ? 'start' : 'center'} space-x-2`}>
                                  <Link href={`/validator/${sender_validator_data.operator_address}`}>
                                    <a
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <ValidatorProfile
                                        validator_description={sender_validator_data.description}
                                      />
                                    </a>
                                  </Link>
                                  <div className="flex flex-col">
                                    {
                                      sender_validator_data.description?.moniker &&
                                      (
                                        <Link href={`/validator/${sender_validator_data.operator_address}`}>
                                          <a
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                                          >
                                            {ellipse(
                                              sender_validator_data.description.moniker,
                                              16,
                                            )}
                                          </a>
                                        </Link>
                                      )
                                    }
                                    <div className="flex items-center space-x-1">
                                      <Link href={`/validator/${sender_validator_data.operator_address}`}>
                                        <a
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-slate-400 dark:text-slate-600"
                                        >
                                          {ellipse(
                                            sender_validator_data.operator_address,
                                            10,
                                            process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                                          )}
                                        </a>
                                      </Link>
                                      <Copy
                                        value={sender_validator_data.operator_address}
                                      />
                                    </div>
                                  </div>
                                </div> :
                                sender_chain_data ?
                                  <AccountProfile
                                    address={sender}
                                    ellipse_size={16}
                                    prefix={sender_chain_data.prefix_address}
                                    url={`${sender_chain_data.explorer?.url}${sender_chain_data.explorer?.address_path?.replace('{address}', sender)}`}
                                  /> :
                                  <AccountProfile
                                    address={sender}
                                    ellipse_size={16}
                                  />
                              }
                              <div className="dark:text-slate-200 font-semibold">
                                {signer ?
                                  'Signer' :
                                  sender_validator_data ?
                                    'Validator' :
                                    'Sender'
                                }
                              </div>
                            </div>
                          )
                        }
                        <div className="flex flex-col items-center space-y-1.5 my-2 mr-4 sm:mr-6">
                          {
                            source_channel &&
                            destination_channel &&
                            (
                              <div className="flex items-center text-slate-500 dark:text-slate-300 space-x-1">
                                <span className="text-xs font-medium">
                                  {source_channel}
                                </span>
                                <BiRightArrowAlt />
                                <span className="text-xs font-medium">
                                  {destination_channel}
                                </span>
                              </div>
                            )
                          }
                          <div className="bg-blue-500 bg-opacity-75 rounded text-white text-xs font-medium py-1 px-1.5">
                            {name(
                              activities.length > 1 ?
                                a?.type :
                                type
                            )}
                          </div>
                          {
                            status &&
                            (
                              <div className="text-center">
                                <div className={`${['STATUS_COMPLETED'].includes(status) ? 'text-green-600 dark:text-green-400 font-medium' : 'text-slate-400 dark:text-slate-500'} text-xs`}>
                                  {
                                    status
                                      .replace(
                                        'STATUS_',
                                        '',
                                      )
                                  }
                                </div>
                                <div className="text-xs font-medium">
                                  Status
                                </div>
                              </div>
                            )
                          }
                          {
                            (
                              amount ||
                              symbol
                            ) &&
                            (
                              <div className="flex items-center space-x-1">
                                {
                                  image &&
                                  (
                                    <Image
                                      src={image}
                                      className="w-6 h-6 rounded-full"
                                    />
                                  )
                                }
                                {
                                  amount > 0 &&
                                  (
                                    <span className="font-medium">
                                      {number_format(
                                        amount,
                                        '0,0.000000'
                                      )}
                                    </span>
                                  )
                                }
                                {
                                  symbol &&
                                  (
                                    <span className="font-medium">
                                      {symbol}
                                    </span>
                                  )
                                }
                              </div>
                            )
                          }
                        </div>
                        {
                          recipient &&
                          (
                            <div className="space-y-1 my-2 mr-4 sm:mr-6">
                              {recipient_validator_data ?
                                <div className={`min-w-max flex items-${recipient_validator_data.description?.moniker ? 'start' : 'center'} space-x-2`}>
                                  <Link href={`/validator/${recipient_validator_data.operator_address}`}>
                                    <a
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <ValidatorProfile
                                        validator_description={recipient_validator_data.description}
                                      />
                                    </a>
                                  </Link>
                                  <div className="flex flex-col">
                                    {
                                      recipient_validator_data.description?.moniker &&
                                      (
                                        <Link href={`/validator/${recipient_validator_data.operator_address}`}>
                                          <a
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                                          >
                                            {ellipse(
                                              recipient_validator_data.description.moniker,
                                              16,
                                            )}
                                          </a>
                                        </Link>
                                      )
                                    }
                                    <div className="flex items-center space-x-1">
                                      <Link href={`/validator/${recipient_validator_data.operator_address}`}>
                                        <a
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-slate-400 dark:text-slate-600"
                                        >
                                          {ellipse(
                                            recipient_validator_data.operator_address,
                                            10,
                                            process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                                          )}
                                        </a>
                                      </Link>
                                      <Copy
                                        value={recipient_validator_data.operator_address}
                                      />
                                    </div>
                                  </div>
                                </div> :
                                recipient_chain_data ?
                                  <AccountProfile
                                    address={recipient}
                                    ellipse_size={16}
                                    prefix={recipient_chain_data.prefix_address}
                                    url={`${recipient_chain_data.explorer?.url}${recipient_chain_data.explorer?.address_path?.replace('{address}', recipient)}`}
                                  /> :
                                  <AccountProfile
                                    address={recipient}
                                    ellipse_size={16}
                                  />
                              }
                              <div className="dark:text-slate-200 font-semibold">
                                {recipient_validator_data ?
                                  'Validator' :
                                  'Recipient'
                                }
                              </div>
                            </div>
                          )
                        }
                        {
                          chain &&
                          (
                            <div className="space-y-0 my-2 mr-4 sm:mr-6">
                              <div className="flex items-center space-x-2">
                                {
                                  chain_data?.image &&
                                  (
                                    <Image
                                      src={chain_data.image}
                                      className="w-6 h-6 rounded-full"
                                    />
                                  )
                                }
                                <div className="text-base font-semibold">
                                  {
                                    chain_data?.name ||
                                    chain
                                  }
                                </div>
                              </div>
                              <div className="dark:text-slate-200 font-semibold">
                                Chain
                              </div>
                            </div>
                          )
                        }
                        {
                          deposit_address &&
                          (
                            <div className="space-y-1 my-2 mr-4 sm:mr-6">
                              {deposit_address_chain_data ?
                                <AccountProfile
                                  address={deposit_address}
                                  ellipse_size={16}
                                  prefix={deposit_address_chain_data.prefix_address}
                                  url={`${deposit_address_chain_data.explorer?.url}${deposit_address_chain_data.explorer?.address_path?.replace('{address}', deposit_address)}`}
                                /> :
                                <AccountProfile
                                  address={deposit_address}
                                  ellipse_size={16}
                                />
                              }
                              <div className="dark:text-slate-200 font-semibold">
                                Deposit address
                              </div>
                            </div>
                          )
                        }
                        {
                          burner_address &&
                          (
                            <div className="space-y-1 my-2 mr-4 sm:mr-6">
                              {chain_data ?
                                <AccountProfile
                                  address={burner_address}
                                  ellipse_size={16}
                                  prefix={chain_data.prefix_address}
                                  url={`${chain_data.explorer?.url}${chain_data.explorer?.address_path?.replace('{address}', burner_address)}`}
                                /> :
                                <AccountProfile
                                  address={burner_address}
                                  ellipse_size={16}
                                />
                              }
                              <div className="dark:text-slate-200 font-semibold">
                                Burner address
                              </div>
                            </div>
                          )
                        }
                        {
                          tx_id &&
                          (
                            <div className="space-y-1 my-2 mr-4 sm:mr-6">
                              <div className="flex items-center">
                                <div className="mr-1.5">
                                  {chain_data ?
                                    <a
                                      href={`${chain_data.explorer?.url}${chain_data.explorer?.transaction_path?.replace('{tx}', tx_id)}`}
                                      target="_blank"
                                      rel="noopenner noreferrer"
                                      className="text-blue-500 hover:text-blue-600 darl:text-blue-500 dark:hover:text-blue-400 font-medium"
                                    >
                                      {ellipse(
                                        tx_id,
                                        16,
                                      )}
                                    </a> :
                                    <span className="font-medium">
                                      {ellipse(
                                        tx_id,
                                        16,
                                      )}
                                    </span>
                                  }
                                </div>
                                <Copy
                                  size={20}
                                  value={tx_id}
                                />
                              </div>
                              <div className="dark:text-slate-200 semibold">
                                Transaction
                              </div>
                            </div>
                          )
                        }
                        {
                          poll_id &&
                          (
                            <div className="space-y-0.5 my-2 mr-4 sm:mr-6">
                              <div className="flex items-center">
                                <div className="mr-1.5">
                                  <span className="text-base font-semibold">
                                    {poll_id}
                                  </span>
                                </div>
                                <Copy
                                  size={20}
                                  value={poll_id}
                                />
                              </div>
                              <div className="dark:text-slate-200 font-semibold">
                                Poll ID
                              </div>
                            </div>
                          )
                        }
                        {
                          acknowledgement &&
                          (
                            <div className="space-y-0.5 my-2 mr-4 sm:mr-6">
                              <div className="text-slate-400 dark:text-slate-200">
                                {decode_base64(acknowledgement)}
                              </div>
                              <div className="dark:text-slate-200 font-semibold">
                                Acknowledgement
                              </div>
                            </div>
                          )
                        }
                        {
                          timeout_timestamp > 0 &&
                          (
                            <div className="space-y-0.5 my-2 mr-4 sm:mr-6">
                              <div className="text-slate-400 dark:text-slate-200">
                                {
                                  moment(timeout_timestamp)
                                    .format('D MMM YYYY HH:mm:ss A')
                                }
                              </div>
                              <div className="dark:text-slate-200 ont-semibold">
                                Timeout
                              </div>
                            </div>
                          )
                        }
                      </div>
                      {events?.length > 0 &&
                        (
                          <div className="space-y-2 mt-4">
                            <div className="text-base font-semibold">
                              Events
                            </div>
                            {events
                              .map((e, j) => {
                                const {
                                  event,
                                } = { ...e }

                                return (
                                  <div
                                    key={j}
                                    className="w-fit bg-zinc-200 dark:bg-zinc-800 bg-opacity-50 rounded-xl space-y-2 py-5 px-4"
                                  >
                                    {
                                      event &&
                                      (
                                        <div className="w-fit bg-green-600 bg-opacity-75 rounded text-white text-xs font-bold py-1 px-1.5">
                                          {name(event)}
                                        </div>
                                      )
                                    }
                                    {Object.entries({ ...e })
                                      .filter(([k, v]) => !['event'].includes(k))
                                      .map(([k, v]) => (
                                        <div
                                          key={k}
                                          className="flex items-start space-x-4"
                                        >
                                          <span className="w-48 text-slate-400 dark:text-slate-300">
                                            {k}
                                          </span>
                                          <div className="flex items-start space-x-1.5">
                                            <span className="max-w-xl break-all font-bold">
                                              {typeof v === 'string' ?
                                                ellipse(
                                                  v,
                                                  256,
                                                ) :
                                                typeof v === 'object' &&
                                                v ?
                                                  <pre className="bg-zinc-100 dark:bg-zinc-900 rounded-lg text-xs font-medium text-left">
                                                    {JSON.stringify(
                                                      v,
                                                      null,
                                                      2,
                                                    )}
                                                  </pre> :
                                                v?.toString()
                                              }
                                            </span>
                                            {
                                              v &&
                                              (
                                                <div className="mt-0.5">
                                                  <Copy
                                                    value={
                                                      typeof v === 'object' ?
                                                        JSON.stringify(v) :
                                                        v
                                                    }
                                                  />
                                                </div>
                                              )
                                            }
                                          </div>
                                        </div>
                                      ))
                                    }
                                  </div>
                                )
                              })
                            }
                          </div>
                        )
                      }
                      {
                        packet &&
                        (
                          <div className="space-y-2 mt-4">
                            <div className="w-fit bg-zinc-100 dark:bg-zinc-900 bg-opacity-50 rounded-xl space-y-2 py-5 px-4">
                              <div className="w-fit bg-green-500 bg-opacity-75 rounded text-white text-xs font-semibold py-1 px-1.5">
                                Packet
                              </div>
                              {Object.entries({ ...packet })
                                .filter(([k, v]) =>
                                  ![].includes(k)
                                )
                                .map(([k, v]) => (
                                  <div
                                    key={k}
                                    className="flex items-start space-x-4"
                                  >
                                    <span className="w-48 text-slate-400 dark:text-slate-300">
                                      {k}
                                    </span>
                                    <div className="flex items-start space-x-1.5">
                                      <span className="max-w-xl break-all font-semibold">
                                        {typeof v === 'string' ?
                                          ellipse(
                                            v,
                                            256,
                                          ) :
                                          typeof v === 'object' &&
                                          v ?
                                            <pre className="bg-zinc-100 dark:bg-zinc-900 rounded-lg text-xs font-normal text-left">
                                              {JSON.stringify(
                                                v,
                                                null,
                                                2,
                                              )}
                                            </pre> :
                                          v?.toString()
                                        }
                                      </span>
                                      {
                                        v &&
                                        (
                                          <div className="mt-0.5">
                                            <Copy
                                              value={
                                                typeof v === 'object' ?
                                                  JSON.stringify(v) :
                                                  v
                                              }
                                            />
                                          </div>
                                        )
                                      }
                                    </div>
                                  </div>
                                ))
                              }
                            </div>
                          </div>
                        )
                      }
                    </div>
                  )
                })
              }
            </div> :
            tx &&
            (
              <div className="text-sm lg:text-base font-medium">
                {to_json(
                  messages ||
                  tx
                ) ?
                  <ReactJson
                    src={
                      to_json(
                        messages ||
                        tx
                      )
                    }
                    theme={json_theme(theme)}
                    style={
                      {
                        borderRadius: '.75rem',
                        padding: '.8rem .75rem',
                      }
                    }
                  /> :
                  <span>
                    {
                      messages ||
                      tx
                    }
                  </span>
                }
              </div>
            )
        }
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center space-x-3 px-4">
          <div className="text-slate-600 dark:text-slate-300 text-base lg:text-lg font-medium">
            Events
          </div>
          {
            logsFormattable &&
            (
              <div className="w-fit bg-slate-100 dark:bg-zinc-900 rounded-xl flex flex-wrap item-center space-x-1 p-1">
                {
                  FORMATS
                    .map((f, i) => {
                      const {
                        id,
                        name,
                      } = { ...f }

                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setLogsFormat(id)}
                          className={`${id === logsFormat ? 'bg-white dark:bg-black shadow dark:shadow-zinc-800 text-black dark:text-white font-semibold' : 'bg-transparent text-slate-400 dark:text-slate-600 hover:text-slate-800 dark:hover:text-slate-200 font-normal hover:font-medium'} rounded-lg py-1 px-2`}
                        >
                          {name}
                        </button>
                      )
                    })}
              </div>
            )
          }
        </div>
        {
          logsFormat === 'formatted' &&
          logsFormattable ?
            <div className="space-y-3">
              {
                to_json(raw_log)
                  .map((l, i) => {
                    const {
                      log,
                      events,
                    } = { ...l }

                    return (
                      <div
                        key={i}
                        className="w-fit bg-slate-100 dark:bg-slate-900 bg-opacity-75 shadow dark:shadow-slate-600 rounded-lg space-y-3 p-4"
                      >
                        <div className="space-y-4">
                          {
                            log &&
                            (
                              <div className="text-base font-medium">
                                {log}
                              </div>
                            )
                          }
                          {
                            _.reverse(
                              _.cloneDeep(events)
                            )
                            .filter(e =>
                              e?.attributes?.length > 0
                            )
                            .map(e => {
                              const {
                                type,
                                attributes,
                              } = { ...e }

                              return {
                                type,
                                attributes:
                                  attributes
                                    .filter(a => a)
                                    .map(a =>
                                      [
                                        a.key,
                                        a.value,
                                      ]
                                    )
                              }
                            })
                            .map((e, j) => {
                              const {
                                type,
                                attributes,
                              } = { ...e }

                              return (
                                <div
                                  key={j}
                                  className="w-fit bg-slate-200 dark:bg-slate-800 bg-opacity-50 rounded-xl space-y-2 py-5 px-4"
                                >
                                  {
                                    type &&
                                    (
                                      <div className="w-fit bg-green-500 bg-opacity-75 rounded text-white text-xs font-semibold py-1 px-1.5">
                                        {name(type)}
                                      </div>
                                    )
                                  }
                                  {
                                    attributes
                                      .map(([k, v]) => (
                                        <div
                                          key={k}
                                          className="flex items-start space-x-4"
                                        >
                                          <span className="w-48 text-slate-400 dark:text-slate-300">
                                            {k}
                                          </span>
                                          <div className="flex items-start space-x-1.5">
                                            <span className="max-w-xl break-all font-semibold">
                                              {
                                                (
                                                  Array.isArray(v) ||
                                                  (
                                                    typeof v === 'string' &&
                                                    v.startsWith('[') &&
                                                    v.endsWith(']')
                                                  )
                                                ) &&
                                                [
                                                  'gateway_address',
                                                  'deposit_address',
                                                  'token_address',
                                                  'tx_id',
                                                ].includes(k) ?
                                                  to_hex(
                                                    JSON.parse(v)
                                                  ) :
                                                  typeof v === 'string' ?
                                                    ellipse(
                                                      v,
                                                      256,
                                                    ) :
                                                    typeof v === 'object' &&
                                                    v ?
                                                      <pre className="bg-slate-100 dark:bg-slate-900 rounded-lg text-xs font-normal text-left">
                                                        {JSON.stringify(
                                                          v,
                                                          null,
                                                          2,
                                                        )}
                                                      </pre> :
                                                      v?.toString()
                                              }
                                            </span>
                                            {
                                              v &&
                                              (
                                                <div className="mt-0.5">
                                                  <Copy
                                                    value={
                                                      typeof v === 'object' ?
                                                        JSON.stringify(v) :
                                                        v
                                                    }
                                                  />
                                                </div>
                                              )
                                            }
                                          </div>
                                        </div>
                                      ))
                                  }
                                </div>
                              )
                            })
                          }
                        </div>
                      </div>
                    )
                  })
              }
            </div> :
            raw_log &&
            (
              <div className="text-sm lg:text-base font-medium">
                {to_json(raw_log) ?
                  <ReactJson
                    src={to_json(raw_log)}
                    theme={json_theme(theme)}
                    style={
                      {
                        borderRadius: '.75rem',
                        padding: '.8rem .75rem',
                      }
                    }
                  /> :
                  <span>
                    {raw_log}
                  </span>
                }
              </div>
            )
        }
      </div>
    </div>
  )
}