const request = async (path, params) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/heartbeats${path}`, {
    method: 'POST',
    body: JSON.stringify(params),
  }).catch(error => { return null })
  return res && await res.json()
}

export const heartbeats = async params => {
  const path = ''
  params = { ...params }
  return await request(path, params)
}