import _ from 'lodash'
import moment from 'moment'

import { genesis } from '../rpc'
import { prometheus } from '../prometheus'
import { uptimes, heartbeats } from '../opensearch'
import { base64ToBech32 } from '../../object/key'

export const getUptime = async (latestBlock, address) => {
  let data

  const response = await uptimes({
    query: { range: { height: { gt: latestBlock - Number(process.env.NEXT_PUBLIC_NUM_UPTIME_DISPLAY_BLOCKS) } } },
    size: Number(process.env.NEXT_PUBLIC_NUM_UPTIME_DISPLAY_BLOCKS),
  })

  if (response?.hits?.hits) {
    data = _.orderBy(response.hits.hits.map(uptime => uptime._source), ['height'], ['desc']).map(uptime => {
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

    if (response?.hits?.hits) {
      data = _.orderBy(_.concat(data || [], response.hits.hits.map(uptime => { return { ...uptime?.fields, height: uptime?.fields?.height?.[0], validators: uptime?.fields?.validators?.map(validator => base64ToBech32(validator, process.env.NEXT_PUBLIC_PREFIX_CONSENSUS)) } }).map(uptime => {
        return {
          height: uptime.height,
          time: moment(uptime['signatures.timestamp']?.[uptime.validators.indexOf(address) > -1 ? uptime.validators.indexOf(address) : 0]).valueOf(),
          up: uptime.validators.includes(address),
        }
      })), ['height'], ['desc'])
    }

    if (typeof response.hits?.total?.value === 'number') {
      if (typeof total === 'boolean') {
        total = response.hits.total.value
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

  if (response?.hits?.hits) {
    data = _.orderBy(_.concat(data || [], response.hits.hits.map(uptime => { return { ...uptime?.fields, height: uptime?.fields?.height?.[0], validators: uptime?.fields?.validators?.map(validator => base64ToBech32(validator, process.env.NEXT_PUBLIC_PREFIX_CONSENSUS)) } }).map(uptime => {
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

export const getHeartbeat = async (beginBlock, latestBlock, address) => {
  let data

  const response = await heartbeats({
    query: {
      bool: {
        must: [
          { match: { sender: address } },
          { range: { height: { gte: beginBlock, lte: latestBlock } } },
        ],
      },
    },
    size: Number(process.env.NEXT_PUBLIC_NUM_HEARTBEAT_BLOCKS) / Number(process.env.NEXT_PUBLIC_NUM_BLOCKS_PER_HEARTBEAT) + 1 + 150,
  })

  if (response?.hits?.hits) {
    data = _.orderBy(response.hits.hits.map(heartbeat => heartbeat._source), ['height'], ['desc']).map(heartbeat => {
      return {
        ...heartbeat,
        height: Number(heartbeat.height),
      }
    })
  }

  return { data }
}

export const keygenSummary = async params => {
  let response = await prometheus({ query: '{__name__=~"axelar_tss_minimum_keygen_threshold|axelar_tss_corruption_threshold"}' })

  let data = {
    active_keygen_threshold: Number(response?.data?.result?.find(metric => metric?.metric?.__name__ === 'axelar_tss_minimum_keygen_threshold' && metric.value?.[1])?.value[1]),
    corruption_signing_threshold: response?.data?.result && Object.fromEntries(response.data.result.filter(metric => metric?.metric && ['axelar_tss_corruption_threshold'].includes(metric.metric.__name__) && metric.value?.[1]).map(metric => [metric.metric.keyID, Number(metric.value[1])])),
  }

  response = await genesis()

  if (response?.result?.genesis?.app_state) {
    data = { ...data, ...response.result.genesis.app_state }
  }

  return data
}