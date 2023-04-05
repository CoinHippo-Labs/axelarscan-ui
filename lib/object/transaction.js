import _ from 'lodash'

import { native_asset_id, getAsset, assetManager } from './asset'
import { capitalize, equalsIgnoreCase } from '../utils'

export const transactionManager = {
  status: data =>
    data &&
    (
      !data.code ||
      (Array.isArray(data.code) ?
        !_.last(data.code) :
        false
      )
    ) ?
      'success' :
      'failed',
  type: data => {
    const {
      code,
      tx,
      logs,
    } = { ...data }
    let {
      types,
    } = { ...data }
    const {
      messages,
    } = { ...tx?.body }

    let type

    if (data) {
      if (Array.isArray(types)) {
        type =
          _.head(types) ||
          type
      }
      else {
        types =
          _.uniq(
            _.concat(
              (messages || [])
                .map(m =>
                  m?.inner_message?.['@type']
                ),
              (logs || [])
                .flatMap(l =>
                  (l?.events || [])
                    .filter(e =>
                      equalsIgnoreCase(
                        e?.type,
                        'message',
                      )
                    )
                    .map(e =>
                      _.head(
                        (e.attributes || [])
                          .filter(a =>
                            a.key === 'action'
                          )
                          .map(a =>
                            _.last(
                              (a.value || '')
                                .split('.')
                            )
                          )
                      )
                    )
                ),
              (messages || [])
                .map(m =>
                  m?.['@type']
                ),
            )
            .map(t =>
              capitalize(
                _.last(
                  (t || '')
                    .split('.')
                )
              )
            )
            .filter(t => t)
          )

        type =
          _.head(
            types
              .filter(t =>
                !types.includes(`${t}Request`)
              )
          )
      }
    }

    return (
      (type || '')
        .replace(
          'Request',
          '',
        )
    )
  },
  sender: data => {
    const {
      messages,
    } = { ...data?.tx?.body }

    return (
      _.head(
        [
          equalsIgnoreCase(
            transactionManager
              .type(data),
            'MsgDelegate',
          ) &&
          'delegator_address',
          'sender',
          'signer',
        ]
        .filter(f => f)
        .map(f =>
          _.head(
            (messages || [])
              .map(m => m?.[f])
              .filter(s => s)
          ) ||
          _.head(
            data?.[`tx.body.messages.${f}`]
          ) ||
          (transactionManager
            .activities(
              data,
            ) ||
            []
          )
          .find(a =>
            a?.[f]
          )?.[f]
        )
        .filter(s => s)
      )
    )
  },
  recipient: data => {
    const {
      messages,
    } = { ...data?.tx?.body }

    return (
      _.head(
        [
          equalsIgnoreCase(
            transactionManager
              .type(data),
            'MsgDelegate',
          ) &&
          'validator_address',
          equalsIgnoreCase(
            transactionManager
              .type(data),
              'MsgUndelegate',
          ) &&
          'delegator_address',
          'recipient',
        ]
        .filter(f => f)
        .map(f =>
          _.head(
            (messages || [])
              .map(m => m?.[f])
              .filter(s => s)
          ) ||
          _.head(
            data?.[`tx.body.messages.${f}`]
          ) ||
          (
            transactionManager
              .activities(
                data,
              ) ||
              []
          )
          .find(a =>
            a?.[f]
          )?.[f]
        )
        .filter(s => s)
      )
    )
  },
  fee: (
    data,
    assets_data,
  ) => {
    const {
      amount,
    } = { ...data?.tx?.auth_info?.fee }

    return (
      (
        data?.['tx.auth_info.fee.amount.amount'] ||
        amount
      ) &&
      assetManager
        .amount(
          data?.['tx.auth_info.fee.amount.amount'] ?
            _.sum(
              data['tx.auth_info.fee.amount.amount']
                .map(a => Number(a))
            ) :
            _.sumBy(
              amount,
              'amount',
            ),
          native_asset_id,
          assets_data,
        )
    )
  },
  symbol: (
    data,
    assets_data,
  ) => {
    const {
      amount,
    } = { ...data?.tx?.auth_info?.fee }
  
    return (
      (
        data?.['tx.auth_info.fee.amount.denom'] ||
        amount
      ) &&
      _.head(
        (data?.['tx.auth_info.fee.amount.denom'] || [])
          .map(d =>
            assetManager
              .symbol(
                d,
                assets_data,
              )
          ) ||
          amount
            .map(a =>
              assetManager
                .symbol(
                  a?.denom,
                  assets_data,
                )
            )
            .filter(s => s)
      )
    )
  },
  gas_used: data =>
    data &&
    Number(data.gas_used),
  gas_limit: data =>
    data &&
    Number(data.gas_wanted),
  memo: data => data?.tx?.body?.memo,
  activities: (
    data,
    assets_data,
  ) => {
    const {
      code,
      logs,
      tx,
      denom,
      asset,
    } = { ...data }
    const {
      messages,
    } = { ...tx?.body }

    let activities

    if (
      [
        'MsgSend',
        'MsgTransfer',
        'RetryIBCTransferRequest',
        'RouteIBCTransfersRequest',
        'MsgUpdateClient',
        'MsgAcknowledgement',
      ].findIndex(s =>
        (messages || [])
          .findIndex(m =>
            m?.['@type']?.includes(s)
          ) > -1
      ) > -1
    ) {
      activities =
        messages
          .flatMap(m => {
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

            sender =
              from_address ||
              signer ||
              sender

            recipient =
              to_address ||
              receiver

            const send_packet_data =
              _.head(
                (logs || [])
                  .flatMap(l =>
                    (l?.events || [])
                      .filter(e =>
                        equalsIgnoreCase(
                          e?.type,
                          'send_packet',
                        ) &&
                        e.attributes?.length > 0
                      )
                      .map(e =>
                        Object.fromEntries(
                          e.attributes
                            .filter(a => a)
                            .map(a =>
                              [
                                a.key,
                                a.value,
                              ]
                            )
                        )
                      )
                  )
              )

            source_channel =
              source_channel ||
              send_packet_data?.packet_src_channel

            destination_channel =
              destination_channel ||
              send_packet_data?.packet_dst_channel

            amount =
              amount ||
              [token]

            const asset_data =
              getAsset(
                denom,
                assets_data,
              )

            timeout_timestamp =
              timeout_timestamp &&
              (
                Number(timeout_timestamp) /
                1000000
              )

            return (
              amount?.length > 0 &&
              (
                Array.isArray(amount) ?
                  amount
                    .map(a => {
                      const {
                        denom,
                        amount,
                      } = { ...a }

                      return {
                        ...a,
                        type:
                          _.last(
                            (m?.['@type'] || [])
                              .split('.')
                          ),
                        chain,
                        sender,
                        recipient,
                        signer,
                        symbol:
                          assetManager
                            .symbol(
                              denom,
                              assets_data,
                            ),
                        amount:
                          assetManager
                            .amount(
                              amount,
                              denom,
                              assets_data,
                            ),
                        asset_data,
                        send_packet_data,
                        source_channel,
                        destination_channel,
                        packet,
                        acknowledgement,
                        timeout_timestamp,
                      }
                    }) :
                  {
                    ...a,
                    type:
                      _.last(
                        (m?.['@type'] || [])
                          .split('.')
                      ),
                    sender,
                    recipient,
                    signer,
                    amount,
                    asset_data,
                    chain,
                    send_packet_data,
                    source_channel,
                    destination_channel,
                    packet,
                    acknowledgement,
                    timeout_timestamp,
                  }
              )
            )
          })
          .filter(a => a)
    }
    else if (
      [
        'ConfirmDeposit',
        'ConfirmTokenRequest',
        'ConfirmGatewayTx',
        'ConfirmTransferKey',
        'VoteRequest',
      ].findIndex(s =>
        (messages || [])
          .findIndex(m =>
            m?.['@type']?.includes(s) ||
            m?.inner_message?.['@type']?.includes(s)
          ) > -1
      ) > -1
    ) {
      activities =
        messages
          .flatMap(m => {
            const {
              sender,
              deposit_address,
              burner_address,
              denom,
              inner_message,
            } = { ...m }
            let {
              chain,
              tx_id,
              asset,
              status,
            } = { ...m }
            const {
              poll_id,
              vote,
            } = { ...inner_message }
            let {
              events,
            } = { ...vote }

            chain =
              vote?.chain ||
              chain

            tx_id =
              _.head(events)?.tx_id ||
              tx_id

            status =
              _.head(events)?.status ||
              status

            events =
              (events || [])
                .flatMap(e =>
                  Object.entries(e)
                    .filter(([k, v]) =>
                      typeof v === 'object' &&
                      v
                    )
                    .map(([k, v]) => {
                      return {
                        event: k,
                        ...v,
                      }
                    })
                )

            asset =
              asset?.name ||
              asset

            const asset_data =
              getAsset(
                denom ||
                asset,
                assets_data,
              )

            return (
              sender &&
              {
                type:
                  _.last(
                    (m?.['@type'] || [])
                      .split('.')
                  ),
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
            )
          })
          .filter(a => a)
    }

    if (!(activities?.length > 0)) {
      activities =
        (logs || [])
          .flatMap(l => {
            const {
              log,
            } = { ...l }
            let {
              events,
            } = { ...l }

            events =
              (events || [])
                .flatMap(e => {
                  const {
                    type,
                    attributes,
                  } = { ...e }

                  if (
                    equalsIgnoreCase(
                      type,
                      'delegate',
                    )
                  ) {
                    const _events = [],
                      template = {
                        type,
                        log,
                        action: type,
                      }

                    let _e = _.cloneDeep(template)

                    if (attributes) {
                      attributes
                        .forEach(a => {
                          const {
                            key,
                            value,
                          } = { ...a }

                          _e[key] = value

                          if (key === 'amount') {
                            const start_denom_index =
                              (value || '')
                                .split('')
                                  .findIndex(c =>
                                    isNaN(c)
                                  ) ||
                                  -1

                            if (start_denom_index > -1) {
                              const denom =
                                value
                                  .substring(start_denom_index)

                              _e[key] =
                                assetManager
                                  .amount(
                                    value
                                      .replace(
                                        denom,
                                        '',
                                      ) ||
                                    0,
                                    denom,
                                    assets_data,
                                  )

                              _e.symbol =
                                assetManager
                                  .symbol(
                                    denom,
                                    assets_data,
                                  )

                              _e.denom =
                                assetManager
                                  .id(
                                    denom,
                                    assets_data,
                                  )
                            }
                          }
                          else if (key === 'validator') {
                            _e.recipient = value
                          }

                          if (
                            key ===
                            (
                              attributes
                                .findIndex(_a =>
                                  _a.key === 'denom'
                                ) > -1 ?
                                'denom' :
                                'amount'
                            )
                          ) {
                            if (!_e.sender) {
                              _e.sender =
                                _.head(
                                  (messages || [])
                                    .map(m => m?.delegator_address)
                                    .filter(s => s)
                                )
                            }

                            _events.push(_e)
                            _e = _.cloneDeep(template)
                          }
                        })
                    }

                    return _events
                  }
                  else if (
                    equalsIgnoreCase(
                      type,
                      'unbond',
                    )
                  ) {
                    const _events = [],
                      template = {
                        type,
                        log,
                        action: type,
                      }

                    let _e = _.cloneDeep(template)

                    if (attributes) {
                      attributes
                        .forEach(a => {
                          const {
                            key,
                            value,
                          } = { ...a }

                          _e[key] = value

                          if (key === 'amount') {
                            const start_denom_index =
                              (value || '')
                                .split('')
                                .findIndex(c =>
                                  isNaN(c)
                                ) ||
                                -1

                            if (start_denom_index > -1) {
                              const denom =
                                value
                                  .substring(start_denom_index)

                              _e[key] =
                                assetManager
                                  .amount(
                                    value
                                      .replace(
                                        denom,
                                        '',
                                      ) ||
                                    0,
                                    denom,
                                    assets_data,
                                  )

                              _e.symbol =
                                assetManager
                                  .symbol(
                                    denom,
                                    assets_data,
                                  )

                              _e.denom =
                                assetManager
                                  .id(
                                    denom,
                                    assets_data,
                                  )
                            }
                          }
                          else if (key === 'validator') {
                            _e.sender = value
                          }

                          if (
                            key ===
                            (
                              attributes
                                .findIndex(_a =>
                                  _a.key === 'denom'
                                ) > -1 ?
                                'denom' :
                                'amount'
                            )
                          ) {
                            if (!_e.recipient) {
                              _e.recipient = _.head(
                                messages?.map(m => m?.delegator_address)
                                  .filter(s => s)
                              )
                            }

                            _events.push(_e)
                            _e = _.cloneDeep(template)
                          }
                        })
                    }

                    return _events
                  }
                  else if (
                    equalsIgnoreCase(
                      type,
                      'transfer',
                    )
                  ) {
                    const _events = [],
                      template = {
                        type,
                        log,
                        action: type,
                      }

                    let _e = _.cloneDeep(template)

                    if (attributes) {
                      attributes
                        .forEach(a => {
                          const {
                            key,
                            value,
                          } = { ...a }

                          _e[key] = value

                          if (key === 'amount') {
                            const start_denom_index =
                              (value || '')
                                .split('')
                                .findIndex(c =>
                                  isNaN(c)
                                ) ||
                              -1

                            if (start_denom_index > -1) {
                              const denom =
                                value
                                  .substring(start_denom_index)

                              _e[key] =
                                assetManager
                                  .amount(
                                    value
                                      .replace(
                                        denom,
                                        '',
                                      ) ||
                                    0,
                                    denom,
                                    assets_data,
                                  )

                              _e.symbol =
                                assetManager
                                  .symbol(
                                    denom,
                                    assets_data,
                                  )

                              _e.denom =
                                assetManager
                                  .id(
                                    denom,
                                    assets_data,
                                  )
                            }
                          }

                          if (
                            key ===
                            (
                              attributes
                                .findIndex(_a =>
                                  _a.key === 'denom'
                                ) > -1 ?
                                'denom' :
                                'amount'
                            )
                          ) {
                            _events.push(_e)
                            _e = _.cloneDeep(template)
                          }
                        })
                    }

                    return _events
                  }
                  else if (e) {
                    const event = {
                      type,
                      log,
                      ..._.assign.apply(
                        _,
                        attributes?.map(a => {
                          const {
                            key,
                            value,
                          } = { ...a }

                          const attribute = {
                            [key]: key === 'amount' && typeof value === 'string' ?
                              assetManager.amount(
                                value,
                                denom ||
                                  native_asset_id,
                                assets_data,
                              ) :
                              key === 'action' ?
                                _.last(value?.split('.')) :
                                value,
                          }
                          let {
                            symbol,
                            amount,
                          } = { ...attribute }

                          if (
                            key === 'amount' &&
                            typeof value === 'string' &&
                            (denom || asset)
                          ) {
                            symbol = assetManager.symbol(
                              denom || asset,
                              assets_data,
                            )
                          }

                          if (!symbol) {
                            const _symbol = e.attributes.find(_a => _a.key === 'denom')
                            const _amount = attributes.find(_a => _a.key === 'amount')

                            if (assets_data) {
                              if (_symbol?.value) {
                                const denom = _symbol.value

                                amount = assetManager.amount(
                                  _amount?.value || 0,
                                  denom,
                                  assets_data,
                                )
                                symbol = assetManager.symbol(
                                  denom,
                                  assets_data,
                                )
                                attribute.denom = assetManager.id(
                                  denom,
                                  assets_data,
                                )
                              }
                              else {
                                const start_denom_index = _amount?.value?.split('')
                                  .findIndex(c => isNaN(c)) ||
                                  -1

                                if (start_denom_index > -1) {
                                  const denom = _amount.value.substring(start_denom_index)

                                  amount = assetManager.amount(
                                    _amount.value.replace(denom, '') || 0,
                                    denom,
                                    assets_data,
                                  )
                                  symbol = assetManager.symbol(
                                    denom,
                                    assets_data,
                                  )
                                  attribute.denom = assetManager.id(
                                    denom,
                                    assets_data,
                                  )
                                }
                              }
                            }
                          }

                          return attribute && {
                            ...attribute,
                            symbol,
                            amount,
                          }
                        }),
                      ),
                    }

                    let {
                      action,
                      recipient,
                    } = { ...event }

                    if (!action) {
                      action = type
                    }

                    recipient = _.uniq(
                      e.attributes?.filter(a => a?.key === 'recipient')
                        .map(a => a.value)
                    )

                    return [
                      {
                        ...event,
                        action,
                        recipient,
                      },
                    ]
                  }
                })

            const delegate_event_types =
              [
                'delegate',
                'unbond',
              ]

            const transfer_event_types =
              [
                'transfer',
              ]

            return (
              (events || [])
                .findIndex(e =>
                  delegate_event_types.includes(e?.type)
                ) > -1 ?
                events
                  .filter(e =>
                    delegate_event_types.includes(e?.type)
                  ) :
                (events || [])
                  .findIndex(e =>
                    transfer_event_types.includes(e?.type)
                  ) > -1 ?
                  events
                    .filter(e =>
                      transfer_event_types.includes(e?.type)
                    ) :
                  _.assign
                    .apply(
                      _,
                      events,
                    )
            )
          })
    }

    if (
      activities?.length < 1 &&
      code
    ) {
      activities =
        [
          {
            failed: true,
          },
        ]
    }
    else {
      activities =
        (activities || [])
          .map(a => {
            const {
              asset,
            } = { ...a }
            let {
              packet_data,
              symbol,
            } = { ...a }

            if (typeof packet_data === 'string') {
              try {
                packet_data =
                  JSON.parse(
                    packet_data
                  )

                const {
                  denom,
                } = { ...packet_data }
                let {
                  amount,
                } = { ...packet_data }

                symbol =
                  assetManager
                    .symbol(
                      denom,
                      assets_data,
                    )

                amount =
                  assetManager
                    .amount(
                      amount,
                      denom,
                      assets_data,
                    )

                packet_data = {
                  ...packet_data,
                  amount,
                }
              } catch (error) {}
            }
            else if (asset) {
              symbol =
                assetManager
                  .symbol(
                    asset,
                    assets_data,
                  )
            }

            return (
              a &&
              {
                ...a,
                packet_data,
                symbol,
              }
            )
          })
    }

    return activities
  },
}