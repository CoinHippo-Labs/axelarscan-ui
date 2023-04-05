import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'

import Info from './info'
import Votes from './votes'
import { proposal as getProposal, all_proposal_votes } from '../../lib/api/lcd'
import { native_asset_id, assetManager } from '../../lib/object/asset'
import { number_format, name, equalsIgnoreCase } from '../../lib/utils'

export default () => {
  const {
    assets,
    validators,
  } = useSelector(state =>
    (
      {
        assets: state.assets,
        validators: state.validators,
      }
    ),
    shallowEqual,
  )
  const {
    assets_data,
  } = { ...assets }
  const {
    validators_data,
  } = { ...validators }

  const router = useRouter()
  const {
    query,
  } = { ...router }
  const {
    id,
  } = { ...query }

  const [proposal, setProposal] = useState(null)

  useEffect(
    () => {
      const getData = async () => {
        if (
          id &&
          assets_data &&
          validators_data
        ) {
          const response =
            await getProposal(
              id,
              null,
              assets_data,
            )

          const _response =
            await all_proposal_votes(
              id,
            )

          const {
            data,
          } = { ..._response }

          setProposal(
            {
              data: {
                ...response,
                votes:
                  _.orderBy(
                    (data || [])
                      .map(v => {
                        const {
                          voter,
                        } = { ...v }

                        const validator_data = validators_data
                          .find(_v =>
                            equalsIgnoreCase(
                              _v?.delegator_address,
                              voter,
                            )
                          )
                        const {
                          tokens,
                        } = { ...validator_data }

                        const _tokens =
                          assetManager
                            .amount(
                              tokens,
                              native_asset_id,
                              assets_data,
                            )

                        return {
                          ...v,
                          validator_data: {
                            ...validator_data,
                            tokens: _tokens,
                            quadratic_voting_power:
                              _tokens > 0 &&
                              Math.floor(
                                Math.sqrt(
                                  _tokens,
                                )
                              ),
                          },
                        }
                      }),
                    [
                      // 'validator_data.quadratic_voting_power',
                      'validator_data.tokens',
                      'validator_data.description.moniker',
                    ],
                    [
                      // 'desc',
                      'desc',
                      'asc',
                    ],
                  ),
              },
              id,
            }
          )
        }
      }

      getData()

      const interval =
        setInterval(() =>
          getData(),
          3 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [id, assets_data, validators_data],
  )

  const {
    data,
  } = { ...proposal }
  const {
    voting_end_time,
    final_tally_result,
    votes,
  } = { ...data }

  const matched = proposal?.id === id

  const vote_options =
    matched ?
      Object.entries(
        _.groupBy(
          votes ||
          [],
          'option',
        )
      )
      .map(([k, v]) => {
        return {
          option: k,
          value: (v || [])
            .length,
        }
      })
      .filter(v => v.value) :
      []

  const end =
    voting_end_time &&
    voting_end_time <
    moment()
      .valueOf()

  return (
    <div className="space-y-5 mt-2 mb-6 mx-auto">
      <Info
        data={
          matched &&
          data
        }
      />
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <span className="capitalize tracking-wider text-slate-600 dark:text-slate-300 text-sm lg:text-base font-medium">
            {end ?
              'final tally' :
              'votes'
            }
          </span>
          <div className="flex items-center space-x-1">
            {
              matched &&
              end ?
                Object.entries({ ...final_tally_result })
                  .filter(([k, v]) => v)
                  .map(([k, v]) => (
                    <div
                      key={k}
                      className="max-w-min bg-slate-200 dark:bg-slate-800 rounded uppercase whitespace-nowrap text-xs font-medium space-x-1 py-1 px-1.5"
                    >
                      <span>
                        {name(k)}:
                      </span>
                      <span>
                        {number_format(
                          v,
                          '0,0.00a',
                        )}
                      </span>
                    </div>
                  )) :
                vote_options
                  .filter(v => v?.option)
                  .map((v, i) => {
                    const {
                      option,
                      value,
                    } = { ...v }

                    return (
                      <div
                        key={i}
                        className={`${['YES'].includes(option) ? 'bg-green-200 dark:bg-green-300 border-2 border-green-400 dark:border-green-600 text-green-500 dark:text-green-700' : ['NO'].includes(option) ? 'bg-red-200 dark:bg-red-300 border-2 border-red-400 dark:border-red-600 text-red-500 dark:text-red-700' : 'bg-slate-100 dark:bg-slate-800'} rounded-xl whitespace-nowrap text-xs font-semibold space-x-1 py-0.5 px-2`}
                      >
                        <span>
                          {number_format(
                            value,
                            '0,0',
                          )}
                        </span>
                        <span>
                          {
                            option
                              .replace(
                                '_',
                                ' ',
                              )
                          }
                        </span>
                      </div>
                    )
                  })
            }
          </div>
        </div>
        {
          !end &&
          (
            <Votes
              data={
                matched &&
                votes
              }
            />
          )
        }
      </div>
    </div>
  )
}