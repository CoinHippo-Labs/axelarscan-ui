const request = async params => {
  const response = await fetch(process.env.NEXT_PUBLIC_AXELARSCAN_API_URL, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const getChains = async () => await request({ method: 'getChains' })
export const getAssets = async () => await request({ method: 'getAssets' })
export const getITSAssets = async () => await request({ method: 'getITSAssets' })
export const getTokensPrice = async params => await request({ ...params, method: 'getTokensPrice' })
export const getInflation = async params => await request({ ...params, method: 'getInflation' })
export const getNetworkParameters = async params => await request({ ...params, method: 'getNetworkParameters' })
export const getBalances = async params => await request({ ...params, method: 'getBalances' })
export const getAccountAmounts = async params => await request({ ...params, method: 'getAccountAmounts' })
export const getProposals = async () => await request({ method: 'getProposals' })
export const getProposal = async params => await request({ ...params, method: 'getProposal' })
export const getTVL = async params => await request({ ...params, method: 'getTVL' })
