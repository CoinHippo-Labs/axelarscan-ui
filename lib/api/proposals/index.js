const request = async (method, params) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/${method}`, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const getProposals = async params => await request('getProposals', params)
export const getProposal = async params => await request('getProposal', params)