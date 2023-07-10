import { utils } from 'ethers'
const { /*decodeBase64, */hexlify, toUtf8String } = { ...utils }
const decodeBase64 = utils.base64.decode

export const base64ToHash = string => {
  try {
    return hexlify(decodeBase64(string))
  } catch (error) {
    return string
  }
}

export const base64ToString = string => {
  try {
    return toUtf8String(decodeBase64(string))
  } catch (error) {
    return string
  }
}