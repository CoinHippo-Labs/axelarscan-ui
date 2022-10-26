import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { utils } from 'ethers'
import { ProgressBar as ProgressBarSpinner, ColorRing } from 'react-loader-spinner'
import { BiCheckCircle, BiXCircle } from 'react-icons/bi'
import { FiCircle } from 'react-icons/fi'
import { MdChevronRight } from 'react-icons/md'
import { TiArrowRight } from 'react-icons/ti'

import EnsProfile from '../ens-profile'
import AccountProfile from '../account-profile'
import Image from '../image'
import Copy from '../copy'
import Popover from '../popover'
import { ProgressBar } from '../progress-bars'
import { transactions_by_events, getTransaction } from '../../lib/api/lcd'
import { transfers_status as getTransfersStatus, transfers as getTransfers } from '../../lib/api/transfer'
import { getChain } from '../../lib/object/chain'
import { getAsset } from '../../lib/object/asset'
import { type } from '../../lib/object/id'
import { number_format, name, ellipse, equals_ignore_case, total_time_string, loader_color, sleep } from '../../lib/utils'

export default () => {
  const { preferences, evm_chains, cosmos_chains, assets } = useSelector(state => ({ preferences: state.preferences, evm_chains: state.evm_chains, cosmos_chains: state.cosmos_chains, assets: state.assets }), shallowEqual)
  const { theme } = { ...preferences }
  const { evm_chains_data } = { ...evm_chains }
  const { cosmos_chains_data } = { ...cosmos_chains }
  const { assets_data } = { ...assets }

  const router = useRouter()
  const { query } = { ...router }
  const { tx, transfer_id } = { ...query }

  const [transfer, setTransfer] = useState(null)

  useEffect(() => {
    const getData = async () => {
      if (tx && assets_data) {
        const response = await getTransfers({
          txHash: tx,
          size: 1,
        })

        let data = _.head(response?.data)

        const {
          source,
          link,
          confirm_deposit,
          vote,
          sign_batch,
          ibc_send,
          axelar_transfer,
        } = { ...data }
        const {
          sender_chain,
          recipient_chain,
          amount,
          fee,
          value,
        } = { ...source }
        let {
          recipient_address,
        } = { ...source }

        recipient_address = link?.deposit_address ||
          recipient_address

        let _response

        if (
          (
            !link?.recipient_address ||
            !confirm_deposit ||
            (
              !sign_batch?.executed &&
              evm_chains_data?.findIndex(c => equals_ignore_case(c?.id, recipient_chain)) > -1
            )
          ) &&
          (
            recipient_address?.length >= 65 ||
            type(recipient_address) === 'evm_address'
          )
        ) {
          if (recipient_address) {
            if (type(recipient_address) === 'account') {
              _response = await transactions_by_events(
                `transfer.sender='${recipient_address}'`,
                _response?.data,
                true,
                assets_data,
              )

              _response = await transactions_by_events(
                `message.sender='${recipient_address}'`,
                _response?.data,
                true,
                assets_data,
              )
            }

            if (type(recipient_address) === 'evm_address') {
              recipient_address = utils.getAddress(recipient_address)
            }

            _response = await transactions_by_events(
              `link.depositAddress='${recipient_address}'`,
              _response?.data,
              true,
              assets_data,
            )

            _response = await transactions_by_events(
              `transfer.recipient='${recipient_address}'`,
              _response?.data,
              true,
              assets_data,
            )
          }

          if (
            (
              !link?.recipient_address ||
              (!sign_batch?.executed && evm_chains_data?.findIndex(c => equals_ignore_case(c?.id, recipient_chain)) > -1)
            ) &&
            confirm_deposit?.id
          ) {
            _response = {
              ..._response,
              data: _.uniqBy(
                _.concat(
                  _response?.data || [],
                  [{ txhash: confirm_deposit.id }],
                ),
                'txhash',
              )
            }
          }

          if (
            !sign_batch?.executed &&
            evm_chains_data?.findIndex(c => equals_ignore_case(c?.id, recipient_chain)) > -1 &&
            vote?.id
          ) {
            _response = {
              ..._response,
              data: _.uniqBy(
                _.concat(
                  _response?.data || [],
                  [{ txhash: vote.id }],
                ),
                'txhash',
              )
            }
          }

          if (_response?.data?.length > 0) {
            _response.data.forEach(d =>
              getTransaction(d?.txhash)
            )

            await sleep(2 * 1000)

            _response = await getTransfers({
              txHash: tx,
              size: 1,
            })

            data = _.head(_response.data) ||
              data
          }
        }

        if (
          !(
            recipient_chain &&
            typeof amount === 'number' &&
            typeof value === 'number' &&
            typeof fee === 'number'
          ) ||
          (
            !sign_batch?.executed &&
            evm_chains_data?.findIndex(c => equals_ignore_case(c?.id, recipient_chain)) > -1
          ) ||
          (
            !ibc_send?.recv_txhash &&
            recipient_chain !== 'axelarnet' &&
            cosmos_chains_data?.findIndex(c => equals_ignore_case(c?.id, recipient_chain)) > -1
          ) ||
          (
            recipient_chain === 'axelarnet' &&
            !axelar_transfer
          )
        ) {
          await getTransfersStatus({
            txHash: tx,
            sourceChain: sender_chain,
          })

          await sleep(2 * 1000)

          _response = await getTransfers({
            txHash: tx,
            size: 1,
          })

          data = _.head(_response.data) ||
            data
        }

        if (response || data) {
          setTransfer({
            data,
            tx,
          })
        }
      }
      else if (transfer_id) {
        const response = await getTransfers({
          transferId: transfer_id,
          size: 1,
        })

        const {
          source,
        } = { ..._.head(response?.data) }
        const {
          id,
        } = { ...source }

        if (id) {
          router.push(`/transfer/${id}`)
        }
      }
    }

    getData()

    const interval = setInterval(() =>
      getData(),
      0.5 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [tx, transfer_id, assets_data])

  const staging = process.env.NEXT_PUBLIC_SITE_URL?.includes('staging')

  const chains_data = _.concat(
    evm_chains_data,
    cosmos_chains_data,
  )
  const { data } = { ...transfer }
  const { source, confirm_deposit, vote, sign_batch, ibc_send, axelar_transfer, link } = { ...data }
  const { sender_chain, recipient_chain, sender_address, amount, denom, fee, insufficient_fee } = { ...source }
  const { original_sender_chain, original_recipient_chain } = { ...link }
  const { recipient_address } = { ...link }
  const source_chain_data = getChain(original_sender_chain, chains_data) || getChain(sender_chain, chains_data)
  const destination_chain_data = getChain(original_recipient_chain, chains_data) || getChain(recipient_chain, chains_data)
  const axelar_chain_data = getChain('axelarnet', chains_data)
  const deposit_address = link?.deposit_address || source?.recipient_address
  const deposit_chain_data = getChain(deposit_address?.startsWith(process.env.NEXT_PUBLIC_PREFIX_ACCOUNT) ? 'axelarnet' : original_sender_chain || sender_chain, chains_data)
  const asset_data = getAsset(denom, assets_data)
  const contract_data = asset_data?.contracts?.find(c => c?.chain_id === source_chain_data?.chain_id)
  const ibc_data = asset_data?.ibc?.find(c => c?.chain_id === source_chain_data?.id)
  const symbol = contract_data?.symbol || ibc_data?.symbol || asset_data?.symbol || denom
  const asset_image = contract_data?.image || ibc_data?.image || asset_data?.image
  const steps = [
    {
      id: 'source',
      title: staging ?
        'Deposited' :
        'Send Asset',
      chain_data: source_chain_data,
      data: source,
      id_field: 'id',
    },
    {
      id: 'confirm_deposit',
      title: staging ?
        'Confirmed' :
        'Confirm Deposit',
      chain_data: axelar_chain_data,
      data: confirm_deposit,
      id_field: 'id',
    },
    evm_chains_data?.findIndex(c => c?.id === source_chain_data?.id) > -1 &&
      {
        id: 'vote',
        title: staging ?
          'Approved' :
          'Vote Confirm',
        chain_data: axelar_chain_data,
        data: vote,
        id_field: 'id',
      },
    evm_chains_data?.findIndex(c => c?.id === destination_chain_data?.id) > -1 &&
      {
        id: 'sign_batch',
        title: staging ?
          'Signed' :
          'Sign Batch',
        chain_data: axelar_chain_data,
        data: sign_batch,
        id_field: 'batch_id',
        path: '/batch/{chain}/{id}',
        params: {
          chain: destination_chain_data?.id,
        },
      },
    evm_chains_data?.findIndex(c => c?.id === destination_chain_data?.id) > -1 &&
      {
        id: 'executed',
        title: staging ?
          'Received' :
          'Executed',
        ...(
          sign_batch?.transactionHash ?
            {
              chain_data: destination_chain_data,
              id_field: 'transactionHash',
            } :
            {
              chain_data: axelar_chain_data,
              id_field: 'batch_id',
              path: '/batch/{chain}/{id}',
              params: {
                chain: destination_chain_data?.id,
              },
            },
        ),
        data: sign_batch,
      },
    cosmos_chains_data?.filter(c => c?.id !== 'axelarnet').findIndex(c => c?.id === destination_chain_data?.id || destination_chain_data?.overrides?.[c?.id]) > -1 &&
      {
        id: 'ibc_send',
        title: staging ?
          'Received' :
          'IBC Transfer',
        chain_data: ibc_send?.recv_txhash ?
          destination_chain_data :
          axelar_chain_data,
        data: ibc_send,
        id_field: ibc_send?.ack_txhash ?
          'ack_txhash' :
          ibc_send?.failed_txhash ?
            'failed_txhash' :
            ibc_send?.recv_txhash ?
              'recv_txhash' :
              'id',
      },
    [axelar_chain_data].findIndex(c => c?.id === destination_chain_data?.id || destination_chain_data?.overrides?.[c?.id]) > -1 &&
      {
        id: 'axelar_transfer',
        title: staging ?
          'Received' :
          'Axelar Transfer',
        chain_data: axelar_chain_data,
        data: axelar_transfer,
        id_field: 'id',
      },
  ]
  .filter(s => s)
  .map((s, i) => {
    return {
      ...s,
      i,
      finish: !!(
        s.id === 'executed' ?
          s.data?.executed :
          s.id === 'ibc_send' ?
            s.data?.ack_txhash ||
            (
              s.data?.recv_txhash &&
              !s.data.failed_txhash
            ) :
            s.id === 'source' ?
              s.data?.status === 'success' :
              s.data
      ),
    }
  })
  const current_step = steps.findIndex(s => s.finish) < 0 ?
    -1 :
    (
      _.maxBy(
        steps.filter(s => s.finish),
        'i',
      )?.i ||
      0
    ) +
    (
      !insufficient_fee &&
      (
        amount > fee ||
        !fee
      ) &&
      (
        ibc_send?.ack_txhash ||
        !ibc_send?.failed_txhash
      ) ?
        1 :
        0
    )
  const detail_steps = _.slice(
    steps,
    0,
    current_step > -1 ?
      steps.length - (
        _.last(steps)?.id === 'executed' ?
          1 :
          0
      ) :
      1,
  )
  const time_spent = _.last(steps)?.finish &&
    total_time_string(
      _.head(steps)?.data?.created_at?.ms / 1000,
      _.last(steps)?.data?.block_timestamp ||
      (_.last(steps)?.data?.received_at?.ms / 1000) ||
      (_.last(steps)?.data?.created_at?.ms / 1000),
    )
  const stepClassName = 'min-h-full bg-white dark:bg-slate-900 rounded-lg space-y-2 py-4 px-5'
  const titleClassName = 'whitespace-nowrap uppercase text-lg font-bold'

  const step = _.last(steps.filter(s => s?.finish))
  const {
    title,
    chain_data,
    id_field,
    path,
    params,
    finish,
  } = { ...step }
  const id = step?.data?.[id_field]
  const {
    explorer,
  } = { ...chain_data }
  const {
    url,
    transaction_path,
    icon,
  } = { ...explorer }

  let _path = path?.replace('{id}', id) ||
    transaction_path?.replace('{tx}', id)

  Object.entries({ ...params })
    .forEach(([k, v]) => {
      _path = _path?.replace(`{${k}}`, v)
    })

  const text_color = finish ?
    'text-green-400 dark:text-green-300' :
    step?.data?.status === 'failed' ?
      'text-red-500 dark:text-red-600' :
      'text-slate-300 dark:text-slate-700'

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
                      {sender_address.startsWith('0x') ?
                        <div className="flex items-center space-x-1">
                          <a
                            href={`${source_chain_data?.explorer?.url}${source_chain_data?.explorer?.address_path?.replace('{address}', sender_address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <EnsProfile
                              address={sender_address}
                              no_copy={true}
                              fallback={(
                                <div className="h-6 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                  {ellipse(
                                    sender_address,
                                    12,
                                    source_chain_data?.prefix_address,
                                  )}
                                </div>
                              )}
                            />
                          </a>
                          <Copy
                            value={sender_address}
                          />
                        </div> :
                        <div className="h-6 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                          <AccountProfile
                            address={sender_address}
                            prefix={source_chain_data?.prefix_address}
                          />
                        </div>
                      }
                    </div>
                  )}
                </div>
                <div className="lg:min-h-full sm:hidden lg:flex items-center">
                  <MdChevronRight size={36} className="transform rotate-90 sm:rotate-0" />
                </div>
                <div className="flex flex-col space-y-1">
                  <div className="max-w-min bg-slate-50 dark:bg-slate-800 rounded-xl text-base font-semibold py-0.5 px-2">
                    Asset
                  </div>
                  {typeof amount === 'number' && asset_data && (
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
                      {fee > 0 && (
                        <span className="text-xs lg:text-sm font-semibold">
                          (<span className="mr-1">
                            Fee:
                          </span>
                          <span>
                            {number_format(fee, '0,0.000000', true)}
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
                      deposit_address.startsWith('0x') ?
                        <div className="flex items-center space-x-1">
                          <a
                            href={`${deposit_chain_data?.explorer?.url}${deposit_chain_data?.explorer?.address_path?.replace('{address}', deposit_address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <EnsProfile
                              address={deposit_address}
                              no_copy={true}
                              fallback={(
                                <div className="h-6 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                  {ellipse(
                                    deposit_address,
                                    12,
                                    deposit_chain_data?.prefix_address,
                                  )}
                                </div>
                              )}
                            />
                          </a>
                          <Copy
                            value={deposit_address}
                          />
                        </div> :
                        <div className="h-6 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                          <AccountProfile
                            address={deposit_address}
                            prefix={deposit_chain_data?.prefix_address}
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
                      {recipient_address.startsWith('0x') ?
                        <div className="flex items-center space-x-1">
                          <a
                            href={`${destination_chain_data?.explorer?.url}${destination_chain_data?.explorer?.address_path?.replace('{address}', recipient_address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <EnsProfile
                              address={recipient_address}
                              no_copy={true}
                              fallback={(
                                <div className="h-6 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                  {ellipse(
                                    recipient_address,
                                    12,
                                    destination_chain_data?.prefix_address,
                                  )}
                                </div>
                              )}
                            />
                          </a>
                          <Copy
                            value={recipient_address}
                          />
                        </div> :
                        <div className="h-6 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                          <AccountProfile
                            address={recipient_address}
                            prefix={destination_chain_data?.prefix_address}
                          />
                        </div>
                      }
                    </div>
                  )}
                </div>
                <div className="min-w-max flex flex-col space-y-0">
                  <div className="max-w-min bg-slate-50 dark:bg-slate-800 rounded-xl text-base font-semibold pt-0.5 pb-1 px-2">
                    Status
                  </div>
                  {staging ?
                    <div className="flex flex-col space-y-0.5 mt-2 px-1">
                      <ProgressBar
                        width={current_step * 100 / steps.length}
                        color="bg-green-400"
                        backgroundClassName="h-1.5 bg-yellow-400"
                        className="h-1.5"
                      />
                      <div className="flex items-center space-x-1.5">
                        {finish ?
                          <BiCheckCircle
                            size={20}
                            className="text-green-400 dark:text-green-300"
                          /> :
                          step?.data?.status === 'failed' ?
                            <BiXCircle
                              size={20}
                              className="text-red-500 dark:text-red-600"
                            /> :
                            <FiCircle
                              size={20}
                              className="text-slate-300 dark:text-slate-700"
                            />
                        }
                        <div className="flex items-center space-x-1">
                          {id ?
                            <Copy
                              value={id}
                              title={<span className={`cursor-pointer uppercase ${text_color} text-xs font-bold`}>
                                {title}
                              </span>}
                              size={18}
                            /> :
                            <span className={`uppercase ${text_color} text-xs font-medium`}>
                              {title}
                            </span>
                          }
                          {id && url && (
                            <a
                              href={`${url}${_path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 dark:text-blue-500"
                            >
                              {icon ?
                                <Image
                                  src={icon}
                                  className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                /> :
                                <TiArrowRight
                                  size={16}
                                  className="transform -rotate-45"
                                />
                              }
                            </a>
                          )}
                        </div>
                      </div>
                    </div> :
                    <>
                      {steps.map((s, i) => {
                        const { title, chain_data, data, id_field, path, params, finish } = { ...s }
                        const id = data?.[id_field]
                        const { explorer } = { ...chain_data }
                        const { url, transaction_path, icon } = { ...explorer }

                        let _path = path?.replace('{id}', id) ||
                          transaction_path?.replace('{tx}', id)
                        Object.entries({ ...params }).forEach(([k, v]) => {
                          _path = _path?.replace(`{${k}}`, v)
                        })

                        const text_color = finish ?
                          'text-green-400 dark:text-green-300' :
                          i === current_step ?
                            'text-yellow-500 dark:text-yellow-400' :
                            data?.status === 'failed' ?
                              'text-red-500 dark:text-red-600' :
                              'text-slate-300 dark:text-slate-700'

                        return (
                          <div
                            key={i}
                            className="flex items-center space-x-1.5 pb-0.5"
                          >
                            {finish ?
                              <BiCheckCircle
                                size={20}
                                className="text-green-400 dark:text-green-300"
                              /> :
                              i === current_step ?
                                <ProgressBarSpinner
                                  borderColor="#ca8a04"
                                  barColor="#facc15"
                                  width="20"
                                  height="20"
                                /> :
                                data?.status === 'failed' ?
                                  <BiXCircle
                                    size={20}
                                    className="text-red-500 dark:text-red-600"
                                  /> :
                                  <FiCircle
                                    size={20}
                                    className="text-slate-300 dark:text-slate-700"
                                  />
                            }
                            <div className="flex items-center space-x-1">
                              {id ?
                                <Copy
                                  value={id}
                                  title={<span className={`cursor-pointer uppercase ${text_color} text-xs font-bold`}>
                                    {title}
                                  </span>}
                                  size={18}
                                /> :
                                <span className={`uppercase ${text_color} text-xs font-medium`}>
                                  {title}
                                </span>
                              }
                              {id && url && (
                                <a
                                  href={`${url}${_path}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 dark:text-blue-500"
                                >
                                  {icon ?
                                    <Image
                                      src={icon}
                                      className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                    /> :
                                    <TiArrowRight
                                      size={16}
                                      className="transform -rotate-45"
                                    />
                                  }
                                </a>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </>
                  }
                  {insufficient_fee && (
                    <Popover
                      placement="bottom"
                      title={null}
                      content={<div className="w-40 whitespace-pre-wrap text-black dark:text-white text-xs font-normal">
                        Send more {ellipse(symbol)} to the same recipient to cover the min fee
                      </div>}
                    >
                      <div className="max-w-min bg-red-100 dark:bg-red-700 border border-red-500 dark:border-red-600 rounded-lg whitespace-nowrap font-semibold py-0.5 px-2">
                        Insufficient Fee
                      </div>
                    </Popover>
                  )}
                  {
                    ibc_send?.failed_txhash &&
                    !ibc_send.ack_txhash
                    (
                      <div className="max-w-min bg-red-100 dark:bg-red-700 border border-red-500 dark:border-red-600 rounded-lg whitespace-nowrap font-semibold py-0.5 px-2">
                        Timeout
                      </div>
                    )
                  }
                  {time_spent && (
                    <div className="flex items-center space-x-1 mx-1 pt-0.5">
                      <span className="whitespace-nowrap text-slate-400 dark:text-slate-600 font-medium">
                        Time spent:
                      </span>
                      <span className="whitespace-nowrap font-bold">
                        {time_spent}
                      </span>
                    </div>
                  )}
                </div>
              </div> :
              <span className="text-slate-400 dark:text-slate-200 text-base font-semibold">
                Data not found
              </span>
            }
          </div>
          {data && detail_steps.map((s, i) => {
            const { title, chain_data, data, id_field, path, params, finish } = { ...s }
            const { id, height, type, status, executed, chain, transfer_id, command_id, created_at, ack_txhash, recv_txhash, failed_txhash, transactionHash, block_timestamp, received_at } = { ...data }
            const { explorer } = { ...chain_data }
            const { url, transaction_path, block_path, icon } = { ...explorer }

            const _id = data?.[id_field]

            let _path =
              (path || '')
                .replace(
                  '{id}',
                  _id,
                ) ||
              (transaction_path || '')
                .replace(
                  '{tx}',
                  _id,
                )

            Object.entries({ ...params })
              .forEach(([k, v]) => {
                _path =
                  (_path || '')
                    .replace(
                      `{${k}}`,
                      v,
                    )
              })

            const time = block_timestamp ?
              block_timestamp * 1000 :
              received_at ?
                received_at?.ms :
                created_at?.ms

            const _chain_data =
              getChain(
                chain,
                chains_data,
              )

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
                  {transactionHash && _chain_data?.explorer && (
                    <div className={rowClassName}>
                      <span className={rowTitleClassName}>
                        Transaction:
                      </span>
                      <div className="flex items-center space-x-1">
                        <a
                          href={`${_chain_data.explorer.url}${_chain_data.explorer.transaction_path?.replace('{tx}', transactionHash)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 dark:text-blue-500 font-medium"
                        >
                          <div>
                            <span className="xl:hidden">
                              {ellipse(
                                transactionHash,
                                12,
                              )}
                            </span>
                            <span className="hidden xl:block">
                              {ellipse(
                                transactionHash,
                                16,
                              )}
                            </span>
                          </div>
                        </a>
                        <Copy
                          value={transactionHash}
                          size={18}
                        />
                        <a
                          href={`${_chain_data.explorer.url}${_chain_data.explorer.transaction_path?.replace('{tx}', transactionHash)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 dark:text-blue-500"
                        >
                          {_chain_data.explorer.icon ?
                            <Image
                              src={_chain_data.explorer.icon}
                              className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                            /> :
                            <TiArrowRight
                              size={16}
                              className="transform -rotate-45"
                            />
                          }
                        </a>
                      </div>
                    </div>
                  )}
                  {s.id === 'ibc_send' && _id ?
                    [
                      id,
                      recv_txhash,
                      ack_txhash ||
                      failed_txhash,
                    ]
                    .filter(tx => tx)
                    .map((tx, j) => {
                      const _chain_data = tx === recv_txhash ?
                        destination_chain_data :
                        axelar_chain_data
                      const _explorer = _chain_data?.explorer

                      return (
                        <div
                          key={j}
                          className={rowClassName}
                        >
                          <span className={rowTitleClassName}>
                            {tx === ack_txhash ?
                              'Acknowledge' :
                              tx === failed_txhash ?
                                'Timeout' :
                                tx === recv_txhash ?
                                  'Receive' :
                                  'Send'
                            }:
                          </span>
                          <div className="flex items-center space-x-1">
                            <a
                              href={`${_explorer?.url}${_explorer?.transaction_path?.replace('{tx}', tx)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 dark:text-blue-500 font-medium"
                            >
                              <div>
                                <span className="xl:hidden">
                                  {ellipse(
                                    tx,
                                    12,
                                  )}
                                </span>
                                <span className="hidden xl:block">
                                  {ellipse(
                                    tx,
                                    16,
                                  )}
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
                              className="text-blue-500 dark:text-blue-500"
                            >
                              {_explorer?.icon ?
                                <Image
                                  src={_explorer.icon}
                                  className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                /> :
                                <TiArrowRight
                                  size={16}
                                  className="transform -rotate-45"
                                />
                              }
                            </a>
                          </div>
                        </div>
                      )
                    }) :
                    _id ?
                      <div className={rowClassName}>
                        <span className={rowTitleClassName}>
                          {s.id === 'sign_batch' ?
                            'Batch' :
                            'Transaction'
                          }:
                        </span>
                        <div className="flex items-center space-x-1">
                          <a
                            href={`${url}${_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 dark:text-blue-500 font-medium"
                          >
                            <div>
                              <span className="xl:hidden">
                                {ellipse(
                                  _id,
                                  12,
                                )}
                              </span>
                              <span className="hidden xl:block">
                                {ellipse(
                                  _id,
                                  16,
                                )}
                              </span>
                            </div>
                          </a>
                          <Copy
                            value={_id}
                          />
                          <a
                            href={`${url}${_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 dark:text-blue-500"
                          >
                            {icon ?
                              <Image
                                src={icon}
                                className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                              /> :
                              <TiArrowRight
                                size={16}
                                className="transform -rotate-45"
                              />
                            }
                          </a>
                        </div>
                      </div> :
                      <ColorRing
                        color={loader_color(theme)}
                        width="32"
                        height="32"
                      />
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
                          className="text-blue-500 dark:text-blue-500 font-medium"
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
                      <div className={`${status === 'success' || executed ? 'text-green-400 dark:text-green-300' : 'text-red-500 dark:text-red-600'} uppercase flex items-center text-sm lg:text-base font-bold space-x-1`}>
                        {status === 'success' || executed ?
                          <BiCheckCircle size={20} /> :
                          <BiXCircle size={20} />
                        }
                        <span>
                          {executed ?
                            'Executed' :
                            status
                        }
                        </span>
                      </div>
                    </div>
                  )}
                  {time && (
                    <div className={rowClassName}>
                      <span className={rowTitleClassName}>
                        Time:
                      </span>
                      <span className="text-slate-400 dark:text-slate-600 font-medium">
                        {moment(time).fromNow()} ({moment(time).format('MMM D, YYYY h:mm:ss A')})
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
        </div> :
        !tx && transfer_id ?
          null :
          <ProgressBarSpinner
            borderColor={loader_color(theme)}
            width="36"
            height="36"
          />
      }
    </div>
  )
}