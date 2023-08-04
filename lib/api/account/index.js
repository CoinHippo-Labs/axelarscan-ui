const request = async params => {
  const response = await fetch(process.env.NEXT_PUBLIC_API_URL, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const getBalances = async params => await request({ ...params, method: 'getBalances' })
export const getDelegations = async params => await request({ ...params, method: 'getDelegations' })
export const getRedelegations = async params => await request({ ...params, method: 'getRedelegations' })
export const getUnbondings = async params => await request({ ...params, method: 'getUnbondings' })