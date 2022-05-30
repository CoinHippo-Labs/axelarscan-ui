import _ from 'lodash'
import moment from 'moment'

import { uptimes } from '../index'
import { base64ToBech32 } from '../../object/key'

export const getUptime = async (latestBlock, address) => {
  let data
  const response = await uptimes({
    query: { range: { height: { gt: latestBlock - Number(process.env.NEXT_PUBLIC_NUM_UPTIME_DISPLAY_BLOCKS) } } },
    size: Number(process.env.NEXT_PUBLIC_NUM_UPTIME_DISPLAY_BLOCKS),
  })
  if (response?.data) {
    data = _.orderBy(response.data, ['height'], ['desc']).map(uptime => {
      return {
        ...uptime,
        up: uptime.validators.map(v => base64ToBech32(v, process.env.NEXT_PUBLIC_PREFIX_CONSENSUS)).includes(address),
      }
    }).map(uptime => {
      return {
        ...uptime,
      }
    })
  }
  else {
    data = [...Array(Number(process.env.NEXT_PUBLIC_NUM_UPTIME_DISPLAY_BLOCKS)).keys()].map(i => {
      return {
        height: latestBlock - i,
      }
    })
  }
  return { data }
}

export const uptimeForJailedInfo = async (beginBlock, address, avgBlockTime = Number(process.env.NEXT_PUBLIC_DEFAULT_AVG_BLOCK_TIME_MS)) => {
  const size = Number(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS) / Number(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS_CHUNK)
  let data, from = 0, total = true
  while (from < total || typeof total === 'boolean') {
    const response = await uptimes({
      query: { range: { height: { gt: beginBlock } } },
      from,
      size,
      fields: ['height', 'validators', 'signatures.timestamp'],
      sort: [{ height: 'desc' }],
      _source: false,
    })
    if (response?.data) {
      data = _.orderBy(_.concat(data || [], response.data.map(uptime => { return { ...uptime, validators: uptime?.validators?.map(validator => base64ToBech32(validator, process.env.NEXT_PUBLIC_PREFIX_CONSENSUS)) } }).map(uptime => {
        return {
          height: uptime.height,
          time: moment(uptime['signatures.timestamp']?.[uptime.validators.indexOf(address) > -1 ? uptime.validators.indexOf(address) : 0]).valueOf(),
          up: uptime.validators.includes(address),
        }
      })), ['height'], ['desc'])
    }
    if (typeof response.total === 'number') {
      if (typeof total === 'boolean') {
        total = response.total
      }
    }
    else {
      total = null
    }
    from += size
  }
  return jailedInfo(data, avgBlockTime)
}

export const uptimeForJailedInfoSync = async (beginBlock, address, from = 0) => {
  const size = Number(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS) / Number(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS_CHUNK)
  let data
  const response = await uptimes({
    query: { range: { height: { gt: beginBlock } } },
    from,
    size,
    fields: ['height', 'validators', 'signatures.timestamp'],
    sort: [{ height: 'desc' }],
    _source: false,
  })
  if (response?.data) {
    data = _.orderBy(_.concat(data || [], response.data.map(uptime => { return { ...uptime, validators: uptime?.validators?.map(validator => base64ToBech32(validator, process.env.NEXT_PUBLIC_PREFIX_CONSENSUS)) } }).map(uptime => {
      return {
        height: uptime.height,
        time: moment(uptime['signatures.timestamp']?.[uptime.validators.indexOf(address) > -1 ? uptime.validators.indexOf(address) : 0]).valueOf(),
        up: uptime.validators.includes(address),
      }
    })), ['height'], ['desc'])
  }
  return data || []
}

export const jailedInfo = (data, avgBlockTime = Number(process.env.NEXT_PUBLIC_DEFAULT_AVG_BLOCK_TIME_MS)) => {
  if (data) {
    const min = _.minBy(data, 'height')?.height
    const max = _.maxBy(data, 'height')?.height
    if (min && max && max >= min) {
      const _data = []
      let previous_time = moment().valueOf() - (data.length * avgBlockTime)
      for (let i = min; i <= max; i++) {
        const block = data.find(_block => _block?.height === i)
        const time = block?.time || Math.floor(previous_time + avgBlockTime)
        _data.push(block || { height: i, time, up: false })
        previous_time = time
      }
      data = _.slice(_.orderBy(_data, ['height'], ['desc']), 0, Number(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS))
    }
  }
  data = _.orderBy(data || [], ['height'], ['asc'])
  return { data }
}