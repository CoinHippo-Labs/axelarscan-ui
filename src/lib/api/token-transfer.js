const request = async params => {
  const response = await fetch(process.env.NEXT_PUBLIC_TOKEN_TRANSFER_API_URL, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const searchTransfers = async params => await request({ ...params, method: 'searchTransfers' })
export const searchDepositAddresses = async params => await request({ ...params, method: 'searchDepositAddresses' })
export const searchBatches = async params => await request({ ...params, method: 'searchBatches' })
export const getBatch = async (chain, batchId) => await request({ method: 'lcd', path: `/axelar/evm/v1beta1/batched_commands/${chain}/${batchId}` })
