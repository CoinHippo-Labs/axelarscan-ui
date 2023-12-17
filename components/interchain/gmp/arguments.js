import { useSelector, shallowEqual } from 'react-redux'

import Copy from '../../copy'
import { getChainData, getAssetData } from '../../../lib/config'
import { toBigNumber } from '../../../lib/number'
import { toArray, ellipse } from '../../../lib/utils'

export default ({ data }) => {
  const { chains, assets } = useSelector(state => ({ chains: state.chains, assets: state.assets }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }

  const { call, approved, is_invalid_destination_chain, is_invalid_source_address, is_invalid_contract_address, is_invalid_payload_hash, is_invalid_symbol, is_invalid_amount, command_id, execute_data } = { ...data }
  const { chain, destination_chain_type } = { ...call }
  const { sender, destinationContractAddress, payloadHash, payload, symbol } = { ...call?.returnValues }
  let { destinationChain, messageId } = { ...call?.returnValues }
  let { commandId, sourceChain, amount } = { ...approved?.returnValues }
  messageId = messageId || (call?.transactionHash && typeof call._logIndex === 'number' ? `${call.transactionHash}-${call._logIndex}` : null)
  commandId = commandId || command_id
  sourceChain = sourceChain || getChainData(chain, chains_data)?.chain_name || chain
  destinationChain = destinationChain || getChainData(approved?.chain, chains_data)?.chain_name || approved?.chain
  amount = amount || call?.returnValues?.amount
  const { addresses } = { ...getAssetData(symbol, assets_data) }
  const destinationSymbol = approved?.returnValues?.symbol || addresses?.[destinationChain?.toLowerCase()]?.symbol || symbol
  const version = destination_chain_type === 'cosmos' && payload ? toBigNumber(payload.substring(0, 10)) : undefined

  const render = ({ key, title, value, invalid, className = '' }) => (
    <div key={key} className={`space-y-2 ${className}`}>
      <div className="flex items-center">
        <span className="text-base font-semibold mr-2">
          {title}
        </span>
        {invalid && (
          <span className="text-red-400 dark:text-red-500 font-medium">
            (invalid)
          </span>
        )}
      </div>
      <div className="text-xs lg:text-base">
        <div className="flex items-start">
          <div className="w-full bg-slate-50 dark:bg-slate-900 break-all rounded text-slate-400 dark:text-slate-500 mr-2 py-3 px-4">
            {ellipse(value, 256)}
          </div>
          <div className="mt-3">
            <Copy size={20} value={value} />
          </div>
        </div>
      </div>
    </div>
  )

  const values = toArray([
    { title: 'messageId', value: messageId, className: 'sm:col-span-2' },
    { title: 'commandId', value: commandId, className: 'sm:col-span-2' },
    { title: 'sourceChain', value: sourceChain },
    { title: 'destinationChain', value: destinationChain, invalid: is_invalid_destination_chain },
    { title: 'sourceAddress', value: sender, invalid: is_invalid_source_address },
    { title: 'destinationContractAddress', value: destinationContractAddress, invalid: is_invalid_contract_address },
    { title: 'payloadHash', value: payloadHash, invalid: is_invalid_payload_hash, className: 'sm:col-span-2' },
    { title: `payload${version ? ` (Version: ${version})` : ''}`, value: payload, className: 'sm:col-span-2' },
    { title: 'sourceSymbol', value: symbol, invalid: is_invalid_symbol },
    { title: 'destinationSymbol', value: destinationSymbol },
    { title: 'amount', value: amount, invalid: is_invalid_amount },
    approved && { title: 'Execute Data', value: execute_data, className: 'sm:col-span-2' },
  ])

  return data && (
    <div className="max-w-6xl grid sm:grid-cols-2 gap-2 sm:gap-4 mt-4 sm:mt-6 mx-auto">
      {values.filter(v => v.value).map((v, i) => render({ ...v, key: i }))}
    </div>
  )
}