const request = async (method, params) => {
  const response = await fetch(process.env.NEXT_PUBLIC_TOKEN_TRANSFER_API_URL ? `${process.env.NEXT_PUBLIC_TOKEN_TRANSFER_API_URL}/${method}` : process.env.NEXT_PUBLIC_API_URL, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const searchTransfers = async params => await request('searchTransfers', { ...params, method: 'searchTransfers' })
export const resolveTransfer = async params => await request('resolveTransfer', { ...params, method: 'resolveTransfer' })
export const searchDepositAddresses = async params => await request('searchDepositAddresses', { ...params, method: 'searchDepositAddresses' })
export const transfersStats = async params => await request('transfersStats', { ...params, method: 'transfersStats' })
export const transfersChart = async params => await request('transfersChart', { ...params, method: 'transfersChart' })
export const transfersCumulativeVolume = async params => await request('transfersCumulativeVolume', { ...params, method: 'transfersCumulativeVolume' })
export const transfersTotalVolume = async params => await request('transfersTotalVolume', { ...params, method: 'transfersTotalVolume' })
export const transfersTotalFee = async params => await request('transfersTotalFee', { ...params, method: 'transfersTotalFee' })
export const transfersTotalActiveUsers = async params => await request('transfersTotalActiveUsers', { ...params, method: 'transfersTotalActiveUsers' })
export const transfersTopUsers = async params => await request('transfersTopUsers', { ...params, method: 'transfersTopUsers' })