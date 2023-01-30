import _ from 'lodash'
import { BigNumber, utils } from 'ethers'

export const native_asset_id = 'uaxl'

export const getAsset = (
  id,
  assets_data,
) =>
  id &&
  (assets_data || [])
    .find(a =>
      _.concat(
        a?.id?.toLowerCase(),
        a?.symbol?.toLowerCase(),
        Array.isArray(a?.ibc) ?
          a.ibc.map(i =>
            i?.ibc_denom?.toLowerCase()
          ) :
          a?.ibc?.toLowerCase(),
      )
      .includes(
        id?.toLowerCase()
      )
    )

export const assetManager = {
  id: (
    id,
    assets_data,
  ) =>
    getAsset(
      id,
      assets_data,
    )?.id ||
    id,
  symbol: (
    id,
    assets_data,
  ) =>
    getAsset(
      id,
      assets_data,
    )?.symbol ||
    id,
  name: (
    id,
    assets_data,
  ) =>
    getAsset(
      id,
      assets_data,
    )?.name ||
    id,
  image: (
    id,
    assets_data,
  ) =>
    getAsset(
      id,
      assets_data,
    )?.image,
  amount: (
    amount,
    id,
    assets_data,
    chain_id,
  ) => {
    const asset_data =
      getAsset(
        id,
        assets_data,
      )

    const {
      contracts,
      ibc,
    } = { ...asset_data }
    let {
      decimals,
    } = { ...asset_data }

    decimals =
      (contracts || [])
        .find(c =>
          c?.chain_id === chain_id
        )?.decimals ||
      (ibc || [])
        .find(i =>
          i?.chain_id === chain_id
        )?.decimals ||
      decimals ||
      6

    if (typeof amount === 'string') {
      let _amount = ''

      for (const c of amount.split('')) {
        if (!isNaN(c)) {
          _amount = `${_amount}${c}`
        }
        else {
          break
        }
      }

      amount = _amount
    }

    const number_string =
      (
        !isNaN(amount) ?
          BigInt(amount) :
          0
      )
      .toString()

    const integer_number =
      number_string.indexOf('.') > -1 ?
        number_string
          .substring(
            0,
            number_string.indexOf('.'),
          ) :
        (
          number_string ||
          '0'
        )

    const decimals_number =
      number_string.indexOf('.') > -1 ?
        number_string
          .substring(
            number_string.indexOf('.') + 1,
          ) :
        '0'

    try {
      return (
        Number(
          utils.formatUnits(
            BigNumber.from(
              integer_number
            ),
            decimals,
          )
        ) +
        Number(
          utils.formatUnits(
            BigNumber.from(
              decimals_number
            ),
            decimals + decimals_number.length,
          )
        )
      )
    }
    catch (error) {
      return number_string
    }    
  },
}