import _ from 'lodash'

import { transactionManager } from '../../object/transaction'
import { base64ToHex, base64ToBech32 } from '../../object/key'

const _module = 'index'

const request = async (
  path,
  params,
) => {
  params = {
    ...params,
    path,
    module: _module,
  }

  const response =
    await fetch(
      process.env.NEXT_PUBLIC_API_URL,
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
    )
    .catch(error => {
      return null
    })

  return (
    response &&
    await response.json()
  )
}

export const transactions = async (
  params,
  assets_data,
) => {
  const _response =
    await request(
      '/txs/_search',
      {
        ...params,
        collection: 'txs',
        method: 'search',
      },
    )

  let response = _.cloneDeep(_response)

  if (response?.data) {
    response.data =
      response.data
        .map(d => {
          return {
            ...d,
            status: transactionManager.status(d),
            type: transactionManager.type(d),
            sender: transactionManager.sender(d),
            recipient: transactionManager.recipient(d),
            fee:
              transactionManager
                .fee(
                  d,
                  assets_data,
                ),
            symbol:
              transactionManager
                .symbol(
                  d,
                  assets_data,
                ),
            gas_used: transactionManager.gas_used(d),
            gas_limit: transactionManager.gas_limit(d),
            memo: transactionManager.memo(d),
            activities:
              transactionManager
                .activities(
                  d,
                  assets_data,
                ),
          }
        })
  }

  const {
    types,
  } = { ..._response?.aggs }

  if (types?.buckets) {
    response = {
      data:
        types.buckets
          .map(d => d?.key)
          .filter(d => d),
    }
  }

  return response
}

export const blocks = async params => {
  const response =
    await request(
      '/blocks/_search',
      {
        ...params,
        collection: 'blocks',
        method: 'search',
      },
    )

  let {
    data,
  } = { ...response }

  if (data) {
    data =
      data
        .map(d => {
          const {
            hash,
            proposer_address,
            num_txs,
          } = { ...d }

          return {
            ...d,
            hash: base64ToHex(hash),
            proposer_address:
              base64ToBech32(
                proposer_address,
                process.env.NEXT_PUBLIC_PREFIX_CONSENSUS,
              ),
            num_txs:
              typeof num_txs === 'number' ?
                num_txs :
                -1,
          }
        })

    response = {
      ...response,
      data,
    }
  }

  return response
}

export const uptimes = async params => {
  let response =
    await request(
      '/uptimes/_search',
      {
        size: 0,
        ...params,
        collection: 'uptimes',
        method: 'search',
      },
    )

  const {
    aggs,
    total,
  } = { ...response }
  const {
    buckets,
  } = { ...aggs?.uptimes }

  if (buckets) {
    response = {
      data:
        Object.fromEntries(
          buckets
            .map(r => {
              const {
                key,
                doc_count,
              } = { ...r }

              return [
                base64ToBech32(
                  key,
                  process.env.NEXT_PUBLIC_PREFIX_CONSENSUS,
                ),
                doc_count,
              ]
            })
        ),
      total,
    }
  }

  return response
}

export const heartbeats = async params => {
  let response =
    await request(
      '/heartbeats/_search',
      {
        size: 0,
        ...params,
        collection: 'heartbeats',
        method: 'search',
      },
    )

  const {
    aggs,
    total,
  } = { ...response }
  const {
    buckets,
  } = { ...aggs?.heartbeats }

  if (buckets) {
    response = {
      data:
        Object.fromEntries(
          buckets
            .map(r => {
              const {
                key,
                period_height,
                doc_count,
              } = { ...r }

              return [
                key,
                period_height?.buckets &&
                period_height.buckets.length <= 100000 ?
                  period_height.buckets.length :
                  doc_count,
              ]
            })
        ),
      total,
    }
  }

  return response
}

export const evm_polls = async params => {
  const _response =
    await request(
      '/evm_polls/_search',
      {
        size: 0,
        ...params,
        collection: 'evm_polls',
        method: 'search',
      },
    )

  let response = _.cloneDeep(_response)

  const {
    aggs,
    total,
  } = { ...response }
  const {
    chains,
    events,
  } = { ...aggs }

  const buckets =
    chains?.buckets ||
    events?.buckets

  if (buckets) {
    response = {
      data:
        Object.fromEntries(
          buckets
            .map(c =>
              [
                c.key,
                c.doc_count,
              ]
            )
        ),
      total,
    }
  }

  return response
}

export const axelard = async params =>
  await request(
    '/axelard/_search',
    {
      ...params,
      collection: 'axelard',
      method: 'search',
    },
  )

export const deposit_addresses = async params =>
  await request(
    '/deposit_addresses/_search',
    {
      size: 0,
      ...params,
      collection: 'deposit_addresses',
      method: 'search',
    }
  )

