const request = async params => {
  const res = await fetch(process.env.NEXT_PUBLIC_GMP_API_URL, {
    method: 'POST',
    body: JSON.stringify(params),
  }).catch(error => { return null })
  return res && await res.json()
}

export const search = async params => {
  params = { ...params, method: 'searchGMP' }
  return await request(params)
}