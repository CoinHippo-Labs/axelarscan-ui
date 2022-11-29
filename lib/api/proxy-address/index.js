const request = async (
  path = '',
  params,
) => {
  const response =
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/proxy-address${path}`,
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
    )
    .catch(error => {
      return null
    })

  return (
    response &&
    await response.json()
  )
}

export const proxy_address = async params =>
  await request(
    undefined,
    {
      ...params,
    },
  )