const request = async params => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_VALIDATOR_API_URL}/rpc`, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const getStatus = async params => await request({ path: '/status', params, avg_block_time: true })