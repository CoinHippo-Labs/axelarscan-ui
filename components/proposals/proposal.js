import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'

import ProposalDetail from './proposal-detail'
import VotesTable from './votes-table'
import Widget from '../widget'

import { proposal as getProposal, allProposalVotes } from '../../lib/api/cosmos'
import { numberFormat, getName } from '../../lib/utils'

export default function Proposal({ id }) {
  const { denoms, validators } = useSelector(state => ({ denoms: state.denoms, validators: state.validators }), shallowEqual)
  const { denoms_data } = { ...denoms }
  const { validators_data } = { ...validators }

  const [proposal, setProposal] = useState(null)
  const [validatorsSet, setValidatorsSet] = useState(null)
  const [profilesSet, setProfilesSet] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    const getData = async () => {
      if (id && denoms_data) {
        if (!controller.signal.aborted) {
          let response = await getProposal(id, null, denoms_data)
          const data = { ...response }

          response = await allProposalVotes(id)
          const votes = _.orderBy((response?.data || []).map(vote => {
            return {
              ...vote,
              validator_data: validators_data?.find(v => v?.delegator_address?.toLowerCase() === vote?.voter?.toLowerCase()),
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
  }, [id, denoms_data, validators_data])

  useEffect(() => {
    if (validators_data && proposal?.data?.votes?.length > 0 && (!validatorsSet || !profilesSet)) {
      const votes = _.orderBy(proposal.data.votes.map(vote => {
        return {
          ...vote,
          validator_data: validators_data?.find(v => v?.delegator_address?.toLowerCase() === vote?.voter?.toLowerCase()),
        }
      }), ['validator_data.tokens', 'validator_data.description.moniker'], ['desc', 'asc'])

      setProposal({ data: { ...proposal.data, votes }, id })

      setValidatorsSet(true)

      if (votes.findIndex(_vote => _vote?.validator_data?.description?.identity && !_vote?.validator_data?.description?.image) < 0) {
        setProfilesSet(true)
      }
    }
  }, [validators_data])

  const votes = proposal?.id === id && Object.entries(_.groupBy(proposal?.data?.votes || [], 'option')).map(([key, value]) => { return { option: key, value: value?.length || 0 } })
  const end = proposal?.data?.voting_end_time && proposal.data.voting_end_time < moment().valueOf()

  return (
    <div className="max-w-6xl my-2 xl:my-4 mx-auto">
      <ProposalDetail data={proposal?.id === id && proposal?.data} />
      <Widget
        title={<div className="flex items-center text-gray-900 dark:text-white text-lg font-semibold space-x-2.5 mt-3 md:ml-2">
          <span>{end ? 'Final Tally' : 'Votes'}</span>
          <div className="flex items-center space-x-1.5">
            {end ?
              proposal?.id === id && Object.entries(proposal?.data?.final_tally_result || {}).map(([key, value]) => (
                <span key={key} className="max-w-min bg-gray-100 dark:bg-gray-900 rounded-xl capitalize whitespace-nowrap text-gray-900 dark:text-gray-200 text-xs font-semibold px-2 py-1">
                  {getName(key)}: {numberFormat(value, '0,0')}
                </span>
              ))
              :
              Array.isArray(votes) && votes.map((vote, i) => (
                <span key={i} className={`bg-${['YES'].includes(vote?.option) ? 'green-600 dark:bg-green-700' : ['NO'].includes(vote?.option) ? 'red-600 dark:bg-red-700' : 'gray-400 dark:bg-gray-900'} rounded-xl capitalize whitespace-nowrap text-white text-sm font-semibold px-2 py-1`}>
                  {numberFormat(vote.value, '0,0')} {vote?.option?.replace('_', ' ')}
                </span>
              ))
            }
          </div>
        </div>}
        className="bg-transparent border-0 p-0 md:pt-4 md:pb-8 md:px-8"
      >
        {!end && (
          <VotesTable data={proposal?.id === id && proposal?.data?.votes} />
        )}
      </Widget>
    </div>
  )
}