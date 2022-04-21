import { getRequestUrl } from '../../utils'

const _module = 'data'

const request = async (path, params) => {
  const res = await fetch(getRequestUrl(process.env.NEXT_PUBLIC_API_URL, path, { ...params, module: _module }))
    .catch(error => { return null })
  return res && await res.json()
}

export const chains = async params => {
  params = { ...params, collection: 'chains' }
  return await request(null, params)
}

export const assets = async params => {
  params = { ...params, collection: 'assets' }
  return await request(null, params)
}