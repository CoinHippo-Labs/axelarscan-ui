import _ from 'lodash'

import { fee_denom, denom_manager } from './denom'

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
  sender: tx => (_.head(tx?.tx?.body?.messages?.map(m => m?.sender).filter(s => s)) || _.head(tx['tx.body.messages.sender'])),
  fee: (tx, denoms) => (tx?.tx?.auth_info?.fee?.amount || tx['tx.auth_info.fee.amount.amount']) && denom_manager.amount(tx['tx.auth_info.fee.amount.amount'] ? _.sum(tx['tx.auth_info.fee.amount.amount'].map(a => Number(a))) : _.sumBy(tx.tx.auth_info.fee.amount, 'amount'), fee_denom, denoms),
  symbol: (tx, denoms) => (tx?.tx?.auth_info?.fee?.amount || tx['tx.auth_info.fee.amount.denom']) && _.head(tx['tx.auth_info.fee.amount.denom']?.map(d => denom_manager.symbol(d, denoms)) || tx.tx.auth_info.fee.amount.map(a => denom_manager.symbol(a?.denom, denoms)).filter(d => d)),
  gas_used: tx => tx && Number(tx.gas_used),
  gas_limit: tx => tx && Number(tx.gas_wanted),
  memo: tx => tx?.tx?.body?.memo,
  activities: (tx, denoms) => {
    const activities = tx?.logs?.map(l => l?.events && _.assign.apply(_, (l.events.map(e => {
      const event_obj = {
        type: e.type,
        log: l.log, ...((e.attributes && _.assign.apply(_, e.attributes.map(a => {
          const attr_obj = {
            [`${a.key}`]: a.key === 'amount' && typeof a.value === 'string' ? denom_manager.amount(a.value, tx.denom || denoms?.[0]?.id, denoms) : a.key === 'action' ? _.last(a.value?.split('.') || []) : a.value,
          }
          if (a.key === 'amount' && typeof a.value === 'string') {
            attr_obj.symbol = denom_manager.symbol(tx.denom || denoms?.[0]?.id, denoms)
          }
          if (!attr_obj.symbol) {
            const attribute_amount = e.attributes.find(_a => _a.key === 'amount')
            const attribute_symbol = e.attributes.find(_a => _a.key === 'denom')
            if (attribute_symbol?.value) {
              attr_obj.symbol = _.last(attribute_symbol.value.split('/'))
              attr_obj.amount = denom_manager.amount(attribute_amount?.value || 0, attr_obj.symbol, denoms)
              attr_obj.symbol = denom_manager.symbol(attr_obj.symbol, denoms)
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
      return { ...event_obj }
    }))))
    if (activities?.length < 1 && tx?.code) {
      activities.push({ failed: true })
    }
    return activities
  },
}