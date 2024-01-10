const request = async params => {
  const response = await fetch(process.env.NEXT_PUBLIC_VALIDATOR_API_URL, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const searchBlocks = async params => await request({ ...params, method: 'searchBlocks' })
export const searchTransactions = async params => await request({ ...params, method: 'searchTransactions' })
export const searchUptimes = async params => await request({ ...params, method: 'searchUptimes' })
export const searchHeartbeats = async params => await request({ ...params, method: 'searchHeartbeats' })
export const getValidators = async params => await request({ ...params, method: 'getValidators' })
export const getValidatorsVotes = async params => await request({ ...params, method: 'getValidatorsVotes' })
export const getChainMaintainers = async params => await request({ ...params, method: 'getChainMaintainers' })