import _ from 'lodash'

import { native_asset_id, getAsset, assetManager } from './asset'
import { capitalize, equals_ignore_case } from '../utils'

export const transactionManager = {
  status: data =>
    data && (
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
        type = _.head(types) ||
          type
      }
      else {
        types = _.uniq(
          _.concat(
            messages?.map(m => m?.inner_message?.['@type']),
            logs?.flatMap(l =>
              l?.events?.filter(e => equals_ignore_case(e?.type, 'message'))
                .map(e =>
                  _.head(
                    e.attributes?.filter(a => a.key === 'action')
                      .map(a => _.last(a.value?.split('.')))
                  )
                )
            ),
            messages?.map(m => m?.['@type']),
          )
          .map(t => capitalize(_.last(t?.split('.'))))
          .filter(t => t)
        )

        type = _.head(
          types.filter(t => !types.includes(`${t}Request`))
        )
      }
    }

    return type?.replace('Request', '')
  },
  sender: data => {
    const {
      messages,
    } = { ...data?.tx?.body }

    return _.head(
      [
        'sender',
        'signer',
      ].map(f =>
        _.head(
          messages?.map(m => m?.[f])
            .filter(s => s)
        ) ||
        _.head(data?.[`tx.body.messages.${f}`]) ||
        transactionManager.activities(
          data,
        )?.find(a => a?.[f])?.[f]
      ).filter(s => s)
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
      data?.['tx.auth_info.fee.amount.amount'] ||
      amount
    ) && assetManager.amount(
      data?.['tx.auth_info.fee.amount.amount'] ?
        _.sum(
          data['tx.auth_info.fee.amount.amount'].map(a => Number(a))
        ) :
        _.sumBy(
          amount,
          'amount',
        ),
      native_asset_id,
      assets_data,
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
      data?.['tx.auth_info.fee.amount.denom'] ||
      amount
    ) && _.head(
      data?.['tx.auth_info.fee.amount.denom']?.map(d =>
        assetManager.symbol(
          d,
          assets_data,
        )
      ) ||
      amount.map(a =>
        assetManager.symbol(
          a?.denom,
          assets_data,
        )
      )
      .filter(s => s)
    )
  },
  gas_used: data => data &&
    Number(data.gas_used),
  gas_limit: data => data &&
    Number(data.gas_wanted),
  memo: data => data?.tx?.body?.memo,
  activities: (
    data,
    assets_data,
  ) => {
    const {
      code,
      logs,
      denom,
      asset,
    } = { ...data }

    let activities = logs?.flatMap(l => {
      const {
        log,
      } = { ...l }
      let {
        events,
      } = { ...l }

      events = events?.flatMap(e => {
        const {
          type,
          attributes,
        } = { ...e }

        if (equals_ignore_case(type, 'transfer')) {
          const _events = [],
            template = {
              type,
              log,
              action: type,
            }

          let _e = _.cloneDeep(template)

          if (attributes) {
            attributes.forEach(a => {
              const {
                key,
                value,
              } = { ...a }

              _e[key] = value

              if (key === 'amount') {
                const start_denom_index = value?.split('')
                  .findIndex(c => isNaN(c)) ||
                  -1

                if (start_denom_index > -1) {
                  const denom = value.substring(start_denom_index)

                  _e[key] = assetManager.amount(
                    value.replace(denom, '') || 0,
                    denom,
                    assets_data,
                  )
                  _e.symbol = assetManager.symbol(
                    denom,
                    assets_data,
                  )
                  _e.denom = assetManager.id(
                    denom,
                    assets_data,
                  )
                }
              }

              if (
                key === (
                  attributes.findIndex(_a => _a.key === 'denom') > -1 ?
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
                      denom || _.head(assets_data)?.id,
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

      return events?.findIndex(e => equals_ignore_case(e?.type, 'transfer')) > -1 ?
        events.filter(e => equals_ignore_case(e?.type, 'transfer')) :
        _.assign.apply(
          _,
          events,
        )
    })

    if (activities?.length < 1 && code) {
      activities = [
        {
          failed: true,
        },
      ]
    }
    else {
      activities = activities?.map(a => {
        const {
          asset,
        } = { ...a }
        let {
          packet_data,
          symbol,
        } = { ...a }

        if (typeof packet_data === 'string') {
          try {
            packet_data = JSON.parse(packet_data)

            const {
              denom,
            } = { ...packet_data }
            let {
              amount,
            } = { ...packet_data }

            symbol = assetManager.symbol(
              denom,
              assets_data,
            )

            amount = assetManager.amount(
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
          symbol = assetManager.symbol(
            asset,
            assets_data,
          )
        }

        return a && {
          ...a,
          packet_data,
          symbol,
        }
      })
    }

    return activities
  },
}