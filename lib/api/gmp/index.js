import _ from 'lodash'

const request = async (
  params,
) => {
  const response =
    await fetch(
      process.env.NEXT_PUBLIC_GMP_API_URL,
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

export const search = async params => {
  let response =
    await request(
      {
        ...params,
        method: 'searchGMP',
      },
    )

  const {
    data,
    aggs,
    total,
  } = { ...response }
  const {
    source_chains,
    assets,
  } = { ...aggs }

  if (source_chains?.buckets) {
    const {
      buckets,
    } = { ...source_chains }

    response = {
      data:
        _.orderBy(
          Object.entries(
            _.groupBy(
              buckets
                .flatMap(s => (
                  (s.destination_chains?.buckets || [])
                    .flatMap(d => (
                      d.assets?.buckets?.map(a => {
                        return {
                          id: `${s.key?.toLowerCase()}_${d.key?.toLowerCase()}_${a.key}`,
                          source_chain: s.key?.toLowerCase(),
                          destination_chain: d.key?.toLowerCase(),
                          asset: a.key,
                          num_txs: a.doc_count,
                        }
                      }) ||
                      [{
                        id: `${s.key?.toLowerCase()}_${d.key?.toLowerCase()}`,
                        source_chain: s.key?.toLowerCase(),
                        destination_chain: d.key?.toLowerCase(),
                        num_txs: d.doc_count,
                      }]
                    ))
                )),
              'id',
            )
          )
          .map(([k, v]) => {
            const {
              source_chain,
              destination_chain,
              asset,
            } = { ..._.head(v) }

            return {
              id: k,
              source_chain,
              destination_chain,
              asset:
                asset ||
                undefined,
              num_txs:
                _.sumBy(
                  v,
                  'num_txs',
                ),
            }
          })
          .filter(d =>
            d?.source_chain &&
            d.destination_chain
          ),
          ['num_txs'],
          ['desc'],
        ),
      total,
    }
  }
  else if (assets?.buckets) {
    const {
      buckets,
    } = { ...assets }

    response = {
      data: buckets
        .flatMap(a => (
          (a.destination_chains?.buckets || [])
            .map(d => {
              return {
                id: `${a.key}_${d.key}`,
                asset: a.key,
                destination_chain: d.key,
                num_txs: d.doc_count,
              }
            })
        )),
      total,
    }
  }

  return response
}

export const stats = async params =>
  await request(
    {
      ...params,
      method: 'GMPStats',
    },
  )

export const chart = async params =>
  await request(
    {
      ...params,
      method: 'GMPChart',
    },
  )

export const cumulative_volume = async params =>
  await request(
    {
      ...params,
      method: 'GMPCumulativeVolume',
    },
  )

export const total_volume = async params =>
  await request(
    {
      ...params,
      method: 'GMPTotalVolume',
    },
  )

export const getContracts = async params =>
  await request(
    {
      ...params,
      method: 'getContracts',
    },
  )

export const isContractCallApproved = async params =>
  await request(
    {
      ...params,
      method: 'isContractCallApproved',
    },
  )