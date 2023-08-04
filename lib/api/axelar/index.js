const request = async params => {
  const response = await fetch(process.env.NEXT_PUBLIC_API_URL, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const getInflation = async params => await request({ ...params, method: 'getInflation' })
export const getChainMaintainers = async params => await request({ ...params, method: 'getChainMaintainers' })
export const getEscrowAddresses = async params => await request({ ...params, method: 'getEscrowAddresses' })
export const searchBlocks = async params => await request({ ...params, method: 'searchBlocks' })
export const searchTransactions = async params => await request({ ...params, method: 'searchTransactions' })