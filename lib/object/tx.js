import _ from 'lodash'

import { fee_denom, getDenom, denom_manager } from './denom'

export const tx_manager = {
  status: tx => tx && (!tx.code || (Array.isArray(tx.code) ? !_.last(tx.code) : false)) ? 'success' : 'failed',
  type: tx => {
    let type = _.head(tx?.logs?.flatMap(l => l?.events?.filter(e => e.type === 'message').map(e => e.type === 'message' ? e.attributes && _.head(e.attributes.filter(a => a.key === 'action').map(a => _.last(a.value?.split('.') || []))) : e.type)))
    if (tx) {
      if (!tx.code) {
        if (tx?.tx?.body?.messages?.findIndex(m => m?.inner_message?.['@type']) > -1) {
          type = _.last(tx.tx.body.messages.find(m => m?.inner_message?.['@type']).inner_message['@type'].split('.'))
        }
      }
      else {
        if (tx?.tx?.body?.messages?.findIndex(m => m?.['@type']) > -1) {
          type = _.last(tx.tx.body.messages.find(m => m?.['@type'])['@type'].split('.'))
        }
      }
      if (Array.isArray(tx.types)) {
        type = _.last(tx.types)
      }
    }
    return type?.replace('Request', '')
  },
  sender: tx => _.head(['sender', 'signer'].map(f => _.head(tx?.tx?.body?.messages?.map(m => m?.[f]).filter(s => s)) || _.head(tx[`tx.body.messages.${f}`]) || tx_manager.activities(tx)?.find(a => a?.[f])?.[f]).filter(v => v)),
  fee: (tx, denoms) => (tx?.tx?.auth_info?.fee?.amount || tx['tx.auth_info.fee.amount.amount']) && denom_manager.amount(tx['tx.auth_info.fee.amount.amount'] ? _.sum(tx['tx.auth_info.fee.amount.amount'].map(a => Number(a))) : _.sumBy(tx.tx.auth_info.fee.amount, 'amount'), fee_denom, denoms),
  symbol: (tx, denoms) => (tx?.tx?.auth_info?.fee?.amount || tx['tx.auth_info.fee.amount.denom']) && _.head(tx['tx.auth_info.fee.amount.denom']?.map(d => denom_manager.symbol(d, denoms)) || tx.tx.auth_info.fee.amount.map(a => denom_manager.symbol(a?.denom, denoms)).filter(d => d)),
  gas_used: tx => tx && Number(tx.gas_used),
  gas_limit: tx => tx && Number(tx.gas_wanted),
  memo: tx => tx?.tx?.body?.memo,
  activities: (tx, denoms) => {
    let activities = tx?.logs?.flatMap(l => {
      const events = l?.events?.flatMap(e => {
        if (e.type === 'transfer') {
          const es = []
          const template_e = {
            type: e.type,
            log: l.log,
            action: e.type,
          }
          let _e = _.cloneDeep(template_e)
          e.attributes?.forEach(a => {
            _e[a.key] = a.value
            if (a.key === 'amount') {
              const start_denom_index = _e[a.key]?.split('').findIndex(c => isNaN(c)) || -1
              const denom = _e[a.key]?.substring(start_denom_index)
              _e[a.key] = denom_manager.amount(_e[a.key]?.substring(0, denom ? start_denom_index : undefined) || 0, denom, denoms)
              _e.denom = denom_manager.id(denom, denoms)
              _e.symbol = denom_manager.symbol(denom, denoms)
            }
            if (a.key === (e.attributes.findIndex(_a => _a.key === 'denom') > -1 ? 'denom' : 'amount')) {
              es.push(_e)
              _e = _.cloneDeep(template_e)
            }
          })
          return es
        }
        else {
          const event_obj = {
            type: e.type,
            log: l.log,
            ...((e.attributes && _.assign.apply(_, e.attributes.map(a => {
              const attr_obj = {
                [`${a.key}`]: a.key === 'amount' && typeof a.value === 'string' ? denom_manager.amount(a.value, tx.denom || denoms?.[0]?.id, denoms) : a.key === 'action' ? _.last(a.value?.split('.') || []) : a.value,
              }
              if (a.key === 'amount' && typeof a.value === 'string' && (tx.denom || tx.asset)) {
                attr_obj.symbol = denom_manager.symbol((tx.denom || tx.asset), denoms)
              }
              if (!attr_obj.symbol) {
                const attribute_amount = e.attributes.find(_a => _a.key === 'amount')
                const attribute_symbol = e.attributes.find(_a => _a.key === 'denom')
                if (denoms) {
                  if (attribute_symbol?.value) {
                    attr_obj.symbol = _.last(attribute_symbol.value.split('/'))
                    attr_obj.amount = denom_manager.amount(attribute_amount?.value || 0, attr_obj.symbol, denoms)
                    attr_obj.denom = denom_manager.id(attr_obj.symbol, denoms)
                    attr_obj.symbol = denom_manager.symbol(attr_obj.symbol, denoms)
                  }
                  else {
                    const start_denom_index = attribute_amount?.value?.split('').findIndex(c => isNaN(c)) || -1
                    if (start_denom_index > -1) {
                      const denom = attribute_amount.value.substring(start_denom_index)
                      attr_obj.amount = denom_manager.amount(attribute_amount.value.replace(denom, '') || 0, denom, denoms)
                      attr_obj.denom = denom_manager.id(denom, denoms)
                      attr_obj.symbol = denom_manager.symbol(denom, denoms)
                    }
                  }
                }
              }
              return { ...attr_obj }
            }))) || {}),
          }
          if (!event_obj?.action) {
            event_obj.action = event_obj.type
          }
          if (e?.attributes?.findIndex(a => a.key === 'recipient') > -1) {
            event_obj.recipient = _.uniq(e.attributes.filter(a => a.key === 'recipient').map(a => a.value))
          }
          return [{ ...event_obj }]
        }
      })
      return events?.findIndex(e => e?.type === 'transfer') > -1 ?
        events.filter(e => e?.type === 'transfer') :
        _.assign.apply(_, (events))
    })
    if (activities?.length < 1 && tx?.code) {
      activities.push({ failed: true })
    }
    else {
      activities = activities.map(a => {
        const _a = { ...a }
        const { packet_data, asset } = { ..._a }
        if (typeof packet_data === 'string') {
          try {
            _a.packet_data = JSON.parse(packet_data)
            const { amount } = { ..._a.packet_data }
            let { denom } = { ..._a.packet_data }
            denom = _.last(denom?.split('/'))
            _a.amount = denom_manager.amount(amount, denom, denoms)
            _a.symbol = denom_manager.symbol(denom, denoms)
          } catch (error) {}
        }
        else if (asset) {
          _a.symbol = denom_manager.symbol(asset, denoms)
        }
        return _a
      })
    }
    return activities
  },
}