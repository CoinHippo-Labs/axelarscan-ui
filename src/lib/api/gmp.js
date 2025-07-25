import { objToQS } from '@/lib/parser'

const request = async (method, params, requestMethod = 'POST') => {
  requestMethod = Object.values({ ...params }).findIndex(v => v && typeof v === 'object') > -1 ? 'POST' : requestMethod
  const response = await fetch(`${process.env.NEXT_PUBLIC_GMP_API_URL}/${method}${requestMethod === 'GET' ? objToQS(params) : ''}`, { method: requestMethod, body: requestMethod === 'GET' ? undefined : JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const getContracts = async () => await request('getContracts')
export const getConfigurations = async () => await request('getConfigurations')
export const estimateITSFee = async params => await request('estimateITSFee', params)
export const searchGMP = async params => await request('searchGMP', params)
export const GMPStatsByChains = async params => await request('GMPStatsByChains', params)
export const GMPStatsByContracts = async params => await request('GMPStatsByContracts', params)
export const GMPStatsAVGTimes = async params => await request('GMPStatsAVGTimes', params)
export const GMPChart = async params => await request('GMPChart', params)
export const GMPTotalVolume = async params => await request('GMPTotalVolume', params)
export const GMPTopUsers = async params => await request('GMPTopUsers', params)
export const GMPTopITSAssets = async params => await request('GMPTopITSAssets', params)
export const estimateTimeSpent = async params => await request('estimateTimeSpent', params)