export const transfers = async params => {
  let response =
    await request(
      '/cross_chain_transfers/_search',
      {
        size: 0,
        ...params,
        collection: 'cross_chain_transfers',
        method: 'search',
      },
    )

  const {
    aggs,
    total,
  } = { ...response }
  const {
    source_chains,
    assets,
    cumulative_volume,
    stats,
  } = { ...aggs }

  if (source_chains?.buckets) {
    const {
      buckets,
    } = { ...source_chains }

    response = {
      data:
        buckets
          .flatMap(s => (
            s.destination_chains?.buckets?.flatMap(d => (
              d.assets?.buckets?.map(a => {
                return {
                  id: `${s.key}_${d.key}_${a.key}`,
                  source_chain: s.key,
                  destination_chain: d.key,
                  asset: a.key,
                  num_txs: a.doc_count,
                  volume: a.volume?.value,
                }
              }) ||
              [{
                id: `${s.key}_${d.key}`,
                source_chain: s.key,
                destination_chain: d.key,
                num_txs: d.doc_count,
                volume: d.volume?.value,
              }]
            )) ||
            [{
              id: `${s.key}`,
              source_chain: s.key,
              num_txs: s.doc_count,
              volume: s.volume?.value,
            }]
          )),
      total,
    }
  }
  else if (assets?.buckets) {
    const {
      buckets,
    } = { ...assets }

    response = {
      data:
        buckets
          .flatMap(a => (
            a.destination_chains?.buckets?.map(d => {
              return {
                id: `${a.key}_${d.key}`,
                asset: a.key,
                destination_chain: d.key,
                num_txs: d.doc_count,
                volume: d.volume?.value,
              }
            }) ||
            [{
              id: `${a.key}`,
              asset: a.key,
              num_txs: a.doc_count,
              volume: a.volume?.value,
            }]
          )),
      total,
    }
  }
  else if (cumulative_volume?.buckets) {
    const {
      buckets,
    } = { ...cumulative_volume }

    response = {
      data:
        buckets
          .map(c => {
            return {
              timestamp: c.key,
              volume:
                c.volume?.value ||
                0,
              cumulative_volume:
                c.cumulative_volume?.value ||
                0,
              num_txs: c.doc_count,
            }
          }),
      total,
    }
  }
  else if (stats?.buckets) {
    const {
      buckets,
    } = { ...stats }

    response = {
      data:
        _.orderBy(
          buckets
            .map(c => {
              return {
                timestamp: c.key,
                volume:
                  c.volume?.value ||
                  0,
                num_txs: c.doc_count,
              }
            }),
          ['timestamp'],
          ['asc'],
        ),
      total,
    }
  }

  return response
}

export const batches = async params => {
  let response =
    await request(
      '/batches/_search',
      {
        ...params,
        collection: 'batches',
        method: 'search',
      },
    )

  const {
    buckets,
  } = { ...response?.aggs?.types }

  if (buckets) {
    response = {
      data:
        buckets
          .map(t => t?.key)
          .filter(t => t),
    }
  }

  return response
}

export const fieldsToObj = (
  fields_data,
  array_fields = [],
) => {
  const obj = {},
    fields =
      Object.keys(fields_data)
        .filter(f =>
          f &&
          !f.endsWith('.keyword')
        )
  
  fields
    .filter(f =>
      !f.includes('.')
    )
    .forEach(f => {
      const value = fields_data[f]

      obj[f] =
        array_fields.includes(f) ?
          value :
          _.head(value)
    })

  const nested_fields =
    fields
      .filter(f =>
        f.includes('.')
      )

  const csv =
    [
      nested_fields
        .join(','),
    ]

  for (let i = 0; i < fields_data[_.head(nested_fields)]?.length; i++) {
    const data = []

    nested_fields
      .forEach(f => {
        const value = fields_data[f][i]

        data.push(value)
      })

    csv
      .push(
        data
          .join(',')
      )
  }

  const json = csvToJson(csv)
  const nested_obj_fields =
    Object.keys(
      {
        ..._.head(json),
      }
    )

  const _obj =
    Object.fromEntries(
      nested_obj_fields
        .map(f =>
          [
            f,
            json
              .map(d => d[f]),
          ]
        )
  )

  return (
    mergeObj(
      obj,
      _obj,
    )
  )
}

const csvToJson = csv => {
  const construct = (
    k,
    parent = {},
    v,
  ) => {
    if (k?.split('.').length === 1) {
      parent[k] = v

      return parent
    }

    const ks =
      k
        .split('.')

    const _k = _.head(ks)

    if (!parent[_k]) {
      parent[_k] = {}
    }

    if (ks.length > 0) {
      parent[_k] =
        construct(
          ks
            .slice(1)
            .join('.'),
          parent[_k],
          v,
        )
    }

    return parent
  }

  const attrs =
    _.head(
      csv?.splice(0, 1) ||
      []
    )?.split(',') ||
    []

  const json =
    (csv || [])
      .map(row => {
        let obj = {},
          values =
            row
              .split(',')

      attrs
        .forEach((_v, i) => {
          obj =
            construct(
              _v,
              obj,
              values[i],
            )
        })

      return obj
    })

  return json
}

const mergeObj = (
  a,
  b,
) => {
  Object.entries({ ...b })
    .forEach(([k, v]) => {
      a[k] = v
    })

  return a
}