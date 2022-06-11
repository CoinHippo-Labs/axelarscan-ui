const request = async params => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cross-chain/transfers`, {
    method: 'POST',
    body: JSON.stringify(params),
  }).catch(error => { return null })
  return res && await res.json()
}

export const transfer = async params => {
  params = {...params }
  return await request(params)
}