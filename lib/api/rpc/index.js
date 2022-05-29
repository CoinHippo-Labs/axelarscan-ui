import { block } from '../cosmos'

const _module = 'rpc'

const request = async (path, params) => {
  params = { ...params, path, module: _module }
  const res = await fetch(process.env.NEXT_PUBLIC_API_URL, {
    method: 'POST',
    body: JSON.stringify(params),
  }).catch(error => { return null })
  return res && await res.json()
}

export const status = async (params, _status) => {
  const path = '/status'
  const response = await request(path, params)
  if (response && Number(response?.earliest_block_height) > 0) {
    const block_variance = 1, block_avg_time_variance = 100
    let earliest_block_height = Number(response.earliest_block_height)
    earliest_block_height = earliest_block_height + (earliest_block_height + block_variance < Number(response.latest_block_height) ? block_variance : 0)
    const earliest_block_height_for_cal = Number(response.latest_block_height) - block_avg_time_variance

    const res_block = await block(earliest_block_height)
    const res_block_for_cal = await block(earliest_block_height_for_cal)

    response.earliest_block_height = earliest_block_height
    response.earliest_block_time = res_block?.data?.time || _status?.earliest_block_time
    response.earliest_block_height_for_cal = res_block_for_cal ? earliest_block_height_for_cal : response.earliest_block_height
    response.earliest_block_time_for_cal = res_block_for_cal ? res_block_for_cal.data?.time : response.earliest_block_time
    response.chain_id = res_block?.data?.chain_id || _status?.chain_id
    response.is_interval = !!_status
  }
  return response
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