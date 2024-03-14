const request = async (method, params) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_VALIDATOR_API_URL}/${method}`, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const searchPolls = async params => await request('searchPolls', params)