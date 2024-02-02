const request = async (method, params) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/${method}`, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const getBalances = async params => await request('getBalances', params)
export const getDelegations = async params => await request('getDelegations', params)
export const getRedelegations = async params => await request('getRedelegations', params)
export const getUnbondings = async params => await request('getUnbondings', params)