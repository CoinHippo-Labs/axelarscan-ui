import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'

import Widget from '../widget'
import Copy from '../copy'

import { denomer } from '../../lib/object/denom'
import { numberFormat } from '../../lib/utils'

export default function VotingPower({ data }) {
  const { denoms, env } = useSelector(state => ({ denoms: state.denoms, env: state.env }), shallowEqual)
  const { denoms_data } = { ...denoms }
  const { env_data } = { ...env }

  return (
    <Widget
      title={<span className="text-lg font-medium">Voting Power</span>}
      className="dark:border-gray-900"
    >
      {data ?
        <div className="flex items-center sm:justify-center mt-5 mb-6">
          <div className="w-60 h-32 bg-gray-900 dark:bg-black rounded-lg flex items-center justify-center">
            <div className="flex flex-col text-center space-y-1">
              <span className="text-white text-2xl font-semibold">{numberFormat(data.voting_power || Math.floor(denomer.amount(data.tokens, denoms_data?.[0]?.id, denoms_data)), '0,0')}</span>
              {env_data?.staking_pool?.bonded_tokens && (
                <span className="text-gray-200 dark:text-gray-200 text-sm">(~ {numberFormat(Math.floor(denomer.amount(data.tokens, denoms_data?.[0]?.id, denoms_data)) * 100 / Math.floor(env_data.staking_pool.bonded_tokens), '0,0.00')}%)</span>
              )}
            </div>
          </div>
        </div>
        :
        <div className="flex items-center justify-center mt-5 mb-6">
          <div className="skeleton w-60 h-32 rounded-lg" />
        </div>
      }
      <div className={`grid grid-flow-row grid-cols-1 sm:grid-cols-2 text-base sm:text-sm lg:text-base gap-4 ${data ? '' : 'my-1.5'}`}>
        <div className={`flex flex-col space-y-${data ? 1 : 2}`}>
          <span className="font-semibold">Self Delegation Ratio</span>
          {data ?
            <span className="flex items-center text-gray-500 dark:text-gray-400 space-x-1.5">
              <span>{numberFormat(data.self_delegation * 100 / data.delegator_shares, '0,0.00')}%</span>
              <span className="text-gray-500 space-x-1">
                <span>(~</span>
                <span>{numberFormat(Math.floor(denomer.amount(data.self_delegation, denoms_data?.[0]?.id, denoms_data)), '0,0')}</span>
                <span className="uppercase">{env_data?.staking_params && denomer.symbol(env_data.staking_params.bond_denom, denoms_data)})</span>
              </span>
            </span>
            :
            <div className="skeleton w-28 h-6" />
          }
        </div>
        <div className={`flex flex-col space-y-${data ? 1 : 2}`}>
          <span className="font-semibold">Delegator Shares</span>
          {data ?
            <span className="text-gray-500 dark:text-gray-400">
              {numberFormat(denomer.amount(data.delegator_shares, denoms_data?.[0]?.id, denoms_data), '0,0')}
            </span>
            :
            <div className="skeleton w-20 h-6" />
          }
        </div>
        <div className={`flex flex-col space-y-${data ? 1 : 2}`}>
          <span className="font-semibold">Proposer Priority</span>
          {data ?
            <span className="text-gray-500 dark:text-gray-400">
              {!isNaN(data.proposer_priority) ? numberFormat(data.proposer_priority, '0,0') : '-'}
            </span>
            :
            <div className="skeleton w-20 h-6" />
          }
        </div>
        <div className={`flex flex-col space-y-${data ? 1 : 2}`}>
          <span className="font-semibold">Tokens</span>
          {data ?
            <span className="text-gray-500 dark:text-gray-400">
              {numberFormat(Math.floor(denomer.amount(data.tokens, denoms_data?.[0]?.id, denoms_data)), '0,0')}
            </span>
            :
            <div className="skeleton w-20 h-6" />
          }
        </div>
      </div>
    </Widget>
  )
}