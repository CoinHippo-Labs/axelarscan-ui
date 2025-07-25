'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import Linkify from 'react-linkify'
import clsx from 'clsx'
import _ from 'lodash'
import moment from 'moment'
import { MdArrowForwardIos } from 'react-icons/md'

import { Container } from '@/components/Container'
import { Image } from '@/components/Image'
import { Switch } from '@/components/Switch'
import { JSONView } from '@/components/JSONView'
import { Copy } from '@/components/Copy'
import { Spinner } from '@/components/Spinner'
import { Response } from '@/components/Response'
import { Tag } from '@/components/Tag'
import { Number } from '@/components/Number'
import { Profile, ChainProfile } from '@/components/Profile'
import { getType, getActivities, getSender } from '@/components/Transactions'
import { useGlobalStore } from '@/components/Global'
import { getTransaction } from '@/lib/api/validator'
import { getChainData, getAssetData } from '@/lib/config'
import { base64ToString, toHex, toJson, toArray } from '@/lib/parser'
import { isString, find, includesSomePatterns, ellipse, toTitle } from '@/lib/string'
import { isNumber, formatUnits } from '@/lib/number'
import { TIME_FORMAT } from '@/lib/time'

function Info({ data, tx }) {
  const { chains } = useGlobalStore()

  const { height, type, code, sender, timestamp, gas_used, gas_wanted } = { ...data }
  const { fee } = { ...data.tx?.auth_info }
  const { memo } = { ...data.tx?.body }

  return (
    <div className="overflow-hidden bg-zinc-50/75 dark:bg-zinc-800/25 shadow sm:rounded-lg">
      <div className="px-4 sm:px-6 py-6">
        <h3 className="text-zinc-900 dark:text-zinc-100 text-base font-semibold leading-7">
          <Copy value={tx}>
            {ellipse(tx, 16)}
          </Copy>
        </h3>
      </div>
      <div className="border-t border-zinc-200 dark:border-zinc-700">
        <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Height</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <Link
                href={`/block/${height}`}
                target="_blank"
                className="text-blue-600 dark:text-blue-500 font-medium"
              >
                <Number value={height} />
              </Link>
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Type</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              {type && (
                <Tag className={clsx('w-fit capitalize bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100')}>
                  {type}
                </Tag>
              )}
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Status</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <Tag className={clsx('w-fit capitalize', code ? 'bg-red-600 dark:bg-red-500' : 'bg-green-600 dark:bg-green-500')}>
                {code ? 'Failed' : 'Success'}
              </Tag>
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Sender</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <Profile address={sender} />
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Created</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              {moment(timestamp).format(TIME_FORMAT)}
            </dd>
          </div>
          {fee && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Fee</dt>
              <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <Number
                  value={formatUnits(fee.amount?.[0]?.amount, 6)}
                  format="0,0.00000000"
                  suffix={` ${getChainData('axelarnet', chains)?.native_token?.symbol}`}
                  noTooltip={true}
                  className="text-zinc-700 dark:text-zinc-300 font-medium"
                />
              </dd>
            </div>
          )}
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Gas Used</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <Number
                value={gas_used}
                format="0,0"
                className="text-zinc-700 dark:text-zinc-300 font-medium"
              />
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Gas Limit</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <Number
                value={gas_wanted}
                format="0,0"
                className="text-zinc-700 dark:text-zinc-300 font-medium"
              />
            </dd>
          </div>
          {memo && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Memo</dt>
              <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <div className="max-w-xl linkify text-zinc-400 dark:text-zinc-500 text-sm leading-6 break-words whitespace-pre-wrap">
                  <Linkify>
                    {memo}
                  </Linkify>
                </div>
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  )
}

const FORMATTABLE_TYPES = [
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
  'SignCommands',
]

