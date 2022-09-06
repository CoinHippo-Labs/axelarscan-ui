const request = async (
  path = '',
  params,
) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/cross-chain${path}`,
    {
      method: 'POST',
      body: JSON.stringify(params),
    },
  ).catch(error => { return null })

  return response &&
    await response.json()
}

export const transfers = async params =>
  await request(
    '/transfers',
    {
      ...params,
    },
  )

export const transfers_status = async params =>
  await request(
    '/transfers-status',
    {
      ...params,
    },
  )

export const tvl = async params =>
  await request(
    '/tvl',
    {
      ...params,
    },
  )