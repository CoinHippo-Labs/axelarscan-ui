const request = async (method, params) => {
  const response = await fetch(process.env.NEXT_PUBLIC_VALIDATOR_API_URL ? `${process.env.NEXT_PUBLIC_VALIDATOR_API_URL}/${method}` : process.env.NEXT_PUBLIC_API_URL, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const searchUptimes = async params => await request('searchUptimes', { ...params, method: 'searchUptimes' })
export const searchHeartbeats = async params => await request('searchHeartbeats', { ...params, method: 'searchHeartbeats' })
export const getValidators = async params => await request('getValidators', { ...params, method: 'getValidators' })
export const getValidatorsVotes = async params => await request('getValidatorsVotes', { ...params, method: 'getValidatorsVotes' })