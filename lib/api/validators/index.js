const request = async (method, params) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_VALIDATOR_API_URL}/${method}`, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const searchBlocks = async params => await request('searchBlocks', params)
export const searchTransactions = async params => await request('searchTransactions', params)
export const searchUptimes = async params => await request('searchUptimes', params)
export const searchHeartbeats = async params => await request('searchHeartbeats', params)
export const getValidators = async params => await request('getValidators', params)
export const getValidatorsVotes = async params => await request('getValidatorsVotes', params)
export const getChainMaintainers = async params => await request('getChainMaintainers', params)