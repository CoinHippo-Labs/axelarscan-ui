const request = async params => {
  params = { ...params, method: 'rpc' }
  const response = await fetch(process.env.NEXT_PUBLIC_VALIDATOR_API_URL ? `${process.env.NEXT_PUBLIC_VALIDATOR_API_URL}/rpc` : process.env.NEXT_PUBLIC_API_URL, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const getStatus = async params => await request({ ...params, path: '/status', avg_block_time: true })