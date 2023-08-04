import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import { Chip, Tooltip } from '@material-tailwind/react'

import Datatable from '../../datatable'
import NumberDisplay from '../../number'
import Image from '../../image'
import Copy from '../../copy'
import AccountProfile from '../../profile/account'
import ExplorerLink from '../../explorer/link'
import TimeAgo from '../../time/timeAgo'
import { getChainData } from '../../../lib/config'
import { toArray, ellipse } from '../../../lib/utils'

export default ({ data }) => {
  const { chains } = useSelector(state => ({ chains: state.chains }), shallowEqual)
  const { chains_data } = { ...chains }

  const {
    send,
    link,
    confirm,
    vote,
    command,
    ibc_send,
    axelar_transfer,
    wrap,
    unwrap,
    erc20_transfer,
    type,
  } = { ...data }
  const { source_chain } = { ...send }
  let { destination_chain, sender_address } = { ...send }
  let { original_source_chain, original_destination_chain, deposit_address, recipient_address } = { ...link }
  destination_chain = unwrap?.destination_chain || destination_chain || link?.destination_chain
  sender_address = wrap?.sender_address || erc20_transfer?.sender_address || sender_address
  original_source_chain = send?.original_source_chain || original_source_chain
  original_destination_chain = send?.original_destination_chain || original_destination_chain
  deposit_address = wrap?.deposit_address || unwrap?.deposit_address_link || erc20_transfer?.deposit_address || send?.recipient_address || deposit_address
  recipient_address = unwrap?.recipient_address || recipient_address

  const source_chain_data = getChainData(original_source_chain, chains_data) || getChainData(source_chain, chains_data)
  const destination_chain_data = getChainData(original_destination_chain, chains_data) || getChainData(destination_chain, chains_data)
  const axelar_chain_data = getChainData('axelarnet', chains_data)
  const deposit_chain_data = getChainData(deposit_address?.startsWith('axelar') ? 'axelarnet' : original_source_chain || source_chain, chains_data)

  const steps = toArray([
    type === 'deposit_address' && link && {
      id: 'link',
      title: 'Link',
      status: 'success',
      data: link,
      chain_data: axelar_chain_data,
    },
    {
      id: 'send',
      title: 'Send',
      status: (type === 'wrap' ? wrap : type === 'erc20_transfer' ? erc20_transfer : send) ? 'success' : 'pending',
      data: type === 'wrap' ? wrap : type === 'erc20_transfer' ? erc20_transfer : send,
      chain_data: source_chain_data,
    },
    type === 'wrap' && {
      id: 'wrap',
      title: 'Wrap',
      status: send ? 'success' : 'pending',
      data: send,
      chain_data: source_chain_data,
    },
    type === 'erc20_transfer' && {
      id: 'erc20_transfer',
      title: 'ERC20 Transfer',
      status: send ? 'success' : 'pending',
      data: send,
      chain_data: source_chain_data,
    },
    !['send_token', 'wrap', 'erc20_transfer'].includes(type) && {
      id: 'confirm',
      title: 'Confirm',
      status: confirm ? 'success' : 'pending',
      data: confirm,
      chain_data: axelar_chain_data,
    },
    getChainData(source_chain_data?.id, chains_data)?.chain_type === 'evm' && {
      id: 'vote',
      title: 'Approve',
      status: vote ? 'success' : 'pending',
      data: vote,
      chain_data: axelar_chain_data,
    },
    getChainData(destination_chain_data?.id, chains_data)?.chain_type === 'evm' && {
      id: 'command',
      title: 'Execute',
      status: command?.executed || command?.transactionHash ? 'success' : 'pending',
      data: command,
      chain_data: command?.transactionHash ? destination_chain_data : axelar_chain_data,
    },
    getChainData(destination_chain_data?.id, chains_data)?.chain_type === 'cosmos' && destination_chain_data.id !== 'axelarnet' && {
      id: 'ibc_send',
      title: 'IBC Transfer',
      status: ibc_send?.ack_txhash || (ibc_send?.recv_txhash && !ibc_send.failed_txhash) ? 'success' : ibc_send?.failed_txhash ? 'failed' : 'pending',
      data: ibc_send,
      chain_data: ibc_send?.recv_txhash ? destination_chain_data : axelar_chain_data,
    },
    destination_chain_data?.id === 'axelarnet' && {
      id: 'axelar_transfer',
      title: 'Axelar Transfer',
      status: axelar_transfer ? 'success' : 'pending',
      data: axelar_transfer,
      chain_data: axelar_chain_data,
    },
    type === 'unwrap' && {
      id: 'unwrap',
      title: 'Unwrap',
      status: unwrap?.tx_hash_unwrap ? 'success' : 'pending',
      data: unwrap,
      chain_data: destination_chain_data,
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
          accessor: 'data.txhash',
          disableSortBy: true,
          Cell: props => {
            const { row } = { ...props }
            let { value } = { ...props }
            const { id, data, chain_data } = { ...row.original }
            const { txhash, poll_id, batch_id, transactionHash, recv_txhash, ack_txhash, failed_txhash, tx_hash_unwrap } = { ...data }
            const { explorer } = { ...chain_data }
            const { url, transaction_path } = { ...explorer }

            let _url
            let batch_url
            let ack_url
            let send_url

            if (url && transaction_path) {
              switch (id) {
                case 'link':
                case 'send':
                case 'wrap':
                case 'erc20_transfer':
                case 'confirm':
                case 'axelar_transfer':
                  if (txhash) {
                    _url = `${url}${transaction_path.replace('{tx}', txhash)}`
                  }
                  break
                case 'vote':
                  if (txhash) {
                    value = txhash
                    _url = `/tx/${txhash}`
                  }
                  else if (poll_id) {
                    value = poll_id
                    _url = `/evm-poll/${poll_id}`
                  }
                  break
                case 'command':
                  if (transactionHash) {
                    value = transactionHash
                    _url = `${url}${transaction_path.replace('{tx}', transactionHash)}`
                  }
                  else if (batch_id) {
                    value = batch_id
                    if (destination_chain_data) {
                      _url = `/evm-batch/${destination_chain_data.id}/${batch_id}`
                    }
                  }
                  if (batch_id) {
                    if (destination_chain_data) {
                      batch_url = `/evm-batch/${destination_chain_data.id}/${batch_id}`
                    }
                  }
                  break
                case 'ibc_send':
                  if (recv_txhash) {
                    value = recv_txhash
                    _url = `${url}${transaction_path.replace('{tx}', recv_txhash)}`
                  }
                  else if (ack_txhash) {
                    value = ack_txhash
                    _url = `${url}${transaction_path.replace('{tx}', ack_txhash)}`
                  }
                  else if (failed_txhash) {
                    value = failed_txhash
                    _url = `${url}${transaction_path.replace('{tx}', failed_txhash)}`
                  }
                  else if (txhash) {
                    value = txhash
                    _url = `${url}${transaction_path.replace('{tx}', txhash)}`
                  }
                  if (ack_txhash) {
                    ack_url = `${axelar_chain_data.explorer.url}${axelar_chain_data.explorer.transaction_path.replace('{tx}', ack_txhash)}`
                  }
                  if (txhash) {
                    send_url = `${axelar_chain_data.explorer.url}${axelar_chain_data.explorer.transaction_path.replace('{tx}', txhash)}`
                  }
                  break
                case 'unwrap':
                  if (tx_hash_unwrap) {
                    value = tx_hash_unwrap
                    _url = `${url}${transaction_path.replace('{tx}', tx_hash_unwrap)}`
                  }
                  break
                default:
                  break
              }
            }

            const component = (
              <div className="text-sm font-semibold">
                {ellipse(value, 10)}
              </div>
            )

            const batchComponent = batch_id && (
              <Tooltip content="EVM Batch">
                <div className="text-sm font-semibold">
                  {ellipse(batch_id, 10)}
                </div>
              </Tooltip>
            )

            const ackComponent = ack_txhash && (
              <Tooltip content="Acknowledgement Transaction">
                <div className="text-sm font-semibold">
                  {ellipse(ack_txhash, 10)}
                </div>
              </Tooltip>
            )

            const sendComponent = txhash && (
              <Tooltip content="IBC Send Transaction">
                <div className="text-sm font-semibold">
                  {ellipse(txhash, 10)}
                </div>
              </Tooltip>
            )

            return value && (
              <div className="flex flex-col space-y-1 mt-2 mb-4">
                <div className="h-6 flex items-center space-x-1">
                  {_url ?
                    <Link href={_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 dark:text-blue-500">
                      {component}
                    </Link> :
                    component
                  }
                  <Copy value={value} />
                  <ExplorerLink explorer={explorer} _url={_url} />
                </div>
                {transactionHash && batchComponent && (
                  <div className="h-6 flex items-center space-x-1">
                    {batch_url ?
                      <Link href={batch_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 dark:text-blue-500">
                        {batchComponent}
                      </Link> :
                      batchComponent
                    }
                    <Copy value={batch_id} />
                    <ExplorerLink explorer={axelar_chain_data.explorer} _url={batch_url} />
                  </div>
                )}
                {(recv_txhash || failed_txhash) && ackComponent && (
                  <div className="h-6 flex items-center space-x-1">
                    {ack_url ?
                      <Link href={ack_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 dark:text-blue-500">
                        {ackComponent}
                      </Link> :
                      ackComponent
                    }
                    <Copy value={ack_txhash} />
                    <ExplorerLink explorer={axelar_chain_data.explorer} _url={ack_url} />
                  </div>
                )}
                {(recv_txhash || failed_txhash || ack_txhash) && sendComponent && (
                  <div className="h-6 flex items-center space-x-1">
                    {send_url ?
                      <Link href={send_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 dark:text-blue-500">
                        {sendComponent}
                      </Link> :
                      sendComponent
                    }
                    <Copy value={txhash} />
                    <ExplorerLink explorer={axelar_chain_data.explorer} _url={send_url} />
                  </div>
                )}
              </div>
            )
          },
          headerClassName: 'whitespace-nowrap',
        },
        {
          Header: 'Height',
          accessor: 'data.height',
          disableSortBy: true,
          Cell: props => {
            const { value, row } = { ...props }
            const { chain_data } = { ...row.original }
            const { explorer } = { ...chain_data }
            const { url, block_path } = { ...explorer }

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
                className="text-sm font-medium"
              />
            )

            return value && (
              <div className="h-6 flex items-center mt-2">
                {_url ?
                  <Link href={_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 dark:text-blue-500">
                    {component}
                  </Link> :
                  component
                }
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
          Header: 'Parameters',
          accessor: 'params',
          disableSortBy: true,
          Cell: props => {
            const { row } = { ...props }
            const { id, data } = { ...row.original }
            const { command_id, transfer_id } = { ...data }
            const { explorer } = { ...deposit_chain_data }

            let deposit_address
            switch (id) {
              case 'link':
              case 'send':
                deposit_address = data?.deposit_address || data?.recipient_address || link?.deposit_address
                break
              case 'wrap':
              case 'erc20_transfer':
                deposit_address = data?.recipient_address
                break
              case 'unwrap':
                deposit_address = data?.deposit_address_link
                break
            }

            return (
              <div className="flex flex-col space-y-1 mt-2">
                {deposit_address && (
                  <Tooltip placement="top-start" content="Deposit Address">
                    <div className="h-6 flex items-center space-x-1">
                      <AccountProfile address={deposit_address} noCopy={true} explorer={explorer} chain={deposit_chain_data?.id} />
                      <ExplorerLink value={deposit_address} type="address" explorer={explorer} />
                    </div>
                  </Tooltip>
                )}
                {command_id && (
                  <Tooltip placement="top-start" content="Command ID">
                    <div className="h-6 flex items-center">
                      <Copy
                        value={command_id}
                        title={
                          <span className="cursor-pointer text-slate-600 dark:text-slate-200 font-medium">
                            {ellipse(command_id, 12)}
                          </span>
                        }
                      />
                    </div>
                  </Tooltip>
                )}
                {transfer_id && (
                  <Tooltip placement="top-start" content="Transfer ID">
                    <div className="h-6 flex items-center">
                      <Copy
                        value={transfer_id}
                        title={
                          <span className="cursor-pointer text-slate-600 dark:text-slate-200 font-medium">
                            {transfer_id}
                          </span>
                        }
                      />
                    </div>
                  </Tooltip>
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
            const { created_at, received_at } = { ...data }
            value = value ? value * 1000 : received_at?.ms || created_at?.ms
            return value && (
              <div className="h-6 flex items-center justify-end mt-2">
                <TimeAgo time={value / 1000} className="text-slate-400 dark:text-slate-500 text-xs font-medium" />
              </div>
            )
          },
          headerClassName: 'justify-end text-right',
        },
      ]}
      data={steps.filter(s => s.status !== 'pending' || (s.id === 'ibc_send' && ibc_send))}
      defaultPageSize={10}
      noPagination={true}
      className="no-border no-shadow"
    />
  )
}