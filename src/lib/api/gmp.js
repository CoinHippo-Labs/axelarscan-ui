const request = async params => {
  const response = await fetch(process.env.NEXT_PUBLIC_GMP_API_URL, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const getContracts = async () => await request({ method: 'getContracts' })
export const getConfigurations = async () => await request({ method: 'getConfigurations' })
export const searchGMP = async params => await request({ ...params, method: 'searchGMP' })
export const GMPStats = async params => await request({ ...params, method: 'GMPStats' })
export const GMPChart = async params => await request({ ...params, method: 'GMPChart' })
export const GMPTotalVolume = async params => await request({ ...params, method: 'GMPTotalVolume' })
export const GMPTotalFee = async params => await request({ ...params, method: 'GMPTotalFee' })
export const GMPTotalActiveUsers = async params => await request({ ...params, method: 'GMPTotalActiveUsers' })
export const GMPTopUsers = async params => await request({ ...params, method: 'GMPTopUsers' })
export const estimateTimeSpent = async params => await request({ ...params, method: 'estimateTimeSpent' })
