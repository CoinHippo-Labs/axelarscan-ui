import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Card, CardBody, CardFooter, Chip, Tooltip } from '@material-tailwind/react'
import _ from 'lodash'
import { BiLinkExternal } from 'react-icons/bi'

import Image from '../image'
import AddMetamask from '../metamask/add-button'
import ValueBox from '../value-box'
import { getIBCDenomBase64 } from '../../lib/ibc-denom'
import { toArray } from '../../lib/utils'

const NUM_CHAINS_TRUNCATE = 6

export default (
  {
    data,
    focusId,
    focus,
  },
) => {
  const { chains } = useSelector(state => ({ chains: state.chains }), shallowEqual)
  const { chains_data } = { ...chains }

  const [seeMoreChain, setSeeMoreChain] = useState(false)
  const [chainSelected, setChainSelected] = useState(null)

  useEffect(
    () => {
      if (focusId !== denom) {
        setSeeMoreChain(false)
      }
    },
    [focusId],
  )

  const {
    denom,
    denoms,
    native_chain,
    name,
    symbol,
    decimals,
    image,
    coingecko_id,
  } = { ...data }
  let { addresses } = { ...data }
  const { id, explorer, chain_type } = { ...(focusId === denom ? toArray(chains_data).find(c => c.id === chainSelected) : null) }
  const { url, contract_path, asset_path } = { ...explorer }
  addresses = toArray(_.uniqBy(_.concat({ chain: native_chain, ...addresses?.[native_chain] }, Object.entries({ ...addresses }).map(([k, v]) => { return { chain: k, ...v } } )), 'chain'))
  const token_data = addresses.find(a => a.chain === id)
  const { address, ibc_denom } = { ...token_data }
  const token_symbol = token_data?.symbol || symbol

  return (
    <Card key={denom} className="card">
      <CardBody>
        <div className="flex items-start justify-between">
          <Image
            src={image}
            width={52}
            height={52}
            className="3xl:w-16 3xl:h-16 p-1 -m-1"
          />
          <div className="flex items-center space-x-2">
            {coingecko_id && (
              <Tooltip content="Token Info">
                <a
                  href={`https://coinhippo.io/token/${coingecko_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 dark:text-blue-500"
                >
                  <BiLinkExternal size={24} />
                </a>
              </Tooltip>
            )}
          </div>
        </div>
        <div className="title flex flex-wrap items-center">
          <span className="mr-2">
            {name}
          </span>
          <span className="text-slate-400 dark:text-slate-500 text-base font-normal">
            {symbol}
          </span>
        </div>
        <div className="description">
          <div className="space-y-4">
            <div className="space-y-0.5">
              <span className="text-sm text-slate-400 dark:text-slate-500">
                Interchain Tokens
              </span>
              <div className="flex flex-wrap items-center">
                {_.slice(addresses, 0, focusId === denom && seeMoreChain ? addresses.length : NUM_CHAINS_TRUNCATE).map((a, i) => {
                  const { chain, address, ibc_denom, symbol } = { ...a }
                  const { name, image } = { ...toArray(chains_data).find(c => c.id === chain) }
                  return (
                    <div key={i} className="mb-1.5 mr-1.5">
                      <Tooltip content={`${name}${chain === native_chain ? ' (Native Chain)' : ''}`}>
                        <div
                          onClick={
                            () => {
                              setChainSelected(chain === chainSelected ? null : chain)
                              if (focus) {
                                focus(denom)
                              }
                            }
                          }
                          className="cursor-pointer"
                        >
                          <Image
                            src={image}
                            width={24}
                            height={24}
                            className={`3xl:w-8 3xl:h-8 rounded-full ${focusId === denom && chain === chainSelected ? 'border-2 border-blue-400 dark:border-white' : chain === native_chain ? 'border-2 border-yellow-500 dark:border-yellow-400' : ''}`}
                          />
                        </div>
                      </Tooltip>
                    </div>
                  )
                })}
                {addresses.length > NUM_CHAINS_TRUNCATE && (
                  <button
                    onClick={
                      () => {
                        setSeeMoreChain(!seeMoreChain)
                        if (focus) {
                          focus(denom)
                        }
                      }
                    }
                    className="bg-slate-50 dark:bg-slate-800 rounded text-blue-400 dark:text-white text-xs 3xl:text-sm font-medium mb-1.5 py-1 3xl:py-1.5 px-1.5 3xl:px-2.5"
                  >
                    {seeMoreChain ? 'See Less' : `+${addresses.length - NUM_CHAINS_TRUNCATE} More`}
                  </button>
                )}
              </div>
            </div>
            {id && (
              <div className="space-y-1">
                <div className="flex items-center justify-between space-x-2">
                  <Chip value={id} className="chip font-medium" />
                  {chain_type === 'evm' && (
                    <AddMetamask chain={id} asset={denom} />
                  )}
                </div>
                {address && (
                  <ValueBox
                    url={url && `${url}${contract_path?.replace('{address}', address)}`}
                    title="Token Contract"
                    value={address}
                  />
                )}
                {ibc_denom && (
                  <ValueBox
                    url={url && asset_path && `${url}${asset_path.replace('{ibc_denom}', getIBCDenomBase64(ibc_denom))}`}
                    title="IBC Denom"
                    value={ibc_denom}
                    ellipseLength={9}
                    ellipsePrefix="ibc/"
                  />
                )}
                {token_symbol && (
                  <ValueBox
                    url={url && address ? `${url}${contract_path?.replace('{address}', address)}` : asset_path && ibc_denom ? `${url}${asset_path.replace('{ibc_denom}', getIBCDenomBase64(ibc_denom))}` : null}
                    title="Symbol"
                    value={token_symbol}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </CardBody>
      <CardFooter className="card-footer">
        <div className="flex flex-wrap items-center">
          {toArray(_.concat(denom, denoms)).map((d, i) =>
            <div key={i} className="mt-2 mr-2">
              <Tooltip content="Denom">
                <Chip
                  color="amber"
                  value={d}
                  className="chip normal-case font-medium"
                />
              </Tooltip>
            </div>
          )}
          {decimals && (
            <Chip
              color="teal"
              value={`Decimals: ${decimals}`}
              className="chip normal-case font-medium mt-2 mr-2"
            />
          )}
        </div>
      </CardFooter>
    </Card>
  )
}