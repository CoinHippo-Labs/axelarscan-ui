import { BigNumber, utils } from 'ethers'

export const fee_denom = 'uaxl'
export const getDenom = (denom, denoms) => denom && denoms?.find(d => [d?.id?.toLowerCase()].concat(Array.isArray(d?.ibc) ? d.ibc.map(ibc => ibc?.ibc_denom?.toLowerCase()) : d?.ibc?.toLowerCase()).includes(denom?.toLowerCase()))
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
    if (typeof value === 'string') {
      const value_splited = value.split('')
      let _value = ''
      for (let i = 0; i < value_splited.length; i++) {
        const c = value_splited[i]
        if (!isNaN(c)) {
          _value = `${_value}${c}`
        }
        else {
          break
        }
      }
      value = _value
    }
    const number_string = (!isNaN(value) ? value : 0).toString()
    const integer_number = number_string.indexOf('.') > -1 ? number_string.substring(0, number_string.indexOf('.')) : number_string
    const decimals_number = number_string.indexOf('.') > -1 ? number_string.substring(number_string.indexOf('.') + 1) : '0'
    return Number(utils.formatUnits(BigNumber.from(integer_number), decimals)) +
      Number(utils.formatUnits(BigNumber.from(decimals_number), decimals + decimals_number.length))
  },
}