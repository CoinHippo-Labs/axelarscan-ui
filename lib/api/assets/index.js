const _module = 'assets'

const request = async (path, params) => {
  params = { ...params, path, module: _module }
  const res = await fetch(process.env.NEXT_PUBLIC_API_URL, {
    method: 'POST',
    body: JSON.stringify(params),
  }).catch(error => { return null })
  return res && await res.json()
}

export const assets = async params => await request(null, params)