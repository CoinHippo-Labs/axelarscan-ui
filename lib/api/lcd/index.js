const request = async params => {
  params = { ...params, method: 'lcd' }
  const response = await fetch(process.env.NEXT_PUBLIC_API_URL, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const stakingParams = async params => await request({ ...params, path: '/cosmos/staking/v1beta1/params' })
export const bankSupply = async (denom, params) => await request({ ...params, path: `/cosmos/bank/v1beta1/supply${denom ? `/${denom}` : ''}` })
export const stakingPool = async params => await request({ ...params, path: '/cosmos/staking/v1beta1/pool' })
export const slashingParams = async params => await request({ ...params, path: '/cosmos/slashing/v1beta1/params' })
export const batchedCommands = async (chain, batchId, params) => await request({ ...params, path: `/axelar/evm/v1beta1/batched_commands/${chain}/${batchId}` })
export const getBlock = async (height, params) => await request({ ...params, path: `/cosmos/base/tendermint/v1beta1/blocks/${height}` })
export const getTransactions = async params => await request({ ...params, path: '/cosmos/tx/v1beta1/txs' })
export const getTransaction = async (txhash, params) => await request({ ...params, path: `/cosmos/tx/v1beta1/txs/${txhash}` })
export const getValidatorSets = async (height = 'latest', params) => await request({ ...params, path: `/validatorsets/${height}` })
export const distributionRewards = async (address, params) => await request({ ...params, path: `/cosmos/distribution/v1beta1/delegators/${address}/rewards` })
export const distributionCommissions = async (address, params) => await request({ ...params, path: `/cosmos/distribution/v1beta1/validators/${address}/commission` })
export const getDelegations = async (address, params) => await request({ ...params, path: `/cosmos/staking/v1beta1/validators/${address}/delegations` })