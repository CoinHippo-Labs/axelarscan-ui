import { bech32 } from 'bech32'
import { tmhash } from 'tendermint/lib/hash'
import createHash from 'create-hash'

export const base64ToHex = s => {
  s = typeof s === 'string' ? s : ''
  const raw = atob(s)

  let result = ''

  for (let i = 0; i < raw.length; i++) {
    const hex = raw.charCodeAt(i).toString(16)

    result = `${result}${hex.length === 2 ? '' : '0'}${hex}`
  }

  return result.toUpperCase()
}

export const hexToBech32 = (address, prefix) => bech32.encode(prefix, bech32.toWords(Buffer.from(address, 'hex')))

export const base64ToBech32 = (address, prefix) => hexToBech32(base64ToHex(address), prefix)

export const bech32ToBech32 = (address, prefix) => bech32.encode(prefix, bech32.decode(address).words)

export const delegatorAddress = address => bech32ToBech32(address, process.env.NEXT_PUBLIC_PREFIX_ACCOUNT)

export const pubKeyToBech32 = (pubKey, prefix) => hexToBech32(tmhash(Buffer.from(pubKey, 'base64')).slice(0, 20).toString('hex').toUpperCase(), prefix)

const sha256 = key => createHash('sha256').update(Buffer.from(key, 'base64')).digest()

const ripemd160 = key => createHash('ripemd160').update(Buffer.from(key, 'hex')).digest()

export const pubKeyToBech32secp256k1 = (pubKey, prefix) => bech32.encode(prefix, bech32.toWords(Buffer.from(ripemd160(sha256(pubKey)), 'hex')))