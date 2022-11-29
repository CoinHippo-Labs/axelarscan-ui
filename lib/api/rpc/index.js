import { getBlock } from '../lcd'

const _module = 'rpc'

const request = async (
  path,
  params,
) => {
  params = {
    ...params,
    path,
    module: _module,
  }

  const response =
    await fetch(
      process.env.NEXT_PUBLIC_API_URL,
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

export const getStatus = async (
  params,
  status,
) => {
  const path = '/status'

  const response =
    await request(
      path,
      params,
    )

  let {
    earliest_block_height,
    latest_block_height,
  } = { ...response }

  earliest_block_height = Number(earliest_block_height)
  latest_block_height = Number(latest_block_height)

  let {
    earliest_block_time,
    chain_id,
  } = { ...status }

  if (earliest_block_height > 0) {
    const block_variance = 1

    earliest_block_height += (
      earliest_block_height + block_variance < latest_block_height ?
        block_variance :
        0
    )

    if (!chain_id) {
      const _response = await getBlock(earliest_block_height)

      earliest_block_time =
        _response?.block?.header?.time ||
        status?.earliest_block_time

      chain_id =
        _response?.block?.header?.chain_id ||
        status?.chain_id
    }
  }

  return {
    ...response,
    earliest_block_height,
    earliest_block_time,
    latest_block_height,
    chain_id,
    is_interval: !!status,
  }
}

export const genesis = async params => {
  const response =
    await request(
      '/genesis',
      params,
    )

  const {
    app_state,
  } = { ...response?.result?.genesis }

  return {
    ...app_state,
  }
}

export const consensus_state = async params =>
  await request(
    '/dump_consensus_state',
    params,
  )