import _ from 'lodash'

import { getAssetData } from './config'
import { formatUnits } from './number'
import { split, toArray, includesStringList, capitalize, equalsIgnoreCase, toHex } from './utils'

export const getType = data => {
  const { tx, logs } = { ...data }
  let { types, type } = { ...data }
  const { messages } = { ...tx?.body }

  if (data) {
    if (Array.isArray(types)) {
      type = _.head(types) || type
    }
    else {
      types = _.uniq(
        toArray(
          _.concat(
            toArray(messages).map(m => m.inner_message?.['@type']),
            toArray(logs).flatMap(l =>
              toArray(l.events)
                .filter(e => equalsIgnoreCase(e.type, 'message'))
                .map(e => _.head(toArray(e.attributes).filter(a => a.key === 'action').map(a => _.last(split(a.value, 'normal', '.')))))
            ),
            toArray(messages).map(m => m['@type']),
          )
          .map(t => capitalize(_.last(split(t, 'normal', '.'))))
        )
      )
      type = _.head(types.filter(t => !types.includes(`${t}Request`)))
    }
  }

  return type?.replace('Request', '')
}

export const getActivities = (data, assets_data) => {
  let output

  const { tx, code, logs, denom, asset } = { ...data }
  const { messages } = { ...tx?.body }

  if (includesStringList(toArray(messages).map(m => m['@type']), ['MsgSend', 'MsgTransfer', 'RetryIBCTransferRequest', 'RouteIBCTransfersRequest', 'MsgUpdateClient', 'MsgAcknowledgement', 'SignCommands'])) {
    output = toArray(
      toArray(messages).flatMap(m => {
        const {
          from_address,
          to_address,
          signer,
          receiver,
          token,
          chain,
          packet,
          acknowledgement,
        } = { ...m }
        let {
          sender,
          recipient,
          amount,
          source_channel,
          destination_channel,
          timeout_timestamp,
        } = { ...m }

        sender = from_address || signer || sender
        recipient = to_address || receiver
        amount = amount || [token]

        const send_packet_data = _.head(
          toArray(logs).flatMap(l =>
            toArray(l.events)
              .filter(e => equalsIgnoreCase(e.type, 'send_packet') && toArray(e.attributes).length > 0)
              .map(e => Object.fromEntries(toArray(e.attributes).map(a => [a.key, a.value])))
          )
        )
        source_channel = source_channel || send_packet_data?.packet_src_channel
        destination_channel = destination_channel || send_packet_data?.packet_dst_channel
        timeout_timestamp = formatUnits(timeout_timestamp)
        const asset_data = getAssetData(denom, assets_data)
        const { symbol, decimals } = { ...asset_data }
        const activity = {
          type: _.last(split(m['@type'], 'normal', '.')),
          sender,
          recipient,
          signer,
          chain,
          asset_data,
          symbol,
          send_packet_data,
          source_channel,
          destination_channel,
          packet,
          acknowledgement,
          timeout_timestamp,
        }

        return amount?.length > 0 && (
          Array.isArray(amount) ?
            amount.map(a => {
              const { denom, amount } = { ...a }
              return { ...a, ...activity, amount: formatUnits(amount, decimals) }
            }) :
            { ...activity, amount: formatUnits(amount, decimals) }
        )
      })
    )
  }
  else if (includesStringList(toArray(messages).flatMap(m => toArray([m['@type'], m.inner_message?.['@type']])), ['ConfirmDeposit', 'ConfirmTokenRequest', 'ConfirmGatewayTx', 'ConfirmTransferKey', 'VoteRequest'])) {
    output = toArray(
      toArray(messages).flatMap(m => {
        const {
          inner_message,
          sender,
          deposit_address,
          burner_address,
          denom,
        } = { ...m }
        let {
          chain,
          asset,
          tx_id,
          status,
        } = { ...m }
        const { poll_id, vote } = { ...inner_message }
        let { events } = { ...vote }

        chain =  vote?.chain || chain
        asset = asset?.name || asset
        const event = _.head(events)
        tx_id = toHex(_.head(events)?.tx_id || tx_id)
        status = _.head(events)?.status || status
        events = toArray(events).flatMap(e =>
          Object.entries(e)
            .filter(([k, v]) => v && typeof v === 'object' && !Array.isArray(v))
            .map(([k, v]) => { return { event: k, ...Object.fromEntries(Object.entries({ ...v }).map(([k, v]) => { return [k, toHex(v)] })) } })
        )
        const asset_data = getAssetData(denom || asset, assets_data)

        return sender && {
          type: _.last(split(m['@type'], 'normal', '.')),
          sender,
          chain,
          deposit_address,
          burner_address,
          tx_id,
          asset,
          denom,
          asset_data,
          status,
          poll_id,
          events,
        }
      })
    )
  }

  if (toArray(output).length < 1) {
    output = toArray(logs).flatMap(l => {
      const { log } = { ...l }
      let { events } = { ...l }

      events = toArray(events).flatMap(e => {
        const { type, attributes } = { ...e }
        const _type = type?.toLowerCase()

        if (['delegate', 'unbond', 'transfer'].includes(_type)) {
          const _events = []
          const template = { type, action: type, log }
          let _e = _.cloneDeep(template)

          toArray(attributes).forEach(a => {
            const { key, value } = { ...a }
            _e[key] = value
            switch (key) {
              case 'amount':
                const start_denom_index = split(value, 'normal', '').findIndex(c => isNaN(c)) || -1
                if (start_denom_index > -1) {
                  const denom = value.substring(start_denom_index)
                  const asset_data = getAssetData(denom, assets_data)
                  const { symbol, decimals } = { ...asset_data }
                  _e.denom = asset_data?.denom || denom
                  _e.symbol = symbol
                  _e[key] = formatUnits(value, decimals)
                }
                break
              case 'validator':
                _e.recipient = value
                break
              default:
                break
            }
            if (key === (attributes.findIndex(_a => _a.key === 'denom') > -1 ? 'denom' : 'amount')) {
              const delegator_address = _.head(toArray(toArray(messages).map(m => m.delegator_address)))
              switch (_type) {
                case 'delegate':
                  if (!_e.sender) {
                    _e.sender = delegator_address
                  }
                  break
                case 'unbond':
                  if (!_e.recipient) {
                    _e.recipient = delegator_address
                  }
                default:
                  break
              }
              _events.push(_e)
              _e = _.cloneDeep(template)
            }
          })

          return _events
        }
        else if (e) {
          const event = {
            type,
            log,
            ..._.assign.apply(
              _,
              toArray(attributes).map(a => {
                const { key, value } = { ...a }
                const { decimals } = { ...getAssetData(denom, assets_data) }
                const attribute = {
                  [key]:
                    key === 'amount' && typeof value === 'string' ?
                      formatUnits(value || '0', decimals) :
                      key === 'action' ?
                        _.last(split(value, 'normal', '.')) :
                        value,
                }
                let { symbol, amount } = { ...attribute }

                if (key === 'amount' && typeof value === 'string' && (denom || asset)) {
                  const asset_data = getAssetData(denom || asset, assets_data)
                  symbol = asset_data?.symbol || symbol
                }

                if (!symbol) {
                  const _denom = attributes.find(_a => _a.key === 'denom')
                  const _amount = attributes.find(_a => _a.key === 'amount')

                  if (_denom?.value) {
                    const denom = _denom.value
                    const asset_data = getAssetData(denom, assets_data)
                    const { decimals } = { ...asset_data }
                    attribute.denom = asset_data?.denom || denom
                    symbol = asset_data?.symbol || symbol
                    amount = formatUnits(_amount?.value || '0', decimals)
                  }
                  else {
                    const start_denom_index = split(_amount?.value, 'normal', '').findIndex(c => isNaN(c)) || -1
                    if (start_denom_index > -1) {
                      const denom = _amount.value.substring(start_denom_index)
                      const asset_data = getAssetData(denom, assets_data)
                      const { decimals } = { ...asset_data }
                      attribute.denom = asset_data?.denom || denom
                      symbol = asset_data?.symbol || symbol
                      amount = formatUnits(_amount.value.replace(denom, '') || '0', decimals)
                    }
                  }
                }
                return { ...attribute, symbol, amount }
              }),
            ),
          }

          let { action, recipient } = { ...event }
          if (!action) {
            action = type
          }
          recipient = _.uniq(toArray(attributes).filter(a => a.key === 'recipient').map(a => a.value))
          return toArray({ ...event, action, recipient })
        }
      })

      const delegate_event_types = ['delegate', 'unbond']
      const transfer_event_types = ['transfer']

      return (
        includesStringList(toArray(events).map(e => e.type), delegate_event_types) ?
          toArray(events).filter(e => delegate_event_types.includes(e.type)) :
          includesStringList(toArray(events).map(e => e.type), transfer_event_types) ?
            toArray(events).filter(e => transfer_event_types.includes(e.type)) :
            _.assign.apply(_, events)
      )
    })
  }

  if (toArray(output).length < 1 && code) {
    output = toArray({ failed: true })
  }
  else {
    output = toArray(output).map(a => {
      const { asset } = { ...a }
      let { packet_data, symbol } = { ...a }
      if (typeof packet_data === 'string') {
        try {
          packet_data = JSON.parse(packet_data)
          const { denom } = { ...packet_data }
          let { amount } = { ...packet_data }
          const asset_data = getAssetData(denom, assets_data)
          const { decimals } = { ...asset_data }
          symbol = asset_data?.symbol || symbol
          amount = formatUnits(amount, decimals)
          packet_data = { ...packet_data, amount }
        } catch (error) {}
      }
      else if (asset) {
        const asset_data = getAssetData(asset, assets_data)
        symbol = asset_data?.symbol || symbol
      }
      return { ...a, packet_data, symbol }
    })
  }
  return output
}

export const getSender = (data, assets_data) => {
  const { tx, types } = { ...data }
  const { messages } = { ...tx?.body }
  return _.head(
    toArray(
      toArray([equalsIgnoreCase(_.head(types), 'MsgDelegate') && 'delegator_address', equalsIgnoreCase(_.head(types), 'MsgUndelegate') && 'validator_address', 'sender', 'signer']).map(f =>
        _.head(toArray(messages).map(m => m[f])) ||
        _.head(data?.[`tx.body.messages.${f}`]) ||
        toArray(getActivities(data, assets_data)).find(a => a[f])?.[f]
      )
    )
  )
}

export const getRecipient = (data, assets_data) => {
  const { tx, types } = { ...data }
  const { messages } = { ...tx?.body }
  return _.head(
    toArray(
      toArray([equalsIgnoreCase(_.head(types), 'MsgDelegate') && 'validator_address', equalsIgnoreCase(_.head(types), 'MsgUndelegate') && 'delegator_address', 'recipient']).map(f =>
        _.head(toArray(toArray(messages).map(m => m[f]))) ||
        _.head(data?.[`tx.body.messages.${f}`]) ||
        toArray(getActivities(data, assets_data)).find(a => a[f])?.[f]
      )
    )
  )
}