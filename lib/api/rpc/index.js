import { getBlock } from '../cosmos'

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

  const response = await fetch(
    process.env.NEXT_PUBLIC_API_URL,
    {
      method: 'POST',
      body: JSON.stringify(params),
    },
  ).catch(error => { return null })

  return response &&
    await response.json()
}

export const getStatus = async (
  params,
  status,
) => {
  const path = '/status'

  const response = await request(
    path,
    params,
  )

  let {
    earliest_block_height,
    latest_block_height,
  } = { ...response }

  earliest_block_height = Number(earliest_block_height)
  latest_block_height = Number(latest_block_height)

  let earliest_block_time,
    earliest_block_height_for_cal,
    earliest_block_time_for_cal,
    chain_id

  if (earliest_block_height > 0) {
    const block_variance = 1,
      num_avg_block_time_blocks = Number(process.env.NEXT_PUBLIC_NUM_AVG_BLOCK_TIME_BLOCKS) || 100

    earliest_block_height += (
      earliest_block_height + block_variance < latest_block_height ?
        block_variance :
        0
    )

    earliest_block_height_for_cal = latest_block_height - num_avg_block_time_blocks

    const _response = await getBlock(earliest_block_height)
    const _response_for_cal = await getBlock(earliest_block_height_for_cal)

    earliest_block_time = _response?.time ||
      status?.earliest_block_time

    earliest_block_height_for_cal = _response_for_cal ?
      earliest_block_height_for_cal :
      earliest_block_height

    earliest_block_time_for_cal = _response_for_cal ?
      _response_for_cal?.time :
      earliest_block_time

    chain_id = _response?.chain_id ||
      status?.chain_id
  }

  return {
    ...response,
    earliest_block_height,
    earliest_block_time,
    earliest_block_height_for_cal,
    earliest_block_time_for_cal,
    chain_id,
    is_interval: !!status,
  }
}

export const genesis = async params => {
  const path = '/genesis'
  let response = await request(path, params)
  response = { ...response?.result?.genesis?.app_state }
  return response
}

export const consensus_state = async params => {
  const path = '/dump_consensus_state'
  return await request(path, params)
}