const request = async (method, params) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_TOKEN_TRANSFER_API_URL}/${method}`, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const searchBatches = async params => await request('searchBatches', params)
export const batchedCommands = async (chain, batchId, params) => await request('lcd', { params, path: `/axelar/evm/v1beta1/batched_commands/${chain}/${batchId}` })