import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'

import Info from './info'
import Votes from './votes'
import Spinner from '../../spinner'
import NumberDisplay from '../../number'
import { getProposal } from '../../../lib/api/proposals'
import { toArray, equalsIgnoreCase, getTitle } from '../../../lib/utils'

export default () => {
  const { validators } = useSelector(state => ({ validators: state.validators }), shallowEqual)
  const { validators_data } = { ...validators }

  const router = useRouter()
  const { query } = { ...router }
  const { id } = { ...query }

  const [data, setData] = useState(null)

  useEffect(
    () => {
      const getData = async () => {
        if (id) {
          const response = await getProposal({ id })
          setData({ ...response, votes: setValidatorDataToVotes(response?.votes) })
        }
      }

      getData()
      const interval = setInterval(() => getData(), 5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [id],
  )

  useEffect(
    () => {
      if (validators_data && data) {
        setData({ ...data, votes: setValidatorDataToVotes(data.votes) })
      }
    },
    [validators_data],
  )

  const setValidatorDataToVotes = votes => {
    if (validators_data) {
      votes = _.orderBy(
        toArray(votes).map(v => {
          const { voter } = { ...v }
          return { ...v, validator_data: validators_data.find(_v => equalsIgnoreCase(_v.delegator_address, voter)) }
        }),
        ['validator_data.tokens', 'validator_data.description.moniker'], ['desc', 'asc'],
      )
    }

    return votes
  }

  const { proposal_id, voting_end_time, final_tally_result, votes } = { ...data }
  const end = voting_end_time && voting_end_time < moment().valueOf()
  const vote_options = Object.entries(_.groupBy(toArray(votes), 'option')).map(([k, v]) => { return { option: k, value: toArray(v).length } }).filter(d => d.value)

  return (
    <div className="children px-3">
      {data && proposal_id === id ?
        <div className="max-w-6xl space-y-4 sm:space-y-6 pt-6 sm:pt-8 mx-auto">
          <Info data={data} />
          <div className="space-y-3">
            <div className="flex flex-wrap items-center">
              <span className="capitalize text-base font-medium mr-3">
                {end ? 'final tally' : 'votes'}
              </span>
              {end ?
                Object.entries({ ...final_tally_result })
                  .filter(([k, v]) => Number(v) > 0)
                  .map(([k, v]) => (
                    <NumberDisplay
                      key={k}
                      value={v}
                      format="0,0.00a"
                      prefix={`${getTitle(k).toLowerCase()}: `}
                      noTooltip={true}
                      className="bg-blue-500 dark:bg-blue-400 rounded-lg capitalize text-white text-sm font-medium mr-2 py-1.5 px-2"
                    />
                  )) :
                vote_options.map((v, i) => {
                  const { option, value } = { ...v }
                  return (
                    <NumberDisplay
                      key={i}
                      value={value}
                      format="0,0.00a"
                      prefix={`${getTitle(option).toLowerCase()}: `}
                      noTooltip={true}
                      className={`${['NO'].includes(value) ? 'bg-red-500 dark:bg-red-600' : ['YES'].includes(value) ? 'bg-green-500 dark:bg-green-600' : 'bg-blue-500 dark:bg-blue-400'} rounded-lg capitalize text-white text-sm font-medium mr-2 py-1.5 px-2`}
                    />
                  )
                })
              }
            </div>
            {!end && validators_data && <Votes data={votes} />}
          </div>
        </div> :
        <div className="loading">
          <Spinner name="Blocks" />
        </div>
      }
    </div>
  )
}