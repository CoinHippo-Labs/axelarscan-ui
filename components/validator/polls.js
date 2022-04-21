import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import { Img } from 'react-image'
import { BsArrowRightShort } from 'react-icons/bs'
import { TiArrowRight } from 'react-icons/ti'
import { FaCheckCircle, FaTimesCircle, FaMinusCircle } from 'react-icons/fa'

import Widget from '../widget'
import Popover from '../popover'
import Copy from '../copy'

import { chain_manager } from '../../lib/object/chain'
import { numberFormat, ellipseAddress } from '../../lib/utils'

export default function Polls({ data, validator_data }) {
  const { chains } = useSelector(state => ({ chains: state.chains }), shallowEqual)
  const { chains_data } = { ...chains }

  return (
    <Widget
      title={<span className="text-sm sm:text-lg font-medium">Polls in the latest {numberFormat(process.env.NEXT_PUBLIC_NUM_EVM_VOTES_DISPLAY_BLOCKS, '0,0')} Blocks</span>}
      right={<span className="whitespace-nowrap text-xs sm:text-base text-gray-400 dark:text-gray-600 sm:mr-1 xl:mr-1.5">
        <span className="hidden sm:inline-flex mr-1">Maximum</span>
        <span>Display: {numberFormat(process.env.NEXT_PUBLIC_NUM_EVM_VOTES_DISPLAY_POLLS, '0,0')} Polls</span>
      </span>}
      className="dark:border-gray-900"
    >
      <div className="flex flex-wrap items-center my-1 -ml-0.5">
        {(data?.all_data || [...Array(Number(process.env.NEXT_PUBLIC_NUM_EVM_VOTES_DISPLAY_POLLS)).keys()].map(i => { return { i, skeleton: true } })
        ).map((poll, i) => {
          const chain = chains_data?.find(c => c?.id === poll.sender_chain)
          const vote = data?.data?.find(v => v?.poll_id === poll.poll_id)
          const evm_tx = vote?.transaction_id || _.head(poll.poll_id?.split('_') || [])
          const tx = vote?.txhash

          return !poll.skeleton ?
            <Popover
              key={i}
              placement="top"
              title={<div className="flex items-center justify-between space-x-2">
                <span className="font-bold">Block: {numberFormat(poll.height, '0,0')}</span>
                <Link href={`/block/${poll.height}`}>
                  <a className="flex items-center text-blue-600 dark:text-white ml-auto">
                    <span className="text-xs">Go to Block</span>
                    <BsArrowRightShort size={16} />
                  </a>
                </Link>
              </div>}
              content={<div className="flex flex-col space-y-2 my-1.5">
                <div className="flex items-center">
                  <span className="font-semibold mr-1.5">Chain:</span>
                  <span className="min-w-max max-w-min bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center text-gray-800 dark:text-gray-200 text-xs font-semibold space-x-1 px-2 py-1">
                    {chain_manager.image(poll.sender_chain, chains_data) && (
                      <img
                        alt=""
                        src={chain_manager.image(poll.sender_chain, chains_data)}
                        className="w-4 h-4 rounded-full"
                      />
                    )}
                    <span className="whitespace-nowrap">{chain_manager.title(poll.sender_chain, chains_data)}</span>
                  </span>
                  <span className="ml-auto" />
                  {chain?.explorer?.url && evm_tx && (
                    <a
                      href={`${chain.explorer.url}${chain.explorer.transaction_path?.replace('{tx}', evm_tx)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 dark:text-white space-x-1"
                    >
                      <span className="text-xs font-semibold">View TX</span>
                      {chain.explorer.icon ?
                        <Img
                          src={chain.explorer.icon}
                          alt=""
                          className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                        />
                        :
                        <TiArrowRight size={16} className="transform -rotate-45" />
                      }
                    </a>
                  )}
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold">Poll ID:</span>
                  <Copy
                    text={poll.poll_id}
                    copyTitle={<span className="text-gray-500 text-xs">
                      {ellipseAddress(poll.poll_id, 20)}
                    </span>}
                  />
                  <Link href={`/evm-votes?poll_id=${poll.poll_id}`}>
                    <a className="text-blue-600 dark:text-white">
                      <TiArrowRight size={16} className="transform -rotate-45" />
                    </a>
                  </Link>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold">Created at:</span>
                  <span className="text-gray-500 text-xs font-medium">
                    {moment(poll.created_at).format('MMM D, YYYY h:mm:ss A')}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold mr-1.5">Vote:</span>
                  {vote?.confirmed ?
                    <span className="flex items-center text-green-600 dark:text-green-400 space-x-1">
                      <FaCheckCircle size={16} />
                      <span className="font-semibold">Yes</span>
                    </span>
                    :
                    vote && !vote.confirmed ?
                      <span className="flex items-center text-red-600 dark:text-red-400 space-x-1">
                        <FaTimesCircle size={16} />
                        <span className="font-semibold">No</span>
                      </span>
                      :
                      <span className="flex items-center text-gray-400 dark:text-gray-500 space-x-1">
                        <FaMinusCircle size={16} />
                        <span className="font-semibold">Unsubmitted</span>
                      </span>
                  }
                  {tx && (
                    <a
                      href={`/tx/${tx}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 dark:text-white space-x-1 ml-auto"
                    >
                      <span className="text-xs font-semibold">View Vote TX</span>
                      <TiArrowRight size={16} className="transform -rotate-45" />
                    </a>
                  )}
                </div>
              </div>}
              className="w-7 h-7"
            >
              <div
                title={numberFormat(poll.height, '0,0')}
                className={`w-6 md:w-6 h-6 md:h-6 ${vote?.confirmed ? 'bg-green-600 dark:bg-green-700' : vote && !vote.confirmed ? 'bg-red-600 dark:bg-red-700' : 'bg-gray-400 dark:bg-gray-700'} rounded m-1`}
              />
            </Popover>
            :
            <div key={i} className="w-7 h-7">
              <div className={`skeleton w-6 md:w-6 h-6 md:h-6 rounded m-0.5`} />
            </div>
        })}
      </div>
    </Widget>
  )
}