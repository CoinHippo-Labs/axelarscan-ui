const _module = 'data'

const request = async (path, params) => {
  params = { ...params, path, module: _module }
  const res = await fetch(process.env.NEXT_PUBLIC_API_URL, {
    method: 'POST',
    body: JSON.stringify(params),
  }).catch(error => { return null })
  return res && await res.json()
}

export const chains = async params => {
  const is_staging = process.env.NEXT_PUBLIC_SITE_URL?.includes('staging')
  params = { ...params, collection: 'chains' }
  const response = await request(null, params)
  return {
    ...response,
    evm: response?.evm?.filter(a => !a?.is_staging || is_staging) || [],
    cosmos: response?.cosmos?.filter(a => !a?.is_staging || is_staging).map(a => {
      return a?.id === 'axelarnet' ? {
        ...a,
        explorer: {
          ...a?.explorer,
          url: a?.explorer?.url?.replace('https://axelarscan.io', process.env.NEXT_PUBLIC_SITE_URL)
          .replace('https://testnet.axelarscan.io', process.env.NEXT_PUBLIC_SITE_URL),
        },
      } : a
    }) || [],
  }
}

export const assets = async params => {
  params = { ...params, collection: 'assets' }
  return await request(null, params)
}