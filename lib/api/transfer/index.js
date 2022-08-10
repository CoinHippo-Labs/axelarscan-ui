const request = async (path, params) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cross-chain${path}`, {
    method: 'POST',
    body: JSON.stringify(params),
  }).catch(error => { return null })
  return res && await res.json()
}

export const transfers = async params => {
  const path = '/transfers'
  params = { ...params }
  return await request(path, params)
}

export const transfers_status = async params => {
  const path = '/transfers-status'
  params = { ...params }
  return await request(path, params)
}

export const tvl = async params => {
  const path = '/tvl'
  params = { ...params }
  return await request(path, params)
}