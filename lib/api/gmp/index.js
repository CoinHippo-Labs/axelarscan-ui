import _ from 'lodash'

const request = async params => {
  const res = await fetch(process.env.NEXT_PUBLIC_GMP_API_URL, {
    method: 'POST',
    body: JSON.stringify(params),
  }).catch(error => { return null })
  return res && await res.json()
}

export const search = async params => {
  params = { ...params, method: 'searchGMP' }
  let response = await request(params)
  if (response?.aggs?.source_chains?.buckets) {
    response = {
      data: _.orderBy(Object.entries(_.groupBy(response.aggs.source_chains.buckets.flatMap(s => (
        s.destination_chains?.buckets?.flatMap(d => (
          d.assets?.buckets?.map(a => {
            return {
              id: `${s.key?.toLowerCase()}_${d.key?.toLowerCase()}_${a.key}`,
              source_chain: s.key?.toLowerCase(),
              destination_chain: d.key?.toLowerCase(),
              asset: a.key,
              num_txs: a.doc_count,
            }
          }) || [{
            id: `${s.key?.toLowerCase()}_${d.key?.toLowerCase()}`,
            source_chain: s.key?.toLowerCase(),
            destination_chain: d.key?.toLowerCase(),
            num_txs: d.doc_count,
          }]
        )) || []
      )), 'id')).map(([k, v]) => {
        return {
          id: k,
          source_chain: _.head(v)?.source_chain,
          destination_chain: _.head(v)?.destination_chain,
          asset: _.head(v)?.asset || undefined,
          num_txs: _.sumBy(v, 'num_txs'),
        }
      }).filter(d => d?.source_chain && d.destination_chain), ['num_txs'], ['desc']),
      total: response.total,
    }
  }
  else if (response?.aggs?.assets?.buckets) {
    response = {
      data: response.aggs.assets.buckets.flatMap(a => (
        a.destination_chains?.buckets?.map(d => {
          return {
            id: `${a.key}_${d.key}`,
            asset: a.key,
            destination_chain: d.key,
            num_txs: d.doc_count,
          }
        }) || []
      )),
      total: response.total,
    }
  }
  return response
}