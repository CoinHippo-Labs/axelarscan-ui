import _ from 'lodash'

import { to_json } from '../../utils'

const _module = 'cli'

const request = async (path, params) => {
  params = { ...params, path, module: _module }
  const res = await fetch(process.env.NEXT_PUBLIC_API_URL, {
    method: 'POST',
    body: JSON.stringify(params),
  }).catch(error => { return null })
  return res && await res.json()
}

export const axelard = async params => await request(null, params)

export const keygens_by_validator = async (address, params) => {
  const response = await axelard({
    ...params,
    cmd: `axelard q tss key-shares-by-validator ${address} -oj`,
    cache: true,
    cache_timeout: 5,
  })
  return to_json(response?.stdout)?.map(k => {
    return {
      ...k,
      snapshot_block_number: Number(k?.snapshot_block_number),
      num_validator_shares: Number(k?.num_validator_shares),
      num_total_shares: Number(k?.num_total_shares),
    }
  }) || []
}