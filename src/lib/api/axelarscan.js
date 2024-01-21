const request = async params => {
  const response = await fetch(process.env.NEXT_PUBLIC_AXELARSCAN_API_URL, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const getChains = async () => request({ method: 'getChains' })
export const getAssets = async () => request({ method: 'getAssets' })
export const getTokensPrice = async params => request({ ...params, method: 'getTokensPrice' })
export const getInflation = async params => request({ ...params, method: 'getInflation' })
export const getNetworkParameters = async params => request({ ...params, method: 'getNetworkParameters' })
export const getBalances = async params => request({ ...params, method: 'getBalances' })
export const getDelegations = async params => request({ ...params, method: 'getDelegations' })
export const getProposals = async () => request({ method: 'getProposals' })
export const getProposal = async params => request({ ...params, method: 'getProposal' })
export const getTVL = async params => request({ ...params, method: 'getTVL' })
