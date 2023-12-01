import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import { Chip, Tooltip } from '@material-tailwind/react'
import _ from 'lodash'
import moment from 'moment'
import { BsArrowRightShort } from 'react-icons/bs'

import Datatable from '../../datatable'
import NumberDisplay from '../../number'
import Copy from '../../copy'
import AccountProfile from '../../profile/account'
import ExplorerLink from '../../explorer/link'
import TimeAgo from '../../time/timeAgo'
import { getChainData } from '../../../lib/config'
import { split, toArray, ellipse, equalsIgnoreCase } from '../../../lib/utils'

export default ({ data }) => {
  const { chains } = useSelector(state => ({ chains: state.chains }), shallowEqual)
  const { chains_data } = { ...chains }

  const {
    call,
    gas_paid,
    gas_paid_to_callback,
    gas_added_transactions,
    express_executed,
    confirm,
    confirm_failed,
    confirm_failed_event,
    approved,
    executed,
    is_executed,
    error,
    refunded,
    refunded_more_transactions,
    fees,
    gas,
    callback_data,
    origin_data,
    token_sent,
    token_deployment_initialized,
    token_deployed,
    interchain_transfer,
    interchain_transfer_with_data,
    token_manager_deployment_started,
    interchain_token_deployment_started,
    amount,
  } = { ...data }
  const { chain, chain_type, destination_chain_type, proposal_id } = { ...call }
  const { destinationChain, destinationContractAddress } = { ...call?.returnValues }
  const { refundAddress } = { ...gas_paid?.returnValues }
  const { commandId } = { ...approved?.returnValues }
  const { source_token, destination_native_token, axelar_token, source_confirm_fee, destination_confirm_fee, express_supported, express_fee } = { ...fees }
  const { gas_paid_amount, gas_base_fee_amount, gas_express_amount, gas_express_fee_amount, gas_approve_amount, gas_execute_amount, gas_callback_base_fee_amount, gas_callback_approve_amount, gas_callback_amount } = { ...gas }
  const { destinationAddress } = { ...token_sent }

  const source_chain_data = getChainData(chain, chains_data)
  const destination_chain_data = getChainData(destinationChain, chains_data)
  const axelar_chain_data = getChainData('axelarnet', chains_data)

  const errored = error && moment().diff(moment((error?.block_timestamp || approved?.block_timestamp || confirm?.block_timestamp) * 1000), 'seconds') > 120
  const steps = toArray([
    {
      id: 'send',
      title: call ? 'Sent' : 'Send',
      status: call ? 'success' : 'pending',
      data: call,
      chain_data: source_chain_data,
    },
    {
      id: 'pay_gas',
      title: gas_paid || gas_paid_to_callback ? 'Gas Paid' : moment().diff(moment(call?.block_timestamp * 1000), 'seconds') < 30 ? 'Checking Gas Paid' : 'Pay Gas',
      status: gas_paid || gas_paid_to_callback ? 'success' : 'pending',
      data: gas_paid || gas_paid_to_callback,
      chain_data: gas_paid ? source_chain_data : gas_paid_to_callback ? getChainData(origin_data?.call?.chain, chains_data) || destination_chain_data : source_chain_data,
    },
    express_executed && {
      id: 'express',
      title: 'Express Executed',
      status: 'success',
      data: express_executed,
      chain_data: destination_chain_data,
    },
    chain_type !== 'cosmos' && (confirm || !approved || !(executed || is_executed || error)) && {
      id: 'confirm',
      title: (confirm && confirm.poll_id !== confirm_failed_event?.poll_id) || approved || executed || is_executed || error ? 'Confirmed' : confirm_failed_event ? 'Confirm' : gas_paid || gas_paid_to_callback || express_executed ? 'Waiting for Finality' : 'Confirm',
      status: (confirm && confirm.poll_id !== confirm_failed_event?.poll_id) || approved || executed || is_executed || error ? 'success' : confirm_failed ? 'failed' : 'pending',
      data: confirm || confirm_failed_event,
      chain_data: axelar_chain_data,
    },
    destination_chain_type !== 'cosmos' && {
      id: 'approve',
      title: approved ? 'Approved' : confirm && confirm.poll_id !== confirm_failed_event?.poll_id ? 'Approving' : 'Approve',
      status: approved ? 'success' : 'pending',
      data: approved,
      chain_data: destination_chain_data,
    },
    {
      id: 'execute',
      title: (executed && (!executed.axelarTransactionHash || (executed.transactionHash && !error))) || is_executed ? 'Executed' : errored ? 'Error' : executed?.axelarTransactionHash && moment().diff(moment((confirm?.block_timestamp || call?.block_timestamp) * 1000), 'seconds') > 60 ? 'Waiting for IBC' : 'Execute',
      status: (executed && (!executed.axelarTransactionHash || (executed.transactionHash && !error))) || is_executed ? 'success' : errored ? 'failed' : 'pending',
      data: executed || is_executed || error,
      chain_data: executed?.axelarTransactionHash && !executed.transactionHash ? axelar_chain_data : destination_chain_data,
    },
    callback_data?.call && callback_data.executed && {
      id: 'callback',
      title: 'Callback',
      status: 'success',
      data: callback_data.call,
      chain_data: destination_chain_data,
    },
    refunded?.receipt?.status && {
      id: 'refund',
      title: 'Refunded',
      status: 'success',
      data: refunded,
      chain_data: source_chain_data,
    },
  ])

  return (
    <Datatable
      columns={[
        {
          Header: 'Step',
          accessor: 'title',
          disableSortBy: true,
          Cell: props => {
            const { value } = { ...props }
            return value && (
              <div className="w-fit h-6 bg-slate-50 dark:bg-slate-900 rounded flex items-center text-slate-600 dark:text-slate-200 font-medium mt-2 py-1 px-2">
                {value}
              </div>
            )
          },
        },
        {
          Header: 'Tx Hash',
          accessor: 'data.transactionHash',
          disableSortBy: true,
          Cell: props => {
            const { row } = { ...props }
            let { value } = { ...props }
            const { id, status, data, chain_data } = { ...row.original }
            const _data = id === 'pay_gas' && typeof data === 'string' ? origin_data?.gas_paid : data
            const { chain_type, logIndex, _logIndex, confirmation_txhash, poll_id, proposal_id, axelarTransactionHash, receipt, error, returnValues } = { ..._data }
            let { transactionHash } = { ..._data }
            const { explorer } = { ...chain_data }
            const { url, transaction_path } = { ...explorer }
            transactionHash = transactionHash || receipt?.transactionHash || receipt?.hash

            let _url
            let axelar_url
            let gmp_url

            if (url && transaction_path) {
              switch (id) {
                case 'confirm':
                  if (confirmation_txhash) {
                    value = confirmation_txhash
                    _url = `/tx/${confirmation_txhash}`
                  }
                  else if (poll_id) {
                    value = poll_id
                    _url = `/evm-poll/${poll_id}`
                  }
                  break
                case 'callback':
                  if (transactionHash) {
                    value = transactionHash
                    _url = `${url}${transaction_path.replace('{tx}', transactionHash)}`
                    gmp_url = `/gmp/${transactionHash}${chain_type === 'evm' && typeof logIndex === 'number' ? `:${logIndex}` : ''}`
                  }
                  break
                default:
                  if (proposal_id) {
                    value = returnValues?.messageId || transactionHash
                  }
                  else {
                    if (transactionHash) {
                      value = transactionHash
                      _url = `${url}${transaction_path.replace('{tx}', transactionHash)}`
                    }
                    else if (axelarTransactionHash) {
                      value = axelarTransactionHash
                      _url = `${axelar_chain_data.explorer.url}${axelar_chain_data.explorer.transaction_path.replace('{tx}', axelarTransactionHash)}`
                    }
                    if (axelarTransactionHash) {
                      axelar_url = `${axelar_chain_data.explorer.url}${axelar_chain_data.explorer.transaction_path.replace('{tx}', axelarTransactionHash)}`
                    }
                  }
                  break
              }
            }

            const component = (
              <div className="text-sm font-semibold">
                {ellipse(value, 10)}
              </div>
            )

            const logComponent = chain_type === 'evm' && typeof logIndex === 'number' && (
              <div className="text-xs font-medium">
                {logIndex}
              </div>
            )

            const eventComponent = logComponent && id === 'send' && typeof _logIndex === 'number' && (
              <div className="text-xs font-medium">
                {_logIndex}
              </div>
            )

            const axelarComponent = axelarTransactionHash && !proposal_id && (
              <Tooltip content="Axelar Transaction">
                <div className="text-sm font-semibold">
                  {ellipse(axelarTransactionHash, 10)}
                </div>
              </Tooltip>
            )

            const errorMessage = error?.data?.message || error?.message
            const errorReason = error?.reason
            const errorCode = error?.code
            const errorBody = error?.body?.replaceAll('"""', '')

            const errorComponent = id === 'execute' && status === 'failed' && (
              <div className="w-64 flex flex-col space-y-1.5 mt-1">
                {errorMessage && (
                  <div>
                    <div className="whitespace-pre-wrap text-red-400 text-xs font-medium mr-1">
                      {ellipse(errorMessage, 256)}
                    </div>
                    <a
                      href={`${process.env.NEXT_PUBLIC_DOC_URL}/dev/general-message-passing/debug/error-debugging`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 dark:text-blue-500 text-xs"
                    >
                      Recovery guidelines
                    </a>
                  </div>
                )}
                {errorReason && (
                  <div className="whitespace-pre-wrap text-red-500 text-xs font-medium">
                    Reason: {ellipse(errorReason, 256)}
                  </div>
                )}
                {errorCode && (
                  <a
                    href={!isNaN(errorCode) ? 'https://docs.metamask.io/guide/ethereum-provider.html#errors' : `https://docs.ethers.io/v5/api/utils/logger/#errors-${typeof errorCode === 'string' ? `-${split(errorCode, 'lower', '_').join('-')}` : 'ethereum'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="max-w-min bg-slate-50 dark:bg-slate-900 rounded text-slate-400 dark:text-slate-500 text-2xs font-medium py-0.5 px-2"
                  >
                    {errorCode}
                  </a>
                )}
                {errorBody && (
                  <div className="bg-slate-50 dark:bg-slate-900 rounded whitespace-pre-wrap break-all text-xs p-2">
                    {ellipse(errorBody, 256)}
                  </div>
                )}
              </div>
            )

            return (
              <div className="flex flex-col space-y-1 mt-2 mb-4">
                {value && (
                  <div className="flex flex-col">
                    <div className="h-6 flex items-center space-x-1">
                      {gmp_url || _url ?
                        <Link href={gmp_url || _url} target="_blank" rel="noopener noreferrer" className="text-blue-400 dark:text-blue-500">
                          {component}
                        </Link> :
                        component
                      }
                      <Copy value={value} />
                      <ExplorerLink explorer={explorer} _url={_url} />
                    </div>
                    {logComponent && (
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <span className="whitespace-nowrap text-slate-600 dark:text-slate-200 text-xs font-medium">
                            Log Index:
                          </span>
                          {_url ?
                            <Link href={`${_url}#eventlog`} target="_blank" rel="noopener noreferrer" className="text-blue-400 dark:text-blue-500">
                              {logComponent}
                            </Link> :
                            logComponent
                          }
                        </div>
                        {eventComponent && (
                          <div className="flex items-center space-x-1">
                            <span className="whitespace-nowrap text-slate-600 dark:text-slate-200 text-xs font-medium">
                              Event Index:
                            </span>
                            {_url ?
                              <Link href={`${_url}#eventlog`} target="_blank" rel="noopener noreferrer" className="text-blue-400 dark:text-blue-500">
                                {eventComponent}
                              </Link> :
                              eventComponent
                            }
                          </div>
                        )}
                        {id === 'approve' && commandId && (
                          <Link href={`/evm-batches?commandId=${commandId}`} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-400 dark:text-blue-500">
                            <span className="text-xs font-semibold">
                              Batch
                            </span>
                            <BsArrowRightShort size={16} />
                          </Link>
                        )}
                      </div>
                    )}
                    {id === 'send' && (
                      <>
                        {token_sent && (
                          <Link href={`${_url}#eventlog`} target="_blank" rel="noopener noreferrer" className="mt-4">
                            <NumberDisplay
                              value={amount}
                              format="0,0.00"
                              prefix="TokenSent: "
                              suffix={` ${token_sent.symbol}`}
                              className="w-fit h-6 bg-slate-50 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-200 text-xs font-medium py-1 px-2"
                            />
                          </Link>
                        )}
                        {interchain_transfer && (
                          <Link href={`${_url}#eventlog`} target="_blank" rel="noopener noreferrer" className="mt-4">
                            <NumberDisplay
                              value={amount}
                              format="0,0.00"
                              prefix="InterchainTransfer: "
                              suffix={` ${interchain_transfer.symbol}`}
                              className="w-fit h-6 bg-slate-50 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-200 text-xs font-medium py-1 px-2"
                            />
                          </Link>
                        )}
                        {interchain_transfer_with_data && (
                          <Link href={`${_url}#eventlog`} target="_blank" rel="noopener noreferrer" className="mt-4">
                            <NumberDisplay
                              value={amount}
                              format="0,0.00"
                              prefix="InterchainTransferWithData: "
                              suffix={` ${interchain_transfer_with_data.symbol}`}
                              className="w-fit h-6 bg-slate-50 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-200 text-xs font-medium py-1 px-2"
                            />
                          </Link>
                        )}
                        {token_deployment_initialized?.tokenSymbol && (
                          <Link href={`${_url}#eventlog`} target="_blank" rel="noopener noreferrer" className="mt-4">
                            <div className="w-fit h-6 bg-slate-50 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-200 text-xs font-medium py-1 px-2">
                              TokenDeploymentInitialized: {token_deployment_initialized.tokenSymbol}
                            </div>
                          </Link>
                        )}
                        {token_deployed?.symbol && (
                          <Link href={`${_url}#eventlog`} target="_blank" rel="noopener noreferrer" className="mt-4">
                            <div className="w-fit h-6 bg-slate-50 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-200 text-xs font-medium py-1 px-2">
                              TokenDeployed: {token_deployed.symbol}
                            </div>
                          </Link>
                        )}
                        {token_manager_deployment_started?.tokenId && (
                          <Link href={`${_url}#eventlog`} target="_blank" rel="noopener noreferrer" className="mt-4">
                            <div className="w-fit h-6 bg-slate-50 dark:bg-slate-800 rounded flex items-center text-slate-600 dark:text-slate-200 text-xs font-medium py-1 px-2">
                              <span className="mr-1">TokenManagerDeploymentStarted:</span>
                              <Copy value={token_manager_deployment_started.tokenId} />
                            </div>
                          </Link>
                        )}
                        {interchain_token_deployment_started?.tokenSymbol && (
                          <Link href={`${_url}#eventlog`} target="_blank" rel="noopener noreferrer" className="mt-4">
                            <div className="w-fit h-6 bg-slate-50 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-200 text-xs font-medium py-1 px-2">
                              InterchainTokenDeploymentStarted: {interchain_token_deployment_started.tokenSymbol}
                            </div>
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                )}
                {toArray((id === 'pay_gas' && gas_added_transactions) || (id === 'refund' && refunded_more_transactions)).map((d, i) => {
                  const { transactionHash } = { ...d }

                  let _url
                  if (url && transaction_path) {
                    if (transactionHash) {
                      _url = `${url}${transaction_path.replace('{tx}', transactionHash)}`
                    }
                  }

                  const component = (
                    <div className="text-sm font-semibold">
                      {ellipse(transactionHash, 10)}
                    </div>
                  )

                  return (
                    <div key={i} className="h-6 flex items-center space-x-1">
                      {_url ?
                        <Link href={_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 dark:text-blue-500">
                          {component}
                        </Link> :
                        component
                      }
                      <Copy value={transactionHash} />
                      <ExplorerLink explorer={explorer} _url={_url} />
                    </div>
                  )
                })}
                {transactionHash && axelarComponent && (
                  <div className="h-6 flex items-center space-x-1">
                    {axelar_url ?
                      <Link href={axelar_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 dark:text-blue-500">
                        {axelarComponent}
                      </Link> :
                      axelarComponent
                    }
                    <Copy value={axelarTransactionHash} />
                    <ExplorerLink explorer={axelar_chain_data.explorer} _url={axelar_url} />
                  </div>
                )}
                {errorComponent}
              </div>
            )
          },
          headerClassName: 'whitespace-nowrap',
        },
        {
          Header: 'Height',
          accessor: 'data.blockNumber',
          disableSortBy: true,
          Cell: props => {
            const { row } = { ...props }
            let { value } = { ...props }
            const { id, data, chain_data } = { ...row.original }
            const _data = id === 'pay_gas' && typeof data === 'string' ? origin_data?.gas_paid : data
            const { blockNumber, axelarBlockNumber } = { ..._data }
            const { explorer } = { ...chain_data }
            const { url, block_path } = { ...explorer }
            const axelarExplorer = axelar_chain_data.explorer
            value = value || blockNumber

            let _url
            if (url && block_path) {
              if (value) {
                _url = `${url}${block_path.replace('{block}', value)}`
              }
            }

            const component = (
              <NumberDisplay
                value={value}
                format="0,0"
                className="text-sm font-semibold"
              />
            )

            let axelar_url
            if (axelarExplorer.url && axelarExplorer.block_path) {
              if (axelarBlockNumber) {
                axelar_url = `${axelarExplorer.url}${axelarExplorer.block_path.replace('{block}', axelarBlockNumber)}`
              }
            }

            const axelarComponent = (
              <NumberDisplay
                value={axelarBlockNumber}
                format="0,0"
                className="text-sm font-semibold"
              />
            )

            const components = toArray([
              value && (
                <div key="block" className="h-6 flex items-center">
                  {_url ?
                    <Link href={_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 dark:text-blue-500">
                      {component}
                    </Link> :
                    component
                  }
                </div>
              ),
              axelarBlockNumber && (
                <div key="axelar_block" className="h-6 flex items-center">
                  {axelar_url ?
                    <Link href={axelar_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 dark:text-blue-500">
                      {axelarComponent}
                    </Link> :
                    axelarComponent
                  }
                </div>
              ),
            ])

            return components.length > 0 && (
              <div className="flex flex-col space-y-1 mt-2">
                {components}
              </div>
            )
          },
        },
        {
          Header: 'Address',
          accessor: 'data.transaction.from',
          disableSortBy: true,
          Cell: props => {
            const { row } = { ...props }
            let { value } = { ...props }
            const { id, data, chain_data } = { ...row.original }
            const _data = id === 'pay_gas' && typeof data === 'string' ? origin_data?.gas_paid : data
            const { contract_address, to, transaction, returnValues } = { ..._data }
            const { sender } = { ...returnValues }
            let { sourceAddress } = { ...returnValues }
            const { explorer } = { ...chain_data }
            value = value || transaction?.from
            const to_address = !['execute', 'refund'].includes(id) ? contract_address : id === 'refund' ? to || refundAddress : destinationContractAddress
            sourceAddress = sourceAddress || sender

            return (
              <div className="flex flex-col space-y-1 mt-2">
                {value && !proposal_id && (
                  <Tooltip placement="top-start" content={`${['express', 'approve', 'execute'].includes(id) ? 'Relayer' : id === 'refund' ? 'Refunder' : 'User'}`}>
                    <div className="h-6 flex items-center space-x-1">
                      <AccountProfile address={value} noCopy={true} explorer={explorer} chain={chain_data?.id} />
                      <ExplorerLink value={value} type="address" explorer={explorer} />
                    </div>
                  </Tooltip>
                )}
                {to_address && (
                  <Tooltip placement="top-start" content={`${['send', 'approve', 'callback'].includes(id) ? 'Gateway' : id === 'pay_gas' ? 'Gas Service' : id === 'express' && !equalsIgnoreCase(to_address, destinationContractAddress) ? 'Express Service' : id === 'refund' ? 'Receiver' : 'Destination'}`}>
                    <div className="h-6 flex items-center space-x-1">
                      <AccountProfile address={to_address} noCopy={true} explorer={explorer} chain={chain_data?.id} />
                      <ExplorerLink value={to_address} type="address" explorer={explorer} />
                    </div>
                  </Tooltip>
                )}
                {sourceAddress && id !== 'execute' && (
                  <Tooltip placement="top-start" content="Source Address">
                    <div className="h-6 flex items-center space-x-1">
                      <AccountProfile address={sourceAddress} noCopy={true} explorer={source_chain_data?.explorer} chain={chain_data?.id} />
                      <ExplorerLink value={sourceAddress} type="address" explorer={source_chain_data?.explorer} />
                    </div>
                  </Tooltip>
                )}
                {['send', 'execute'].includes(id) && destinationAddress && (
                  <Tooltip placement="top-start" content="SendToken Destination">
                    <div className="h-6 flex items-center space-x-1">
                      <AccountProfile address={destinationAddress} noCopy={true} explorer={destination_chain_data?.explorer} chain={chain_data?.id} />
                      <ExplorerLink value={destinationAddress} type="address" explorer={destination_chain_data?.explorer} />
                    </div>
                  </Tooltip>
                )}
              </div>
            )
          },
        },
        {
          Header: 'Status',
          accessor: 'status',
          disableSortBy: true,
          Cell: props => {
            const { value } = { ...props }
            return value && (
              <div className="h-6 flex items-center mt-2">
                <Chip
                  color={value === 'success' ? 'green' : value === 'pending' ? 'blue' : 'red'}
                  value={value}
                  className="chip font-medium py-1 px-2"
                />
              </div>
            )
          },
        },
        {
          Header: 'Gas',
          accessor: 'gas',
          disableSortBy: true,
          Cell: props => {
            const { row } = { ...props }
            const { id } = { ...row.original }
            const { gas_price } = { ...source_token }

            let rate
            let component
            let convertedComponent
            let extra

            switch (id) {
              case 'pay_gas':
                component = (
                  <NumberDisplay
                    value={gas_paid ? gas?.gas_paid_amount : gas_paid_to_callback * gas_price}
                    format="0,0.00"
                    suffix={source_token && ` ${source_token.symbol}`}
                    noTooltip={true}
                  />
                )
                extra = (true || !(gas_approve_amount > 0)) && (
                  <div className={`flex flex-col ${express_supported && express_fee > 0 ? 'mt-2.5' : ''} space-y-0.5`}>
                    <NumberDisplay
                      value={gas_base_fee_amount || fees?.source_base_fee}
                      format="0,0.00"
                      prefix="Base Fee: "
                      suffix={source_token && ` ${source_token.symbol}`}
                      noTooltip={true}
                      className="whitespace-nowrap text-slate-600 dark:text-slate-200 text-xs font-medium"
                    />
                    {express_supported && express_fee > 0 && (chain_type !== 'cosmos' || express_executed) && (
                      <NumberDisplay
                        value={express_fee}
                        format="0,0.00"
                        prefix="Express Fee: "
                        suffix={source_token && ` ${source_token.symbol}`}
                        noTooltip={true}
                        className="whitespace-nowrap text-slate-600 dark:text-slate-200 text-xs font-medium"
                      />
                    )}
                  </div>
                )
                break
              case 'express':
                try {
                  rate = source_token?.token_price?.usd / destination_native_token?.token_price?.usd
                } catch (error) {}
                if (rate) {
                  component = (
                    <NumberDisplay
                      value={gas_express_amount * rate}
                      format="0,0.00"
                      suffix={destination_native_token && ` ${destination_native_token.symbol}`}
                      noTooltip={true}
                    />
                  )
                }
                convertedComponent = (
                  <NumberDisplay
                    value={gas_express_amount}
                    format="0,0.00"
                    suffix={source_token && ` ${source_token.symbol}`}
                    noTooltip={true}
                    className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-xs"
                  />
                )
                extra = (
                  <NumberDisplay
                    value={gas_express_fee_amount}
                    format="0,0.00"
                    prefix="Relayer Fee: "
                    suffix={source_token && ` ${source_token.symbol}`}
                    noTooltip={true}
                    className="whitespace-nowrap text-slate-600 dark:text-slate-200 text-xs font-medium"
                  />
                )
                break
              case 'confirm':
                if (confirm) {
                  try {
                    rate = source_token?.token_price?.usd / axelar_token?.token_price?.usd
                  } catch (error) {}
                  component = (
                    <NumberDisplay
                      value={source_confirm_fee * (rate || 1)}
                      format="0,0.00"
                      maxDecimals={rate ? 1 : undefined}
                      suffix={rate ? axelar_token && ` ${axelar_token.symbol}` : source_token && ` ${source_token.symbol}`}
                      noTooltip={true}
                    />
                  )
                  convertedComponent = (
                    <NumberDisplay
                      value={source_confirm_fee}
                      format="0,0.00"
                      suffix={source_token && ` ${source_token.symbol}`}
                      noTooltip={true}
                      className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-xs"
                    />
                  )
                }
                break
              case 'approve':
                try {
                  rate = source_token?.token_price?.usd / destination_native_token?.token_price?.usd
                  if (!gas_approve_amount && origin_data) {
                    rate = origin_data?.fees?.source_token?.token_price?.usd / destination_native_token?.token_price?.usd
                  }
                } catch (error) {}
                if (rate) {
                  component = (
                    <NumberDisplay
                      value={((gas_approve_amount - source_confirm_fee) * rate) || ((origin_data?.gas?.gas_callback_approve_amount * rate) - destination_confirm_fee)}
                      format="0,0.00"
                      suffix={destination_native_token && ` ${destination_native_token.symbol}`}
                      noTooltip={true}
                    />
                  )
                }
                convertedComponent = (
                  <NumberDisplay
                    value={gas_approve_amount - source_confirm_fee}
                    format="0,0.00"
                    suffix={source_token && ` ${source_token.symbol}`}
                    noTooltip={true}
                    className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-xs"
                  />
                )
                break
              case 'execute':
                try {
                  rate = source_token?.token_price?.usd / destination_native_token?.token_price?.usd
                  if (!gas_execute_amount && origin_data) {
                    rate = origin_data?.fees?.source_token?.token_price?.usd / destination_native_token?.token_price?.usd
                  }
                } catch (error) {}
                if ((gas_execute_amount && rate) || origin_data?.gas?.gas_callback_amount) {
                  component = (
                    <NumberDisplay
                      value={(gas_execute_amount * rate) || (origin_data?.gas?.gas_callback_amount * rate)}
                      format="0,0.00"
                      suffix={destination_native_token && ` ${destination_native_token.symbol}`}
                      noTooltip={true}
                    />
                  )
                }
                if (gas_execute_amount) {
                  convertedComponent = (
                    <NumberDisplay
                      value={gas_execute_amount}
                      format="0,0.00"
                      suffix={source_token && ` ${source_token.symbol}`}
                      noTooltip={true}
                      className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-xs"
                    />
                  )
                }
                break
              case 'callback':
                if (!callback_data?.gas_paid) {
                  component = gas_callback_amount > 0 && (
                    <NumberDisplay
                      value={gas_callback_amount}
                      format="0,0.00"
                      suffix={source_token && ` ${source_token.symbol}`}
                      noTooltip={true}
                    />
                  )
                  extra = (
                    <NumberDisplay
                      value={gas_callback_approve_amount || gas_callback_base_fee_amount}
                      format="0,0.00"
                      prefix={`${gas_callback_approve_amount ? 'Approve Cost' : 'Base Fee'}: `}
                      suffix={source_token && ` ${source_token.symbol}`}
                      noTooltip={true}
                      className="whitespace-nowrap text-slate-600 dark:text-slate-200 text-xs font-medium"
                    />
                  )
                }
                break
              case 'refund':
                component = (
                  <NumberDisplay
                    value={refunded?.amount + _.sum(toArray(refunded_more_transactions).map(d => d.amount || 0))}
                    format="0,0.00"
                    suffix={source_token && ` ${source_token.symbol}`}
                    noTooltip={true}
                  />
                )
                break
              default:
                break
            }

            return (
              <div className="flex flex-col mt-2">
                {component && (
                  <div className="h-6 flex items-center">
                    {component}
                  </div>
                )}
                {convertedComponent && (
                  <div className="flex items-center">
                    {convertedComponent}
                  </div>
                )}
                {extra && (
                  <div className="h-6 flex items-center">
                    {extra}
                  </div>
                )}
              </div>
            )
          },
        },
        {
          Header: 'Time',
          accessor: 'data.block_timestamp',
          disableSortBy: true,
          Cell: props => {
            const { row } = { ...props }
            let { value } = { ...props }
            const { data } = { ...row.original }
            const { created_at } = { ...data }
            value = value ? value * 1000 : created_at?.ms
            return value && (
              <div className="h-6 flex items-center justify-end mt-2">
                <TimeAgo time={value / 1000} className="text-slate-400 dark:text-slate-500 text-xs font-medium" />
              </div>
            )
          },
          headerClassName: 'justify-end text-right',
        },
      ]}
      data={steps.filter(s => s.status !== 'pending')}
      defaultPageSize={10}
      noPagination={true}
      className="no-border no-shadow"
    />
  )
}