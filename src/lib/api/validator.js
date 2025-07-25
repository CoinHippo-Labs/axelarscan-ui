import { objToQS } from '@/lib/parser'

const request = async (method, params, requestMethod = 'POST') => {
  requestMethod = Object.values({ ...params }).findIndex(v => v && typeof v === 'object') > -1 ? 'POST' : requestMethod
  const response = await fetch(`${process.env.NEXT_PUBLIC_VALIDATOR_API_URL}/${method}${requestMethod === 'GET' ? objToQS(params) : ''}`, { method: requestMethod, body: requestMethod === 'GET' ? undefined : JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const rpc = async params => await request('rpc', params, 'POST')
export const getRPCStatus = async params => await request('rpc', { ...params, path: '/status' }, 'POST')
export const lcd = async params => await request('lcd', params, 'POST')
export const getBlock = async height => await request('lcd', { path: `/cosmos/base/tendermint/v1beta1/blocks/${height}` }, 'POST')
export const getValidatorSets = async (height = 'latest') => await request('lcd', { path: `/validatorsets/${height}` }, 'POST')
export const getTransaction = async txhash => await request('lcd', { path: `/cosmos/tx/v1beta1/txs/${txhash}` }, 'POST')
export const searchBlocks = async params => await request('searchBlocks', params)
export const searchTransactions = async params => await request('searchTransactions', params)
export const getTransactions = async params => await request('getTransactions', params)
export const getValidators = async params => await request('getValidators', params)
export const getValidatorsVotes = async params => await request('getValidatorsVotes', params)
export const searchUptimes = async params => await request('searchUptimes', params)
export const searchProposedBlocks = async params => await request('searchProposedBlocks', params)
export const searchHeartbeats = async params => await request('searchHeartbeats', params)
export const searchEVMPolls = async params => await request('searchEVMPolls', params)
export const searchAmplifierPolls = async params => await request('searchAmplifierPolls', params)
export const searchAmplifierProofs = async params => await request('searchAmplifierProofs', params)
export const getChainMaintainers = async params => await request('getChainMaintainers', params)
export const getValidatorDelegations = async params => await request('getValidatorDelegations', params)
export const getVerifiers = async params => await request('getVerifiers', params)
export const getVerifiersVotes = async params => await request('getVerifiersVotes', params)
export const getVerifiersSigns = async params => await request('getVerifiersSigns', params)
export const getVerifiersRewards = async params => await request('getVerifiersRewards', params)
export const searchRewardsDistribution = async params => await request('searchRewardsDistribution', params)
export const searchVerifiersRewards = async params => await request('searchVerifiersRewards', params)
export const getRewardsPool = async params => await request('getRewardsPool', params)
