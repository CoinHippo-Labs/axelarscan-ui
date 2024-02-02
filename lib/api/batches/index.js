const request = async (method, params) => {
  const response = await fetch(process.env.NEXT_PUBLIC_TOKEN_TRANSFER_API_URL ? `${process.env.NEXT_PUBLIC_TOKEN_TRANSFER_API_URL}/${method}` : process.env.NEXT_PUBLIC_API_URL, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const searchBatches = async params => await request('searchBatches', { ...params, method: 'searchBatches' })