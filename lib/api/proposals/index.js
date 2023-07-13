const request = async params => {
  const response = await fetch(process.env.NEXT_PUBLIC_API_URL, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const getProposals = async params => await request({ ...params, method: 'getProposals' })
export const getProposal = async params => await request({ ...params, method: 'getProposal' })