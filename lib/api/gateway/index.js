const request = async (path, params) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gateway${path}`, {
    method: 'POST',
    body: JSON.stringify(params),
  }).catch(error => { return null })
  return res && await res.json()
}

export const token_sent = async params => {
  const path = '/token-sent'
  params = { ...params }
  return await request(path, params)
}