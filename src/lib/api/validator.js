const request = async params => {
  const response = await fetch(process.env.NEXT_PUBLIC_VALIDATOR_API_URL, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const rpc = async params => await request({ method: 'rpc', ...params })
export const getRPCStatus = async params => await request({ method: 'rpc', path: '/status' })
export const getValidators = async params => request({ ...params, method: 'getValidators' })
export const getValidatorsVotes = async params => request({ ...params, method: 'getValidatorsVotes' })
export const searchUptimes = async params => request({ ...params, method: 'searchUptimes' })
export const searchProposedBlocks = async params => request({ ...params, method: 'searchProposedBlocks' })
export const searchHeartbeats = async params => request({ ...params, method: 'searchHeartbeats' })
export const searchPolls = async params => request({ ...params, method: 'searchPolls' })
export const getChainMaintainers = async params => request({ ...params, method: 'getChainMaintainers' })
export const getValidatorDelegations = async params => request({ ...params, method: 'getValidatorDelegations' })
