import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import StackGrid from 'react-stack-grid'

import AddToken from '../add-token'
import Image from '../image'
import Copy from '../copy'
import { ellipse } from '../../lib/utils'

export default () => {
  const { evm_chains, assets } = useSelector(state => ({ evm_chains: state.evm_chains, assets: state.assets }), shallowEqual)
  const { evm_chains_data } = { ...evm_chains }
  const { assets_data } = { ...assets }

  const [timer, setTimer] = useState(null)

  useEffect(() => {
    const run = async () => setTimer(moment().unix())
    if (!timer) {
      run()
    }
    const interval = setInterval(() => run(), 15 * 1000)
    return () => clearInterval(interval)
  }, [timer])

  const staging = process.env.NEXT_PUBLIC_SITE_URL?.includes('staging')

  const chainAssetsComponent = evm_chains_data?.filter(c => c).map((c, i) => (
    <div
      key={i}
      className="rounded-lg shadow dark:shadow-slate-500 space-y-3 p-4"
    >
      <div className="flex items-center space-x-1.5">
        {c.image && (
          <Image
            src={c.image}
            alt=""
            className="w-5 h-5 rounded-full"
          />
        )}
        <span className="font-bold">
          {c.name}
        </span>
      </div>
      <div className="space-y-2">
        {assets_data?.filter(a => (!a?.is_staging || staging) && a?.contracts?.find(_c => _c.chain_id === c.chain_id)).map((a, j) => {
          const contract = a.contracts.find(_c => _c.chain_id === c.chain_id)
          const token_data = {
            ...a,
            ...contract,
          }
          const { image, contract_address, symbol } = { ...token_data }
          return (
            <div key={j} className="flex items-start justify-between">
              <div className="flex items-start space-x-1.5">
                {image && (
                  <Image
                    src={image}
                    alt=""
                    className="w-5 h-5 bg-white rounded-full"
                  />
                )}
                <div className="flex flex-col">
                  <span className="text-slate-600 dark:text-white text-xs font-bold">
                    {symbol}
                  </span>
                  {contract_address && (
                    <div className="flex items-center space-x-1">
                      <Copy
                        value={contract_address}
                        title={<span className="cursor-pointer text-slate-400 dark:text-slate-600 text-xs font-medium">
                          {ellipse(contract_address, 8)}
                        </span>}
                      />
                    </div>
                  )}
                </div>
              </div>
              <AddToken token_data={token_data} />
            </div>
          )
        })}
      </div>
    </div>
  ))

  return (
    <div className="mx-auto pt-2 pb-6">
      <StackGrid
        columnWidth={267}
        gutterWidth={16}
        gutterHeight={16}
        className="hidden sm:block"
      >
        {chainAssetsComponent}
      </StackGrid>
      <div className="block sm:hidden space-y-3">
        {chainAssetsComponent}
      </div>
    </div>
  )
}