const renderEntries = entries => toArray(entries).map(([k, v], i) => (
  <div key={i} className="grid grid-cols-3 gap-x-4">
    <span className="text-xs font-medium py-2">
      {k}
    </span>
    <div className="col-span-2 flex items-start gap-x-2">
      <Tag className="bg-transparent dark:bg-transparent !rounded border border-zinc-200 dark:border-zinc-700 break-all text-zinc-700 dark:text-zinc-300 font-sans px-3 py-2">
        {isString(v) ? ellipse(v, 256) : v && typeof v === 'object' ? <JSONView value={v} /> : v?.toString()}
      </Tag>
      <Copy
        size={16}
        value={typeof v === 'object' ? JSON.stringify(v) : v}
        className="mt-2"
      />
    </div>
  </div>
))

function Data({ data }) {
  const [formattable, setFormattable] = useState(null)
  const [formatted, setFormatted] = useState(true)
  const { chains, assets, validators } = useGlobalStore()

  useEffect(() => {
    if (data) {
      setFormattable(FORMATTABLE_TYPES.includes(getType(data)) && getActivities(data).length > 0 && !!toJson(data.raw_log))
    }
  }, [data, setFormattable])

  useEffect(() => {
    if (!formattable && typeof formattable === 'boolean') {
      setFormatted(false)
    }
  }, [formattable, setFormatted])

  const activities = getActivities(data, assets)

  return (
    <div className="flex flex-col gap-y-4">
      {formattable && (
        <div className="flex items-center">
          <Switch
            value={formatted}
            onChange={v => setFormatted(v)}
            title="Formatted"
          />
        </div>
      )}
      {!formatted ?
        <JSONView
          value={data}
          className="!max-w-full max-h-full bg-zinc-50/75 dark:bg-zinc-800/25 sm:rounded-lg px-4 sm:px-6 py-6"
        /> :
        <div className="flex flex-col gap-y-8">
          <div className="flex flex-col gap-y-4">
            <span className="text-lg font-semibold">
              Activities
            </span>
            <div className="bg-zinc-50/75 dark:bg-zinc-800/25 sm:rounded-lg flex flex-col gap-y-8 px-4 sm:px-6 py-6">
              {activities.map((d, i) => {
                const { addresses } = { ...d.asset_data }
                let { image } = { ...d.asset_data }

                let { deposit_address, burner_address, tx_id, deposit_address_chain, symbol } = { ...d }

                deposit_address = toHex(deposit_address)
                burner_address = toHex(burner_address)
                tx_id = toHex(tx_id)

                if (!deposit_address_chain && chains) {
                  deposit_address_chain = isString(deposit_address) && chains.find(c => deposit_address.startsWith(c.prefix_address))?.id
                }

                // chain data
                const chainData = getChainData(d.chain, chains)
                const { url, transaction_path } = { ...chainData?.explorer }

                // asset data
                const tokenData = addresses?.[chainData?.id]

                symbol = tokenData?.symbol || d.asset_data?.symbol || symbol
                image = tokenData?.image || image

                if (toJson(symbol)) {
                  const { denom } = { ...toJson(symbol) }
                  const assetData = getAssetData(denom, assets)

                  if (assetData) {
                    symbol = assetData.symbol
                    image = assetData.image
                  }
                }

                const isValidator = address => toArray(validators).findIndex(v => includesSomePatterns(address, [v.operator_address, v.broadcaster_address])) > -1

                const txElement = (
                  <span className="h-5 flex items-center text-xs font-medium">
                    {ellipse(tx_id, 8)}
                  </span>
                )

                return (
                  <div key={i} className="flex flex-col gap-y-4">
                    <div className="flex flex-wrap">
                      {d.sender && (
                        <div className="flex flex-col gap-y-1 mr-3">
                          <div className="text-zinc-400 dark:text-zinc-500 text-xs">
                            {isValidator(d.sender) ? 'Validator' : 'Sender'}
                          </div>
                          <Profile
                            address={d.sender}
                            width={20}
                            height={20}
                            className="text-xs"
                          />
                        </div>
                      )}
                      <div className="flex flex-col items-center gap-y-1 mr-3">
                        {d.source_channel && d.destination_channel && (
                          <div className="flex items-center text-xs font-medium gap-x-1.5">
                            <span>{d.source_channel}</span>
                            <MdArrowForwardIos size={12} />
                            <span>{d.destination_channel}</span>
                          </div>
                        )}
                        <Tag className="w-fit !text-2xs">
                          {toTitle(activities.length > 1 ? d.type : data.type, ' ')}
                        </Tag>
                        {d.status && (
                          <Tag className={clsx('w-fit !text-2xs', d.status === 'STATUS_COMPLETED' ? 'bg-green-600 dark:bg-green-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300')}>
                            {d.status.replace('STATUS_', '')}
                          </Tag>
                        )}
                        {(isNumber(d.amount) || symbol) && (
                          <div className="flex items-center gap-x-1.5">
                            <Image
                              src={image}
                              alt=""
                              width={20}
                              height={20}
                            />
                            {d.amount > 0 && (
                              <Number
                                value={d.amount}
                                format="0,0.000000"
                                className="text-xs font-medium"
                              />
                            )}
                            {symbol && (
                              <span className="text-xs font-medium">
                                {symbol}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {d.recipient && (
                        <div className="flex flex-col gap-y-1 mr-3">
                          <div className="text-zinc-400 dark:text-zinc-500 text-xs">
                            {isValidator(d.recipient) ? 'Validator' : 'Recipient'}
                          </div>
                          <Profile
                            address={d.recipient}
                            width={20}
                            height={20}
                            className="text-xs"
                          />
                        </div>
                      )}
                      {d.chain && (
                        <div className="flex flex-col gap-y-1 mr-3">
                          <div className="text-zinc-400 dark:text-zinc-500 text-xs">
                            Chain
                          </div>
                          <ChainProfile
                            value={d.chain}
                            width={20}
                            height={20}
                            className="h-5 text-xs gap-x-1.5"
                          />
                        </div>
                      )}
                      {deposit_address && (
                        <div className="flex flex-col gap-y-1 mr-3">
                          <div className="text-zinc-400 dark:text-zinc-500 text-xs">
                            Deposit address
                          </div>
                          <Profile
                            address={deposit_address}
                            chain={deposit_address_chain}
                            prefix={getChainData(deposit_address_chain, chains)?.prefix_address}
                            width={20}
                            height={20}
                            className="text-xs"
                          />
                        </div>
                      )}
                      {burner_address && (
                        <div className="flex flex-col gap-y-1 mr-3">
                          <div className="text-zinc-400 dark:text-zinc-500 text-xs">
                            Burner address
                          </div>
                          <Profile
                            address={burner_address}
                            chain={d.chain}
                            prefix={chainData?.prefix_address}
                            width={20}
                            height={20}
                            className="text-xs"
                          />
                        </div>
                      )}
                      {tx_id && (
                        <div className="flex flex-col gap-y-1 mr-3">
                          <div className="text-zinc-400 dark:text-zinc-500 text-xs">
                            Transaction
                          </div>
                          <Copy size={16} value={tx_id}>
                            {url ?
                              <Link
                                href={`${url}${transaction_path?.replace('{tx}', tx_id)}`}
                                target="_blank"
                                className="text-blue-600 dark:text-blue-500"
                              >
                                {txElement}
                              </Link> :
                              txElement
                            }
                          </Copy>
                        </div>
                      )}
                      {d.poll_id && (
                        <div className="flex flex-col gap-y-1 mr-3">
                          <div className="text-zinc-400 dark:text-zinc-500 text-xs">
                            Poll ID
                          </div>
                          <Copy size={16} value={d.poll_id}>
                            <span className="h-5 flex items-center text-xs">
                              {d.poll_id}
                            </span>
                          </Copy>
                        </div>
                      )}
                      {d.acknowledgement && (
                        <div className="flex flex-col gap-y-1 mr-3">
                          <div className="text-zinc-400 dark:text-zinc-500 text-xs">
                            Acknowledgement
                          </div>
                          <span className="text-xs">
                            {base64ToString(d.acknowledgement)}
                          </span>
                        </div>
                      )}
                      {d.timeout_timestamp > 0 && (
                        <div className="flex flex-col gap-y-1 mr-3">
                          <div className="text-zinc-400 dark:text-zinc-500 text-xs">
                            Timeout
                          </div>
                          <span className="text-zinc-400 dark:text-zinc-500 text-xs">
                            {moment(d.timeout_timestamp).format(TIME_FORMAT)}
                          </span>
                        </div>
                      )}
                    </div>
                    {toArray(d.events).length > 0 && (
                      <div className="flex flex-col gap-y-2">
                        <span className="text-base font-semibold">
                          Vote Events
                        </span>
                        {d.events.map((e, j) => (
                          <div key={j} className="w-fit bg-zinc-100 dark:bg-zinc-800 rounded-lg flex flex-col gap-y-3 px-3 sm:px-4 py-5">
                            {e.event && (
                              <Tag className="w-fit">
                                {toTitle(e.event, '_', true, true)}
                              </Tag>
                            )}
                            {renderEntries(Object.entries(e).filter(([k, v]) => !find(k, ['event'])))}
                          </div>
                        ))}
                      </div>
                    )}
                    {d.packet && (
                      <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg flex flex-col gap-y-3 px-3 sm:px-4 py-5">
                        <Tag className="w-fit">
                          Packet
                        </Tag>
                        {renderEntries(Object.entries(d.packet))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="flex flex-col gap-y-4">
            <span className="text-lg font-semibold">
              Events
            </span>
            <div className="bg-zinc-50/75 dark:bg-zinc-800/25 sm:rounded-lg flex flex-col gap-y-8 px-4 sm:px-6 py-6">
              {!Array.isArray(toJson(data.raw_log)) ? data.raw_log : toJson(data.raw_log).map((d, i) => (
                <div key={i} className="flex flex-col gap-y-4">
                  {d.log && (
                    <span className="text-sm lg:text-base font-medium">
                      {d.log}
                    </span>
                  )}
                  {_.reverse(_.cloneDeep(toArray(d.events))).map(e => ({ ...e, attributes: toArray(e.attributes).map(a => [a.key, a.value]) })).map((e, j) => (
                    <div key={j} className="w-fit bg-zinc-100 dark:bg-zinc-800 rounded-lg flex flex-col gap-y-3 px-3 sm:px-4 py-5">
                      {e.type && (
                        <Tag className="w-fit">
                          {toTitle(e.type, '_', true, true)}
                        </Tag>
                      )}
                      {renderEntries(e.attributes.filter(([k, v]) => typeof v !== 'undefined').map(([k, v], i) => {
                        // byteArray to hex
                        if (
                          (Array.isArray(v) || (isString(v) && v.startsWith('[') && v.endsWith(']'))) &&
                          ['gateway_address', 'deposit_address', 'token_address', 'tx_id'].includes(k)
                        ) {
                          v = toHex(JSON.parse(v)) 
                        }

                        return [k, v]
                      }))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      }
    </div>
  )
}

export function Transaction({ tx }) {
  const [data, setData] = useState(null)
  const { assets } = useGlobalStore()

  useEffect(() => {
    const getData = async () => {
      const { tx_response } = { ...await getTransaction(tx) }

      let data = tx_response

      if (data) {
        data = {
          ...data,
          type: getType(data),
          sender: getSender(data, assets),
        }

        console.log('[data]', data)
        setData(data)
      }
      else {
        setData({
          status: 'errorOnGetData',
          code: 404,
          message: `Transaction: ${tx} not found`,
        })
      }
    }

    getData()
  }, [tx, setData, assets])

  return (
    <Container className="sm:mt-8">
      {!data ? <Spinner /> :
        data.status === 'errorOnGetData' ? <Response data={data} /> :
        <div className="max-w-4xl flex flex-col gap-y-8 sm:gap-y-12">
          <Info data={data} tx={tx} />
          <Data data={data} />
        </div>
      }
    </Container>
  )
}
