const request = async params => {
  const response = await fetch(process.env.NEXT_PUBLIC_API_URL, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const searchTransfers = async params => await request({ ...params, method: 'searchTransfers' })
export const resolveTransfer = async params => await request({ ...params, method: 'resolveTransfer' })
export const searchDepositAddresses = async params => await request({ ...params, method: 'searchDepositAddresses' })
export const transfersStats = async params => await request({ ...params, method: 'transfersStats' })
export const transfersChart = async params => await request({ ...params, method: 'transfersChart' })
export const transfersCumulativeVolume = async params => await request({ ...params, method: 'transfersCumulativeVolume' })
export const transfersTotalVolume = async params => await request({ ...params, method: 'transfersTotalVolume' })
export const transfersTopUsers = async params => await request({ ...params, method: 'transfersTopUsers' })