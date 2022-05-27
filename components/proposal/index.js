import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'

import Info from './info'
import Votes from './votes'
import { proposal as getProposal, all_proposal_votes } from '../../lib/api/cosmos'
import { number_format, name, equals_ignore_case } from '../../lib/utils'

export default () => {
  const { assets, validators } = useSelector(state => ({ assets: state.assets, validators: state.validators }), shallowEqual)
  const { assets_data } = { ...assets }
  const { validators_data } = { ...validators }

  const router = useRouter()
  const { query } = { ...router }
  const { id } = { ...query }

  const [proposal, setProposal] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (id && assets_data && validators_data) {
        if (!controller.signal.aborted) {
          let response = await getProposal(id, null, assets_data)
          const data = { ...response }
          response = await all_proposal_votes(id)
          const votes = _.orderBy((response?.data || []).map(v => {
            return {
              ...v,
              validator_data: validators_data?.find(_v => equals_ignore_case(_v?.delegator_address, v?.voter)),
            }
          }), ['validator_data.tokens', 'validator_data.description.moniker'], ['desc', 'asc'])
          data.votes = votes
          setProposal({ data, id })
        }
      }
    }
    getData()
    const interval = setInterval(() => getData(), 3 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [id, assets_data, validators_data])

  const votes = (proposal?.id === id && Object.entries(
    _.groupBy(proposal?.data?.votes || [], 'option')
  ).map(([k, v]) => {
    return {
      option: k,
      value: v?.length || 0,
    }
  }).filter(v => v.value)) || []
  const end = proposal?.data?.voting_end_time && proposal.data.voting_end_time < moment().valueOf()

  return (
    <div className="space-y-4 mt-2 mb-6 mx-auto">
      <Info data={proposal?.id === id && proposal?.data} />
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <span className="capitalize text-lg font-bold">
            {end ? 'final tally' : 'votes'}
          </span>
          <div className="flex items-center space-x-1">
            {end ?
              proposal?.id === id && Object.entries({ ...proposal?.data?.final_tally_result }).filter(([k, v]) => v).map(([k, v]) => (
                <div
                  key={k}
                  className="max-w-min bg-slate-100 dark:bg-slate-900 rounded-lg uppercase whitespace-nowrap font-semibold py-1 px-2">
                  {name(k)}: {number_format(v, '0,0.00a')}
                </div>
              ))
              :
              votes.map((v, i) => (
                <div
                  key={i}
                  className={`${['YES'].includes(v?.option) ? 'bg-green-400 dark:bg-green-500 text-white' : ['NO'].includes(v?.option) ? 'bg-red-400 dark:bg-red-500 text-white' : 'bg-slate-100 dark:bg-slate-900'} rounded-lg uppercase whitespace-nowrap font-semibold py-1 px-2`}
                >
                  {number_format(v.value, '0,0')} {v?.option?.replace('_', ' ')}
                </div>
              ))
            }
          </div>
        </div>
        {!end && (
          <Votes data={proposal?.id === id && proposal?.data?.votes} />
        )}
      </div>
    </div>
  )
}