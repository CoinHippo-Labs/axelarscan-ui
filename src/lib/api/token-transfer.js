import { objToQS } from '@/lib/parser'

const request = async (method, params, requestMethod = 'POST') => {
  requestMethod = Object.values({ ...params }).findIndex(v => v && typeof v === 'object') > -1 ? 'POST' : requestMethod
  const response = await fetch(`${process.env.NEXT_PUBLIC_TOKEN_TRANSFER_API_URL}/${method}${requestMethod === 'GET' ? objToQS(params) : ''}`, { method: requestMethod, body: requestMethod === 'GET' ? undefined : JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const searchTransfers = async params => await request('searchTransfers', params)
export const transfersStats = async params => await request('transfersStats', params)
export const transfersChart = async params => await request('transfersChart', params)
export const transfersTotalVolume = async params => await request('transfersTotalVolume', params)
export const transfersTopUsers = async params => await request('transfersTopUsers', params)
export const searchDepositAddresses = async params => await request('searchDepositAddresses', params)
export const searchBatches = async params => await request('searchBatches', params)
export const getBatch = async (chain, batchId) => await request('lcd', { path: `/axelar/evm/v1beta1/batched_commands/${chain}/${batchId}` }, 'POST')
