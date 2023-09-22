const request = async params => {
  const response = process.env.NEXT_PUBLIC_GMP_API_URL && await fetch(process.env.NEXT_PUBLIC_GMP_API_URL, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const searchGMP = async params => await request({ ...params, method: 'searchGMP' })
export const saveGMP = async params => await request({ ...params, method: 'saveGMP' })
export const getContracts = async params => await request({ ...params, method: 'getContracts' })
export const isContractCallApproved = async params => await request({ ...params, method: 'isContractCallApproved' })
export const GMPStats = async params => await request({ ...params, method: 'GMPStats' })
export const GMPChart = async params => await request({ ...params, method: 'GMPChart' })
export const GMPCumulativeVolume = async params => await request({ ...params, method: 'GMPCumulativeVolume' })
export const GMPTotalVolume = async params => await request({ ...params, method: 'GMPTotalVolume' })
export const GMPTotalFee = async params => await request({ ...params, method: 'GMPTotalFee' })
export const GMPTotalActiveUsers = async params => await request({ ...params, method: 'GMPTotalActiveUsers' })
export const GMPTopUsers = async params => await request({ ...params, method: 'GMPTopUsers' })
export const estimateTimeSpent = async params => await request({ ...params, method: 'estimateTimeSpent' })
export const getConfigurations = async params => await request({ ...params, method: 'getConfigurations' })