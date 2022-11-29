const request = async (
  path = '',
  params,
) => {
  const response =
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/evm-polls${path}`,
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

export const evm_polls = async params =>
  await request(
    undefined,
    {
      ...params,
    },
  )