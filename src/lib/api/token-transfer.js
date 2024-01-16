const request = async params => {
  const response = await fetch(process.env.NEXT_PUBLIC_TOKEN_TRANSFER_API_URL, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const searchTransfers = async params => request({ ...params, method: 'searchTransfers' })
export const searchDepositAddresses = async params => request({ ...params, method: 'searchDepositAddresses' })
export const searchBatches = async params => request({ ...params, method: 'searchBatches' })
