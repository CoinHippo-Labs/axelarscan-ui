import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { BiCheckCircle, BiXCircle } from 'react-icons/bi'

import Popover from '../popover'
import Image from '../image'
import Copy from '../copy'
import { chain_manager } from '../../lib/object/chain'
import { number_format, ellipse, equals_ignore_case } from '../../lib/utils'

const num_evm_votes_polls = Number(process.env.NEXT_PUBLIC_NUM_EVM_VOTES_DISPLAY_POLLS)

export default ({ data }) => {
  const { evm_chains } = useSelector(state => ({ evm_chains: state.evm_chains }), shallowEqual)
  const { evm_chains_data } = { ...evm_chains }

  return (
    <div className="flex flex-wrap items-center my-1 -ml-0.5">
      {(data?.polls || [...Array(num_evm_votes_polls).keys()].map(i => { return { skeleton: true } })).map((p, i) => {
        const { id, height, sender_chain } = { ...p }
        const chain_data = evm_chains_data?.find(c => equals_ignore_case(c?.id, sender_chain))
        const v = data?.votes?.find(v => equals_ignore_case(v?.poll_id, id))
        const { txhash, vote, late } = { ...v }
        let { transaction_id } = { ...v }
        transaction_id = transaction_id || _.head(id?.split('_') || [])
        return !p?.skeleton ?
          <Popover
            key={i}
            placement="top"
            title={<div className="flex items-center space-x-1.5">
              <span className="normal-case text-base font-semibold">Block:</span>
              {height && (
                <Link href={`/block/${height}`}>
                  <a
                    target="_blank"
                    rel="noopenner noreferrer"
                    className="text-base text-blue-600 dark:text-white font-bold"
                  >
                    {number_format(height, '0,0')}
                  </a>
                </Link>
              )}
            </div>}
            content={<div className="flex flex-col space-y-1.5 my-1">
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-400 dark:text-slate-600 text-xs font-semibold">
                  Chain:
                </span>
                {chain_manager.image(sender_chain, evm_chains_data) && (
                  <Image
                    src={chain_manager.image(sender_chain, evm_chains_data)}
                    title={chain_manager.name(sender_chain, evm_chains_data)}
                    className="w-4 h-4 rounded-full"
                  />
                )}
              </div>
              {id && (
                <div className="flex flex-col">
                   <span className="text-slate-400 dark:text-slate-600 text-xs font-semibold">
                    Poll ID:
                  </span>
                  <div className="flex items-center space-x-1">
                    <Link href={`/evm-votes?pollId=${id}`}>
                      <a
                        target="_blank"
                        rel="noopenner noreferrer"
                        className="text-blue-600 dark:text-white font-semibold"
                      >
                        {ellipse(id, 8)}
                      </a>
                    </Link>
                    <Copy
                      value={id}
                      size={18}
                    />
                  </div>
                </div>
              )}
              {transaction_id && (
                <div className="flex flex-col">
                  <span className="text-slate-400 dark:text-slate-600 text-xs font-semibold">
                    EVM transaction:
                  </span>
                  <div className="flex items-center space-x-1">
                    <a
                      href={`${chain_data?.explorer?.url}${chain_data?.explorer?.transaction_path?.replace('{tx}', transaction_id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-white font-semibold"
                    >
                      {ellipse(transaction_id, 8)}
                    </a>
                    <Copy
                      value={transaction_id}
                      size={18}
                    />
                  </div>
                </div>
              )}
              <div className="flex flex-col">
                <div className="flex items-center space-x-1">
                  <span className="text-slate-400 dark:text-slate-600 text-xs font-semibold">
                    Vote:
                  </span>
                  <div className={`flex items-center ${vote ? 'text-green-500 dark:text-green-600' : v ? 'text-red-500 dark:text-red-600' : 'text-slate-400 dark:text-slate-600'} space-x-0.5`}>
                    {vote ?
                      <BiCheckCircle size={18} /> :
                      <BiXCircle size={18} />
                    }
                    <span className="uppercase text-xs font-bold">
                      {vote ?
                        'yes' : v ? 'no' : 'unsubmitted'
                      }
                    </span>
                  </div>
                </div>
                {txhash && (
                  <div className="flex items-center space-x-1">
                    <Link href={`/tx/${txhash}`}>
                      <a
                        target="_blank"
                        rel="noopenner noreferrer"
                        className="text-blue-600 dark:text-white font-semibold"
                      >
                        {ellipse(txhash, 6)}
                      </a>
                    </Link>
                    <Copy
                      value={txhash}
                      size={18}
                    />
                  </div>
                )}
              </div>
            </div>}
            className="w-7 h-7"
          >
            <Link href={`/evm-votes?pollId=${id}`}>
              <a
                target="_blank"
                rel="noopenner noreferrer"
              >
                <div
                  title={number_format(height, '0,0')}
                  className={`w-6 h-6 ${vote ? late ? 'bg-yellow-400 dark:bg-yellow-600' : 'bg-green-500 dark:bg-green-600' : v && !vote ? 'bg-red-500 dark:bg-red-600' : 'bg-slate-400 dark:bg-slate-600'} rounded m-1`}
                />
              </a>
            </Link>
          </Popover>
          :
          <div
            key={i}
            className="w-7 h-7"
          >
            <div className="skeleton w-6 h-6 rounded m-0.5" />
          </div>
      })}
    </div>
  )
}