const request = async (method, params) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_GMP_API_URL}/${method}`, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const getContracts = async () => await request('getContracts')
export const getConfigurations = async () => await request('getConfigurations')
export const searchGMP = async params => await request('searchGMP', params)
export const GMPStats = async params => await request('GMPStats', params)
export const GMPChart = async params => await request('GMPChart', params)
export const GMPTotalVolume = async params => await request('GMPTotalVolume', params)
export const GMPTotalFee = async params => await request('GMPTotalFee', params)
export const GMPTotalActiveUsers = async params => await request('GMPTotalActiveUsers', params)
export const GMPTopUsers = async params => await request('GMPTopUsers', params)
export const GMPTopITSAssets = async params => await request('GMPTopITSAssets', params)
export const estimateTimeSpent = async params => await request('estimateTimeSpent', params)
