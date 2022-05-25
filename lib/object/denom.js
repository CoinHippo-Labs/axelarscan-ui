import { BigNumber, utils } from 'ethers'

export const fee_denom = 'uaxl'
export const getDenom = (denom, denoms) => denoms?.find(d => [d?.id?.toLowerCase()].concat(Array.isArray(d?.ibc) ? d.ibc.map(ibc => ibc?.ibc_denom?.toLowerCase()) : d?.ibc?.toLowerCase()).includes(denom?.toLowerCase()))
export const denom_manager = {
  id: (denom, denoms) => getDenom(denom, denoms)?.id || denom,
  symbol: (denom, denoms) => getDenom(denom, denoms)?.symbol || denom,
  name: (denom, denoms) => getDenom(denom, denoms)?.name || denom,
  image: (denom, denoms) => getDenom(denom, denoms)?.image,
  amount: (value, denom, denoms, chain_id) => {
    const denom_data = getDenom(denom, denoms)
    const decimals = denom_data?.contracts?.find(c => c?.chain_id === chain_id)?.decimals ||
      denom_data?.ibc?.find(i => i?.chain_id === chain_id)?.decimals ||
      denom_data?.decimals || 6
    return Number(utils.formatUnits(BigNumber.from((!isNaN(value) ? value : 0).toString()), decimals))
  },
}