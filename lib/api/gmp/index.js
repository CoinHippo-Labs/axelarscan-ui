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
      data: response.aggs.source_chains.buckets.flatMap(s => (
        s.destination_chains?.buckets?.flatMap(d => (
          d.assets?.buckets?.map(a => {
            return {
              id: `${s.key}_${d.key}_${a.key}`,
              source_chain: s.key,
              destination_chain: d.key,
              asset: a.key,
              num_txs: a.doc_count,
            }
          }) || [{
            id: `${s.key}_${d.key}`,
            source_chain: s.key,
            destination_chain: d.key,
            num_txs: d.doc_count,
          }]
        )) || []
      )),
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