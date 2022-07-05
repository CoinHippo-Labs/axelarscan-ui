import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { TailSpin, Puff, FallingLines } from 'react-loader-spinner'
import { BiCheckCircle, BiXCircle } from 'react-icons/bi'
import { FiCircle } from 'react-icons/fi'
import { MdChevronLeft, MdChevronRight } from 'react-icons/md'
import { TiArrowRight } from 'react-icons/ti'

import EnsProfile from '../ens-profile'
import Image from '../image'
import Copy from '../copy'
import { transactions_by_events, transaction as getTransaction } from '../../lib/api/cosmos'
import { transfers as getTransfers } from '../../lib/api/index'
import { transfers_status as getTransfersStatus } from '../../lib/api/transfer'
import { getChain } from '../../lib/object/chain'
import { getDenom } from '../../lib/object/denom'
import { type } from '../../lib/object/id'
import { number_format, name, ellipse, equals_ignore_case, loader_color, sleep } from '../../lib/utils'

export default () => {
  const { preferences, evm_chains, cosmos_chains, assets } = useSelector(state => ({ preferences: state.preferences, evm_chains: state.evm_chains, cosmos_chains: state.cosmos_chains, assets: state.assets }), shallowEqual)
  const { theme } = { ...preferences }
  const { evm_chains_data } = { ...evm_chains }
  const { cosmos_chains_data } = { ...cosmos_chains }
  const { assets_data } = { ...assets }

  const router = useRouter()
  const { query } = { ...router }
  const { tx } = { ...query }

  const [transfer, setTransfer] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (tx && assets_data) {
        if (!controller.signal.aborted) {
          const response = await getTransfers({
            query: {
              match: { 'source.id': tx },
            },
            size: 1,
          })
          if (response) {
            let data = response.data?.[0]
            const { source, link, confirm_deposit, vote, sign_batch } = { ...data }
            const { sender_chain, recipient_chain, recipient_address, amount, value } = { ...source }
            if ((!link?.recipient_address || !confirm_deposit || (!sign_batch?.executed && evm_chains_data?.findIndex(c => equals_ignore_case(c?.id, recipient_chain)) > -1)) && (recipient_address?.length >= 65 || type(recipient_address) === 'evm_address')) {
              let _response
              if (recipient_address) {
                if (type(recipient_address) === 'account') {
                  _response = await transactions_by_events(`transfer.sender='${recipient_address}'`, _response?.data, true, assets_data)
                  _response = await transactions_by_events(`message.sender='${recipient_address}'`, _response?.data, true, assets_data)
                }
                _response = await transactions_by_events(`link.depositAddress='${recipient_address}'`, _response?.data, true, assets_data)
                _response = await transactions_by_events(`transfer.recipient='${recipient_address}'`, _response?.data, true, assets_data)
              }
              if ((!link?.recipient_address || (!sign_batch?.executed && evm_chains_data?.findIndex(c => equals_ignore_case(c?.id, recipient_chain)) > -1)) && confirm_deposit?.id) {
                _response = {
                  ..._response,
                  data: _.uniqBy(_.concat(_response?.data || [], [{ txhash: confirm_deposit.id }], 'txhash'))
                }
              }
              if (!sign_batch?.executed && evm_chains_data?.findIndex(c => equals_ignore_case(c?.id, recipient_chain)) > -1 && vote?.id) {
                _response = {
                  ..._response,
                  data: _.uniqBy(_.concat(_response?.data || [], [{ txhash: vote.id }], 'txhash'))
                }
              }
              if (_response?.data?.length > 0) {
                _response.data.forEach(d => getTransaction(d?.txhash))
                await sleep(2 * 1000)
                _response = await getTransfers({
                  query: {
                    match: { 'source.id': tx },
                  },
                  size: 1,
                })
                data = _response.data?.[0] || data
              }
            }
            if (!(recipient_chain && typeof amount === 'number' && value)) {
              await getTransfersStatus({
                txHash: tx,
                sourceChain: sender_chain,
              })
            }
            setTransfer({
              data,
              tx,
            })
          }
        }
      }
    }
    getData()
    const interval = setInterval(() => getData(), 0.5 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [tx, assets_data])

  const chains_data = _.concat(evm_chains_data, cosmos_chains_data)
  const { data } = { ...transfer }
  const { source, confirm_deposit, vote, sign_batch, ibc_send, link } = { ...data }
  const { sender_chain, recipient_chain, sender_address, amount, denom, fee, insufficient_fee } = { ...source }
  const { original_sender_chain, original_recipient_chain } = { ...link }
  const { recipient_address } = { ...link }
  const source_chain_data = getChain(original_sender_chain, chains_data) || getChain(sender_chain, chains_data)
  const destination_chain_data = getChain(original_recipient_chain, chains_data) || getChain(recipient_chain, chains_data)
  const axelar_chain_data = getChain('axelarnet', chains_data)
  const deposit_address = link?.deposit_address || source?.recipient_address
  const deposit_chain_data = getChain(deposit_address?.startsWith(process.env.NEXT_PUBLIC_PREFIX_ACCOUNT) ? 'axelarnet' : original_sender_chain || sender_chain, chains_data)
  const asset_data = getDenom(denom, assets_data)
  const contract_data = asset_data?.contracts?.find(c => c?.chain_id === source_chain_data?.chain_id)
  const ibc_data = asset_data?.ibc?.find(c => c?.chain_id === source_chain_data?.id)
  const symbol = contract_data?.symbol || ibc_data?.symbol || asset_data?.symbol || denom
  const asset_image = contract_data?.image || ibc_data?.image || asset_data?.image
  const steps = [{
    id: 'source',
    title: 'Send Asset',
    chain_data: source_chain_data,
    data: source,
    id_field: 'id',
  }, {
    id: 'confirm_deposit',
    title: 'Confirm Deposit',
    chain_data: axelar_chain_data,
    data: confirm_deposit,
    id_field: 'id',
  }, evm_chains_data?.findIndex(c => c?.id === source_chain_data?.id) > -1 && {
    id: 'vote',
    title: 'Vote Confirm',
    chain_data: axelar_chain_data,
    data: vote,
    id_field: 'id',
  }, evm_chains_data?.findIndex(c => c?.id === destination_chain_data?.id) > -1 && {
    id: 'sign_batch',
    title: 'Sign Batch',
    chain_data: axelar_chain_data,
    data: sign_batch,
    id_field: 'batch_id',
    path: '/batch/{chain}/{id}',
    params: {
      chain: destination_chain_data?.id,
    },
  }, evm_chains_data?.findIndex(c => c?.id === destination_chain_data?.id) > -1 && {
    id: 'executed',
    title: 'Executed',
    chain_data: axelar_chain_data,
    data: sign_batch,
    id_field: 'batch_id',
    path: '/batch/{chain}/{id}',
    params: {
      chain: destination_chain_data?.id,
    },
  }, cosmos_chains_data?.findIndex(c => c?.id === destination_chain_data?.id || destination_chain_data?.overrides?.[c?.id]) > -1 && {
    id: 'ibc_send',
    title: 'IBC Transfer',
    chain_data: ibc_send?.recv_txhash ? destination_chain_data : axelar_chain_data,
    data: ibc_send,
    id_field: ibc_send?.recv_txhash ? 'recv_txhash' : ibc_send?.recv_txhash ? 'ack_txhash' : 'id',
  }].filter(s => s).map((s, i) => {
    return {
      ...s,
      i,
      finish: !!(s.id === 'executed' ? s.data?.executed : s.data),
    }
  })
  const current_step = (_.maxBy(steps.filter(s => s.finish), 'i')?.i || 0) + 1
  const detail_steps = _.slice(steps, 0, steps.length - (_.last(steps)?.id === 'executed' ? 1 : 0))
  const stepClassName = 'min-h-full bg-white dark:bg-slate-900 rounded-lg space-y-2 py-4 px-5'
  const titleClassName = 'whitespace-nowrap uppercase text-lg font-bold'

  return (
    <div className="space-y-4 mt-2 mb-6 mx-auto">
      {tx && equals_ignore_case(transfer?.tx, tx) ?
        <div className="grid sm:grid-cols-6 gap-6">
          <div className={`${stepClassName} sm:col-span-6`}>
            <div className={`${titleClassName}`}>
              Transfer
            </div>
            {data ?
              <div className="overflow-x-auto flex flex-col sm:flex-row justify-between space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="flex flex-col space-y-2">
                  <div className="max-w-min bg-slate-50 dark:bg-slate-800 rounded-xl text-base font-semibold py-0.5 px-2">
                    Source
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {source_chain_data?.image && (
                      <Image
                        src={source_chain_data.image}
                        className="w-8 sm:w-6 lg:w-8 h-8 sm:h-6 lg:h-8 rounded-full"
                      />
                    )}
                    <span className="text-base sm:text-sm lg:text-base font-bold">
                      {source_chain_data?.name || sender_chain}
                    </span>
                  </div>
                  {sender_address && (
                    <div className="flex flex-col">
                      <span className="text-slate-400 dark:text-slate-600 font-semibold">
                        Sender address
                      </span>
                      <div className="flex items-center space-x-1">
                        <a
                          href={`${source_chain_data?.explorer?.url}${source_chain_data?.explorer?.address_path?.replace('{address}', sender_address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-white"
                        >
                          <EnsProfile
                            address={sender_address}
                            no_copy={true}
                            fallback={(
                              <div className="h-6 flex items-center text-blue-600 dark:text-white font-bold">
                                <span className="xl:hidden">
                                  {ellipse(sender_address, 8, source_chain_data?.prefix_address)}
                                </span>
                                <span className="hidden xl:block">
                                  {ellipse(sender_address, 12, source_chain_data?.prefix_address)}
                                </span>
                              </div>
                            )}
                          />
                        </a>
                        <Copy
                          value={sender_address}
                          size={18}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="lg:min-h-full sm:hidden lg:flex items-center">
                  <MdChevronLeft size={36} className="transform rotate-90 sm:rotate-0" />
                </div>
                <div className="flex flex-col space-y-1">
                  <div className="max-w-min bg-slate-50 dark:bg-slate-800 rounded-xl text-base font-semibold py-0.5 px-2">
                    Asset
                  </div>
                  {amount && asset_data && (
                    <div className="min-w-max max-w-min bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center sm:justify-end space-x-1.5 py-1 px-2.5">
                      {asset_image && (
                        <Image
                          src={asset_image}
                          className="w-6 sm:w-5 lg:w-6 h-6 sm:h-5 lg:h-6 rounded-full"
                        />
                      )}
                      <span className="text-base sm:text-sm lg:text-base font-semibold">
                        <span className="mr-1">
                          {number_format(amount, '0,0.000', true)}
                        </span>
                        <span>
                          {ellipse(symbol)}
                        </span>
                      </span>
                      {fee && (
                        <span className="text-xs lg:text-sm font-semibold">
                          (<span className="mr-1">
                            Fee:
                          </span>
                          <span>
                            {number_format(fee, '0,0.000', true)}
                          </span>)
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-slate-400 dark:text-slate-600 font-semibold">
                      Deposit address
                    </span>
                    {deposit_address && (
                      <div className="flex items-center space-x-1">
                        <a
                          href={`${deposit_chain_data?.explorer?.url}${deposit_chain_data?.explorer?.address_path?.replace('{address}', deposit_address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-white"
                        >
                          <EnsProfile
                            address={deposit_address}
                            no_copy={true}
                            fallback={(
                              <div className="h-6 flex items-center text-blue-600 dark:text-white font-bold">
                                <span className="xl:hidden">
                                  {ellipse(deposit_address, 8, deposit_chain_data?.prefix_address)}
                                </span>
                                <span className="hidden xl:block">
                                  {ellipse(deposit_address, 12, deposit_chain_data?.prefix_address)}
                                </span>
                              </div>
                            )}
                          />
                        </a>
                        <Copy
                          value={deposit_address}
                          size={18}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="lg:min-h-full sm:hidden lg:flex items-center">
                  <MdChevronRight size={36} className="transform rotate-90 sm:rotate-0" />
                </div>
                <div className="flex flex-col space-y-2">
                  <div className="max-w-min bg-slate-50 dark:bg-slate-800 rounded-xl text-base font-semibold py-0.5 px-2">
                    Destination
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {destination_chain_data?.image && (
                      <Image
                        src={destination_chain_data.image}
                        className="w-8 sm:w-6 lg:w-8 h-8 sm:h-6 lg:h-8 rounded-full"
                      />
                    )}
                    <span className="text-base sm:text-sm lg:text-base font-bold">
                      {destination_chain_data?.name || recipient_chain}
                    </span>
                  </div>
                  {recipient_address && (
                    <div className="flex flex-col">
                      <span className="text-slate-400 dark:text-slate-600 font-semibold">
                        Recipient address
                      </span>
                      <div className="flex items-center space-x-1">
                        <a
                          href={`${destination_chain_data?.explorer?.url}${destination_chain_data?.explorer?.address_path?.replace('{address}', recipient_address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-white"
                        >
                          <EnsProfile
                            address={recipient_address}
                            no_copy={true}
                            fallback={(
                              <div className="h-6 flex items-center text-blue-600 dark:text-white font-bold">
                                <span className="xl:hidden">
                                  {ellipse(recipient_address, 8, destination_chain_data?.prefix_address)}
                                </span>
                                <span className="hidden xl:block">
                                  {ellipse(recipient_address, 12, destination_chain_data?.prefix_address)}
                                </span>
                              </div>
                            )}
                          />
                        </a>
                        <Copy
                          value={recipient_address}
                          size={18}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="min-w-max flex flex-col space-y-1">
                  <div className="max-w-min bg-slate-50 dark:bg-slate-800 rounded-xl text-base font-semibold py-0.5 px-2">
                    Status
                  </div>
                  {steps.map((s, i) => {
                    const text_color = s.finish ?
                      'text-green-500 dark:text-green-600' :
                      i === current_step ?
                        'text-blue-500 dark:text-white' :
                        'text-slate-400 dark:text-slate-600'
                    const { title, chain_data, data, id_field, path, params, finish } = { ...s }
                    const id = data?.[id_field]
                    const { explorer } = { ...chain_data }
                    const { url, transaction_path, icon } = { ...explorer }
                    let _path = path?.replace('{id}', id) || transaction_path?.replace('{tx}', id)
                    Object.entries({ ...params }).forEach(([k, v]) => {
                      _path = _path?.replace(`{${k}}`, v)
                    })
                    return (
                      <div
                        key={i}
                        className="flex items-center space-x-1.5 pb-0.5"
                      >
                        {finish ?
                          <BiCheckCircle size={20} className="text-green-500 dark:text-green-600" /> :
                          i === current_step ?
                            <Puff color={loader_color(theme)} width="20" height="20" /> :
                            <FiCircle size={20} className="text-slate-400 dark:text-slate-600" />
                        }
                        <div className="flex items-center space-x-1">
                          {id ?
                            <Copy
                              value={id}
                              title={<span className={`cursor-pointer uppercase ${text_color} text-xs font-bold`}>
                                {title}
                              </span>}
                              size={18}
                            />
                            :
                            <span className={`uppercase ${text_color} text-xs font-medium`}>
                              {title}
                            </span>
                          }
                          {id && url && (
                            <a
                              href={`${url}${_path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-white"
                            >
                              {icon ?
                                <Image
                                  src={icon}
                                  className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                />
                                :
                                <TiArrowRight size={16} className="transform -rotate-45" />
                              }
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {insufficient_fee && (
                    <div className="max-w-min bg-red-100 dark:bg-red-700 border border-red-500 dark:border-red-600 rounded-lg whitespace-nowrap font-semibold py-0.5 px-2">
                      Insufficient Fee
                    </div>
                  )}
                </div>
              </div>
              :
              <span className="text-slate-400 dark:text-slate-200 text-base font-semibold">
                Data not found
              </span>
            }
          </div>
          {data && detail_steps.map((s, i) => {
            const { title, chain_data, data, id_field, path, params, finish } = { ...s }
            const { height, type, status, executed, transfer_id, command_id, created_at } = { ...data }
            const _id = data?.[id_field]
            const { explorer } = { ...chain_data }
            const { url, transaction_path, block_path, icon } = { ...explorer }
            let _path = path?.replace('{id}', _id) || transaction_path?.replace('{tx}', _id)
            Object.entries({ ...params }).forEach(([k, v]) => {
              _path = _path?.replace(`{${k}}`, v)
            })
            const { id, ack_txhash, recv_txhash } = { ...data }
            const rowClassName = 'flex flex-col space-y-1'
            const rowTitleClassName = `text-black dark:text-slate-300 text-sm lg:text-base font-bold`
            return (
              <div
                key={i}
                className={`${stepClassName} sm:col-span-3 lg:col-span-2`}
              >
                <div className={`${titleClassName}`}>
                  {title}
                </div>
                <div className="flex flex-col space-y-3">
                  {s.id === 'ibc_send' && _id ?
                    [id, recv_txhash, ack_txhash].filter(tx => tx).map((tx, j) => {
                      const _chain_data = tx === recv_txhash ? destination_chain_data : axelar_chain_data
                      const _explorer = _chain_data?.explorer
                      return (
                        <div
                          key={j}
                          className={rowClassName}
                        >
                          <span className={rowTitleClassName}>
                            {tx === ack_txhash ? 'Acknowledge' : tx === recv_txhash ? 'Receive' : 'Send'}:
                          </span>
                          <div className="flex items-center space-x-1">
                            <a
                              href={`${_explorer?.url}${_explorer?.transaction_path?.replace('{tx}', tx)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-white"
                            >
                              <div className="font-bold">
                                <span className="xl:hidden">
                                  {ellipse(tx, 12)}
                                </span>
                                <span className="hidden xl:block">
                                  {ellipse(tx, 16)}
                                </span>
                              </div>
                            </a>
                            <Copy
                              value={tx}
                              size={18}
                            />
                            <a
                              href={`${_explorer?.url}${_explorer?.transaction_path?.replace('{tx}', tx)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-white"
                            >
                              {_explorer?.icon ?
                                <Image
                                  src={_explorer.icon}
                                  className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                />
                                :
                                <TiArrowRight size={16} className="transform -rotate-45" />
                              }
                            </a>
                          </div>
                        </div>
                      )
                    })
                    :
                    _id ?
                      <div className={rowClassName}>
                        <span className={rowTitleClassName}>
                          {s.id === 'sign_batch' ? 'Batch' : 'Transaction'}:
                        </span>
                        <div className="flex items-center space-x-1">
                          <a
                            href={`${url}${_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-white"
                          >
                            <div className="font-bold">
                              <span className="xl:hidden">
                                {ellipse(_id, 12)}
                              </span>
                              <span className="hidden xl:block">
                                {ellipse(_id, 16)}
                              </span>
                            </div>
                          </a>
                          <Copy
                            value={_id}
                            size={18}
                          />
                          <a
                            href={`${url}${_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-white"
                          >
                            {icon ?
                              <Image
                                src={icon}
                                className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                              />
                              :
                              <TiArrowRight size={16} className="transform -rotate-45" />
                            }
                          </a>
                        </div>
                      </div>
                      :
                      <FallingLines color={loader_color(theme)} width="32" height="32" />
                  }
                  {height && (
                    <div className={rowClassName}>
                      <span className={rowTitleClassName}>
                        Block:
                      </span>
                      <div className="flex items-center space-x-1">
                        <a
                          href={`${url}${block_path?.replace('{block}', height)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-white font-bold"
                        >
                          {number_format(height, '0,0')}
                        </a>
                      </div>
                    </div>
                  )}
                  {type && (
                    <div className={rowClassName}>
                      <span className={rowTitleClassName}>
                        Type:
                      </span>
                      <div className="min-w-max max-w-min bg-slate-100 dark:bg-slate-800 rounded-lg capitalize text-sm lg:text-base font-semibold py-0.5 px-2">
                        {name(type)}
                      </div>
                    </div>
                  )}
                  {(status || executed) && (
                    <div className={rowClassName}>
                      <span className={rowTitleClassName}>
                        Status:
                      </span>
                      <div className={`${status === 'success' || executed ? 'text-green-500 dark:text-green-600' : 'text-red-500 dark:text-red-600'} uppercase flex items-center text-sm lg:text-base font-bold space-x-1`}>
                        {status === 'success' || executed ?
                          <BiCheckCircle size={20} /> :
                          <BiXCircle size={20} />
                        }
                        <span>
                          {executed ?
                            'Executed' : status
                        }
                        </span>
                      </div>
                    </div>
                  )}
                  {created_at?.ms && (
                    <div className={rowClassName}>
                      <span className={rowTitleClassName}>
                        Time:
                      </span>
                      <span className="text-slate-400 dark:text-slate-600 font-medium">
                        {moment(created_at.ms).fromNow()} ({moment(created_at.ms).format('MMM D, YYYY h:mm:ss A')})
                      </span>
                    </div>
                  )}
                  {transfer_id && (
                    <div className={rowClassName}>
                      <span className={rowTitleClassName}>
                        Transfer ID:
                      </span>
                      <Copy
                        value={transfer_id}
                        title={<span className="cursor-pointer break-all text-black dark:text-white text-sm lg:text-base font-semibold">
                          {transfer_id}
                        </span>}
                        size={20}
                      />
                    </div>
                  )}
                  {command_id && (
                    <div className={rowClassName}>
                      <span className={rowTitleClassName}>
                        Command ID:
                      </span>
                      <Copy
                        value={command_id}
                        title={<span className="cursor-pointer break-all text-black dark:text-white text-sm lg:text-base font-semibold">
                          {ellipse(command_id, 16)}
                        </span>}
                        size={20}
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        :
        <TailSpin color={loader_color(theme)} width="32" height="32" />
      }
    </div>
  )
}