import { toArray } from '../../utils'

const STAGING = process.env.NEXT_PUBLIC_APP_URL?.includes('staging')

const request = async params => {
  const response = await fetch(process.env.NEXT_PUBLIC_API_URL, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const getChains = async () => {
  const response = await request({ method: 'getChains' })

  return (
    toArray(response)
      .filter(c => !c.is_staging || STAGING)
      .map(c => {
        const { id, explorer } = { ...c }
        const { url } = { ...explorer }
        if (url) {
          for (const explorer_url of ['https://axelarscan.io', 'https://testnet.axelarscan.io']) {
            c.explorer.url = c.explorer.url.replace(explorer_url, process.env.NEXT_PUBLIC_APP_URL)
          }
        }

        return c
      })
  )
}

export const getAssets = async () => {
  const response = await request({ method: 'getAssets' })

  return (
    toArray(response)
      .filter(a => !a.is_staging || STAGING)
      .map(a => {
        const { addresses } = { ...a }
        return {
          ...a,
          addresses: Object.fromEntries(Object.entries({ ...addresses }).filter(([k, v]) => !v.is_staging || STAGING)),
        }
      })
  )
}
