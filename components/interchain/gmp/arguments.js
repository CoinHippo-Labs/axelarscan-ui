import { useSelector, shallowEqual } from 'react-redux'

import Copy from '../../copy'
import { getChainData, getAssetData } from '../../../lib/config'
import { ellipse } from '../../../lib/utils'

export default ({ data }) => {
  const { chains, assets } = useSelector(state => ({ chains: state.chains, assets: state.assets }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }

  const { call, approved, command_id, execute_data } = { ...data }
  const { chain } = { ...call }
  const { sender, destinationContractAddress, payloadHash, payload, symbol, messageId } = { ...call?.returnValues }
  let { destinationChain } = { ...call?.returnValues }
  let { commandId, sourceChain, amount } = { ...approved?.returnValues }
  commandId = commandId || command_id
  sourceChain = sourceChain || getChainData(chain, chains_data)?.chain_name || chain
  destinationChain = destinationChain || getChainData(approved?.chain, chains_data)?.chain_name || approved?.chain
  amount = amount || call?.returnValues?.amount
  const { addresses } = { ...getAssetData(symbol, assets_data) }
  const destinationSymbol = approved?.returnValues?.symbol || addresses?.[destinationChain?.toLowerCase()]?.symbol || symbol

  const render = ({ key, title, value, className = '' }) => (
    <div key={key} className={`space-y-2 ${className}`}>
      <span className="text-base font-semibold">
        {title}
      </span>
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

  const values = [
    { title: 'messageId', value: messageId, className: 'sm:col-span-2' },
    { title: 'commandId', value: commandId, className: 'sm:col-span-2' },
    { title: 'sourceChain', value: sourceChain },
    { title: 'destinationChain', value: destinationChain },
    { title: 'sourceAddress', value: sender },
    { title: 'destinationContractAddress', value: destinationContractAddress },
    { title: 'payloadHash', value: payloadHash, className: 'sm:col-span-2' },
    { title: 'payload', value: payload, className: 'sm:col-span-2' },
    { title: 'sourceSymbol', value: symbol },
    { title: 'destinationSymbol', value: destinationSymbol },
    { title: 'amount', value: amount },
    { title: 'Execute Data', value: execute_data, className: 'sm:col-span-2' },
  ]

  return data && (
    <div className="max-w-6xl grid sm:grid-cols-2 gap-2 sm:gap-4 mt-4 sm:mt-6 mx-auto">
      {values.filter(v => v.value).map((v, i) => render({ ...v, key: i }))}
    </div>
  )
}