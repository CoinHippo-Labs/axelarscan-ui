import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { ThreeDots } from 'react-loader-spinner'
import { HiArrowSmRight } from 'react-icons/hi'

import Image from '../image'
import { getChain } from '../../lib/object/chain'
import { number_format, _total_time_string, loader_color } from '../../lib/utils'

export default ({ data }) => {
  const { preferences, evm_chains, cosmos_chains } = useSelector(state => ({ preferences: state.preferences, evm_chains: state.evm_chains, cosmos_chains: state.cosmos_chains }), shallowEqual)
  const { theme } = { ...preferences }
  const { evm_chains_data } = { ...evm_chains }
  const { cosmos_chains_data } = { ...cosmos_chains }

  const {
    called,
    executed,
    error,
    methods,
    chain_pairs,
    avg_time_spent_approve,
    avg_time_spent_execute,
    avg_time_spent_total,
  } = { ...data }
  const chains_data = _.concat(evm_chains_data, cosmos_chains_data)
  const metricClassName = 'bg-white dark:bg-black border dark:border-slate-400 shadow dark:shadow-slate-200 rounded-lg space-y-1 p-4'

  return (
    data ?
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className={`${metricClassName}`}>
          <span className="text-slate-500 dark:text-slate-300 text-sm font-semibold">
            Messages
          </span>
          {called > 0 && (
            <div className="flex items-center justify-between space-x-2">
              <div className="text-slate-400 dark:text-slate-200 font-medium">
                Wait for Approval
              </div>
              <div className="text-base font-bold">
                {number_format(called, '0,0')}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between space-x-2">
            <div className="text-slate-400 dark:text-slate-200 font-medium">
              Error Execution
            </div>
            <div className="text-base font-bold">
              {number_format(error, '0,0')}
            </div>
          </div>
          <div className="flex items-center justify-between space-x-2">
            <div className="text-slate-400 dark:text-slate-200 font-medium">
              Executed
            </div>
            <div className="text-base font-bold">
              {number_format(executed, '0,0')}
            </div>
          </div>
        </div>
        <div className={`${metricClassName}`}>
          <span className="text-slate-500 dark:text-slate-300 text-sm font-semibold">
            Methods
          </span>
          {methods?.map((m, i) => (
            <div
              key={i}
              className="flex items-center justify-between space-x-2"
            >
              <div className="text-slate-400 dark:text-slate-200 font-medium">
                {m?.method}
              </div>
              <div className="text-base font-bold">
                {number_format(m?.count, '0,0')}
              </div>
            </div>
          ))}
        </div>
        <div className={`${metricClassName}`}>
          <span className="text-slate-500 dark:text-slate-300 text-sm font-semibold">
            Chain Pairs
          </span>
          {_.slice(chain_pairs || [], 0, 3).map((p, i) => {
            const {
              source_chain,
              destination_chain,
              num_txs,
            } = { ...p }
            const source_chain_data = getChain(source_chain, chains_data)
            const destination_chain_data = getChain(destination_chain, chains_data)
            return (
              <div
                key={i}
                className="flex items-center justify-between space-x-2"
              >
                <div className="flex items-center space-x-2">
                  <Image
                    src={source_chain_data?.image}
                    className="w-5 h-5 rounded-full"
                  />
                  <HiArrowSmRight size={20} />
                  <Image
                    src={destination_chain_data?.image}
                    className="w-5 h-5 rounded-full"
                  />
                </div>
                <div className="text-base font-bold">
                  {number_format(num_txs, '0,0')}
                </div>
              </div>
            )
          })}
        </div>
        <div className={`${metricClassName}`}>
          <div className="flex items-center justify-between space-x-2">
            <span className="text-slate-500 dark:text-slate-300 text-sm font-semibold">
              Avg. Time Spent
            </span>
          </div>
          {avg_time_spent_approve?.value > 0 && (
            <div className="flex items-center justify-between space-x-2">
              <div className="text-slate-400 dark:text-slate-200 font-medium">
                Approve
              </div>
              <div className="text-base font-bold">
                {_total_time_string(avg_time_spent_approve.value)}
              </div>
            </div>
          )}
          {avg_time_spent_execute?.value > 0 && (
            <div className="flex items-center justify-between space-x-2">
              <div className="text-slate-400 dark:text-slate-200 font-medium">
                Execute
              </div>
              <div className="text-base font-bold">
                {_total_time_string(avg_time_spent_execute.value)}
              </div>
            </div>
          )}
          {avg_time_spent_total?.value > 0 && (
            <div className="flex items-center justify-between space-x-2">
              <div className="text-slate-400 dark:text-slate-200 font-medium">
                Total
              </div>
              <div className="text-base font-bold">
                {_total_time_string(avg_time_spent_total.value)}
              </div>
            </div>
          )}
        </div>
      </div>
      :
      <ThreeDots color={loader_color(theme)} width="32" height="32" />
  )
}