const request = async (
  path = '',
  params,
) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/gateway${path}`,
    {
      method: 'POST',
      body: JSON.stringify(params),
    },
  ).catch(error => { return null })

  return response &&
    await response.json()
}

export const token_sent = async params =>
  await request(
    '/token-sent',
    {
      ...params,
    },
  )