import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Chip, Tabs, TabsHeader, TabsBody, Tab, TabPanel } from '@material-tailwind/react'
import _ from 'lodash'
import moment from 'moment'
import { BsArrowRightShort } from 'react-icons/bs'

import DataTabs from './tabs'
import NumberDisplay from '../../../number'
import Copy from '../../../copy'
import Image from '../../../image'
import ValidatorProfile from '../../../profile/validator'
import AccountProfile from '../../../profile/account'
import JSONView from '../../../json-view'
import { getChainData, getAssetData } from '../../../../lib/config'
import { getType, getActivities } from '../../../../lib/transaction'
import { base64ToString } from '../../../../lib/base64'
import { split, toArray, includesStringList, getTitle, ellipse, toJson, toHex } from '../../../../lib/utils'

const FORMATS = [
  { id: 'formatted', title: 'Formatted' },
  { id: 'json', title: 'JSON' },
]
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
const TIME_FORMAT = 'D MMM YYYY HH:mm:ss A'

export default ({ data }) => {
  const { chains, assets, validators } = useSelector(state => ({ chains: state.chains, assets: state.assets, validators: state.validators }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { validators_data } = { ...validators }

  const [txFormat, setTxFormat] = useState('formatted')
  const [logsFormat, setLogsFormat] = useState('formatted')

  useEffect(
    () => {
      const { tx_response } = { ...data }
      const { raw_log } = { ...tx_response }
      if (data) {
        const type = getType(tx_response)
        const activities = getActivities(tx_response)
        if (!(toArray(activities).length > 0)) {
          setTxFormat('json')
        }
        if (!toJson(raw_log)) {
          setLogsFormat('json')
        }
      }
    },
    [data],
  )

  const { tx, tx_response } = { ...data }
  const { messages } = { ...tx?.body }
  const { raw_log } = { ...tx_response }

  const type = getType(tx_response)
  const activities = getActivities(tx_response, assets_data)
  const txFormattable = FORMATTABLE_TYPES.includes(type) && toArray(activities).length > 0
  const logsFormattable = !!toJson(raw_log)

  const renderTx = format => {
    if (format === 'formatted' && txFormattable) {
      return (
        <div className="w-fit space-y-3">
          {activities.map((a, i) => {
            const {
              chain,
              sender,
              recipient,
              signer,
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
              deposit_address,
              burner_address,
              tx_id,
              sender_chain,
              recipient_chain,
              deposit_address_chain,
              symbol,
            } = { ...a }
            const { addresses } = { ...asset_data }
            let { image } = { ...asset_data }

            deposit_address = toHex(deposit_address)
            burner_address = toHex(burner_address)
            tx_id = toHex(tx_id)
            sender_chain = sender_chain || toArray(chains_data).find(c => sender?.startsWith(c.prefix_address))?.id
            recipient_chain = recipient_chain || toArray(chains_data).find(c => recipient?.startsWith(c.prefix_address))?.id
            deposit_address_chain = deposit_address_chain || toArray(chains_data).find(c => deposit_address?.startsWith(c.prefix_address))?.id

            const chain_data = getChainData(chain, chains_data)
            const sender_chain_data = getChainData(sender_chain, chains_data)
            const recipient_chain_data = getChainData(recipient_chain, chains_data)
            const deposit_address_chain_data = getChainData(deposit_address_chain, chains_data)

            const sender_validator_data = toArray(validators_data).find(v => includesStringList(sender, [v.operator_address, v.broadcaster_address]))
            const recipient_validator_data = toArray(validators_data).find(v => includesStringList(recipient, [v.operator_address, v.broadcaster_address]))

            const token_data = addresses?.[chain_data?.id]
            symbol = token_data?.symbol || asset_data?.symbol || symbol
            image = token_data?.image || image

            if (toJson(symbol)) {
              const { denom } = { ...toJson(symbol) }
              const asset_data = getAssetData(denom, assets_data)
              symbol = asset_data?.symbol || symbol
              image = asset_data?.image || image
            }

            const rowClassName = 'space-y-0.5 sm:mb-2 mr-4 sm:mr-6'
            const valueClassName = 'flex items-center text-slate-600 dark:text-slate-200 text-sm font-semibold space-x-1'
            const titleClassName = 'text-black dark:text-white font-bold'

            return (
              <div key={i} className="min-w-max bg-slate-50 dark:bg-slate-900 rounded space-y-4 p-4">
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-start space-y-2 sm:space-y-0">
                  {sender && (
                    <div className={rowClassName}>
                      <div className={titleClassName}>
                        {sender_validator_data ? 'Validator' : 'Sender'}
                      </div>
                      <div className={valueClassName}>
                        {sender_validator_data?.description ?
                          <div className="min-w-max flex items-start space-x-2">
                            <Link
                              href={`/validator/${sender_validator_data.operator_address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ValidatorProfile description={sender_validator_data.description} />
                            </Link>
                            <div className="flex flex-col">
                              <Link
                                href={`/validator/${sender_validator_data.operator_address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 font-medium"
                              >
                                {ellipse(sender_validator_data.description.moniker, 16)}
                              </Link>
                              <div className="flex items-center space-x-1">
                                <Link
                                  href={`/validator/${sender_validator_data.operator_address}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-slate-400 dark:text-slate-500 font-medium"
                                >
                                  {ellipse(sender_validator_data.operator_address, 10, 'axelarvaloper')}
                                </Link>
                                <Copy value={sender_validator_data.operator_address} />
                              </div>
                            </div>
                          </div> :
                          <AccountProfile address={sender} prefix={sender_chain_data?.prefix_address} explorer={sender_chain_data?.explorer} />
                        }
                      </div>
                    </div>
                  )}
                  <div className={rowClassName}>
                    {source_channel && destination_channel && (
                      <div className={valueClassName}>
                        <span className="text-xs font-semibold">
                          {source_channel}
                        </span>
                        <BsArrowRightShort />
                        <span className="text-xs font-semibold">
                          {destination_channel}
                        </span>
                      </div>
                    )}
                    <Chip
                      color="blue"
                      value={split(activities.length > 1 ? a.type : type, 'normal', ' ').join('')}
                      className="chip normal-case text-xs font-medium py-1 px-2"
                    />
                    {status && (
                      <div className="text-left">
                        <Chip
                          color={status === 'STATUS_COMPLETED' ? 'green' : 'red'}
                          value={status.replace('STATUS_', '')}
                          className="chip normal-case text-2xs font-medium py-0.5 px-1.5"
                        />
                        <div className="text-xs font-medium">
                          Status
                        </div>
                      </div>
                    )}
                    {(!isNaN(amount) || symbol) && (
                      <div className={valueClassName}>
                        {image && (
                          <Image
                            src={image}
                            width={20}
                            height={20}
                            className="rounded-full"
                          />
                        )}
                        {amount > 0 && (
                          <NumberDisplay
                            value={amount}
                            format="0,0.000000"
                            className="font-semibold"
                          />
                        )}
                        {symbol && <span>{symbol}</span>}
                      </div>
                    )}
                  </div>
                  {recipient && (
                    <div className={rowClassName}>
                      <div className={titleClassName}>
                        {recipient_validator_data ? 'Validator' : 'Recipient'}
                      </div>
                      <div className={valueClassName}>
                        {recipient_validator_data?.description ?
                          <div className="min-w-max flex items-start text-sm space-x-2">
                            <Link
                              href={`/validator/${recipient_validator_data.operator_address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ValidatorProfile description={recipient_validator_data.description} />
                            </Link>
                            <div className="flex flex-col">
                              <Link
                                href={`/validator/${recipient_validator_data.operator_address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 font-medium"
                              >
                                {ellipse(recipient_validator_data.description.moniker, 16)}
                              </Link>
                              <div className="flex items-center space-x-1">
                                <Link
                                  href={`/validator/${recipient_validator_data.operator_address}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-slate-400 dark:text-slate-500"
                                >
                                  {ellipse(recipient_validator_data.operator_address, 10, 'axelarvaloper')}
                                </Link>
                                <Copy value={recipient_validator_data.operator_address} />
                              </div>
                            </div>
                          </div> :
                          <AccountProfile address={recipient} prefix={recipient_chain_data?.prefix_address} explorer={recipient_chain_data?.explorer} />
                        }
                      </div>
                    </div>
                  )}
                  {chain && (
                    <div className={rowClassName}>
                      <div className={titleClassName}>
                        Chain
                      </div>
                      <div className={valueClassName}>
                        {chain_data?.image && (
                          <Image
                            src={chain_data.image}
                            width={20}
                            height={20}
                            className="rounded-full"
                          />
                        )}
                        <span>
                          {chain_data?.name || chain}
                        </span>
                      </div>
                    </div>
                  )}
                  {deposit_address && (
                    <div className={rowClassName}>
                      <div className={titleClassName}>
                        Deposit address
                      </div>
                      <div className={valueClassName}>
                        <AccountProfile address={deposit_address} prefix={deposit_address_chain_data?.prefix_address} explorer={deposit_address_chain_data?.explorer} />
                      </div>
                    </div>
                  )}
                  {burner_address && (
                    <div className={rowClassName}>
                      <div className={titleClassName}>
                        Burner address
                      </div>
                      <div className={valueClassName}>
                        <AccountProfile address={burner_address} prefix={chain_data?.prefix_address} explorer={chain_data?.explorer} />
                      </div>
                    </div>
                  )}
                  {tx_id && (
                    <div className={rowClassName}>
                      <div className={titleClassName}>
                        Transaction
                      </div>
                      <div className={valueClassName}>
                        {chain_data?.explorer ?
                          <a
                            href={`${chain_data.explorer.url}${chain_data.explorer.transaction_path?.replace('{tx}', tx_id)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 dark:text-white"
                          >
                            {ellipse(tx_id, 12)}
                          </a> :
                          <span>
                            {ellipse(tx_id, 12)}
                          </span>
                        }
                        <Copy value={tx_id} />
                      </div>
                    </div>
                  )}
                  {poll_id && (
                    <div className={rowClassName}>
                      <div className={titleClassName}>
                        Poll ID
                      </div>
                      <div className={valueClassName}>
                        <span>
                          {poll_id}
                        </span>
                        <Copy value={poll_id} />
                      </div>
                    </div>
                  )}
                  {acknowledgement && (
                    <div className={rowClassName}>
                      <div className={titleClassName}>
                        Acknowledgement
                      </div>
                      <div className={valueClassName}>
                        {base64ToString(acknowledgement)}
                      </div>
                    </div>
                  )}
                  {timeout_timestamp > 0 && (
                    <div className={rowClassName}>
                      <div className={titleClassName}>
                        Timeout
                      </div>
                      <div className={valueClassName}>
                        {moment(timeout_timestamp).format(TIME_FORMAT)}
                      </div>
                    </div>
                  )}
                </div>
                {toArray(events).length > 0 && (
                  <div className="space-y-2">
                    <div className="text-base font-bold">
                      Events
                    </div>
                    {events.map((e, j) => {
                      const { event } = { ...e }
                      return (
                        <div key={j} className="w-fit bg-slate-100 dark:bg-slate-800 rounded space-y-2 py-5 px-4">
                          {event && (
                            <Chip
                              color="blue"
                              value={split(getTitle(event), 'normal', ' ').join('')}
                              className="chip normal-case text-xs font-medium py-1 px-2"
                            />
                          )}
                          {Object.entries({ ...e }).filter(([k, v]) => !['event'].includes(k)).map(([k, v], i) => (
                            <div key={i} className="flex items-start space-x-4">
                              <span className="w-56 text-slate-500 dark:text-slate-400">
                                {k}
                              </span>
                              <div className="flex items-start space-x-1">
                                <div className="max-w-2xl break-all text-black dark:text-white font-medium">
                                  {typeof v === 'string' ?
                                    ellipse(v, 256) :
                                    v && typeof v === 'object' ?
                                      <div className="bg-slate-200 dark:bg-slate-700 py-1 px-2">
                                        <JSONView value={v} />
                                      </div> :
                                      v?.toString()
                                  }
                                </div>
                                {v && (
                                  <div className="mt-1">
                                    <Copy value={typeof v === 'object' ? JSON.stringify(v) : v} />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )}
                {packet && (
                  <div className="w-fit bg-slate-100 dark:bg-slate-800 rounded space-y-2 py-5 px-4">
                    <Chip
                      color="blue"
                      value="Packet"
                      className="chip normal-case text-xs font-medium py-1 px-2"
                    />
                    {Object.entries({ ...packet }).map(([k, v], i) => (
                      <div key={i} className="flex items-start space-x-4">
                        <span className="w-56 text-slate-500 dark:text-slate-400">
                          {k}
                        </span>
                        <div className="flex items-start space-x-1">
                          <div className="max-w-2xl break-all text-black dark:text-white font-medium">
                            {typeof v === 'string' ?
                              ellipse(v, 256) :
                              v && typeof v === 'object' ?
                                <div className="bg-slate-200 dark:bg-slate-700 py-1 px-2">
                                  <JSONView value={v} />
                                </div> :
                                v?.toString()
                            }
                          </div>
                          {v && (
                            <div className="mt-1">
                              <Copy value={typeof v === 'object' ? JSON.stringify(v) : v} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )
    }
    else {
      return (
        <div className="text-sm lg:text-base font-medium">
          {toJson(messages || tx) ?
            <div className="max-w-4xl bg-slate-50 dark:bg-slate-900 p-4">
              <JSONView value={messages || tx} />
            </div> :
            messages || tx
          }
        </div>
      )
    }
  }

  const renderLogs = format => {
    if (format === 'formatted' && logsFormattable) {
      return (
        <div className="w-fit space-y-3">
          {toJson(raw_log).map((l, i) => {
            const { log, events } = { ...l }
            return (
              <div key={i} className="w-fit min-w-max bg-slate-50 dark:bg-slate-900 rounded space-y-4 p-4">
                {log && (
                  <div className="text-black dark:text-white text-sm lg:text-base font-medium">
                    {log}
                  </div>
                )}
                {_.reverse(_.cloneDeep(toArray(events)))
                  .filter(e => toArray(e.attributes).length > 0)
                  .map(e => {
                    const { type, attributes } = { ...e }
                    return {
                      type,
                      attributes: toArray(attributes).map(a => [a.key, a.value]),
                    }
                  })
                  .map((e, j) => {
                    const { type, attributes } = { ...e }
                    return (
                      <div key={j} className="min-w-max bg-slate-100 dark:bg-slate-800 rounded space-y-2 py-5 px-4">
                        {type && (
                          <Chip
                            color="blue"
                            value={split(getTitle(type), 'normal', ' ').join('')}
                            className="chip normal-case text-xs font-medium py-1 px-2"
                          />
                        )}
                        {attributes.filter(([k, v]) => typeof v !== 'undefined').map(([k, v], i) => {
                          v = (Array.isArray(v) || (typeof v === 'string' && v.startsWith('[') && v.endsWith(']'))) && ['gateway_address', 'deposit_address', 'token_address', 'tx_id'].includes(k) ? toHex(JSON.parse(v)) : v
                          return (
                            <div key={i} className="flex items-start space-x-4">
                              <span className="w-56 text-slate-500 dark:text-slate-400">
                                {k}
                              </span>
                              <div className="flex items-start space-x-1">
                                <div className="max-w-2xl break-all text-black dark:text-white font-semibold">
                                  {typeof v === 'string' ?
                                    ellipse(v, 256) :
                                    v && typeof v === 'object' ?
                                      <JSONView value={v} /> :
                                      v?.toString()
                                  }
                                </div>
                                {v && (
                                  <div className="mt-1">
                                    <Copy value={typeof v === 'object' ? JSON.stringify(v) : v} />
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })
                }
              </div>
            )
          })}
        </div>
      )
    }
    else {
      return (
        <div className="text-sm lg:text-base font-medium">
          {toJson(raw_log) ?
            <div className="max-w-4xl bg-slate-50 dark:bg-slate-900 p-4">
              <JSONView value={raw_log} />
            </div> :
            raw_log
          }
        </div>
      )
    }
  }

  return (
    <div className="children space-y-8 pt-8">
      <DataTabs
        value={txFormat}
        title="Activities"
        formattable={txFormattable}
        formats={FORMATS}
        onSelect={format => setTxFormat(format)}
        render={format => renderTx(format)}
      />
      <DataTabs
        value={logsFormat}
        title="Events"
        formattable={logsFormattable}
        formats={FORMATS}
        onSelect={format => setLogsFormat(format)}
        render={format => renderLogs(format)}
      />
    </div>
  )
}