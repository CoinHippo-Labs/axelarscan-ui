/*
{
  id, // project id
  name, // project name
  addresses, // destination contract addresses (array || string)
  environment, // undefined for any
  customize, // async (eventData, environment = 'mainnet' || 'testnet') => { return customValues }
}
************************************************************************************************
* eventData is `call.returnValues` object return from https://docs.axelarscan.io/gmp#searchGMP *
************************************************************************************************
*/

const customs = [
  {
    id: 'squid',
    name: 'Squid',
    addresses: ['0xce16F69375520ab01377ce7B88f5BA8C48F8D666', '0xDC3D8e1Abe590BCa428a8a2FC4CfDbD1AcF57Bd9', '0x492751eC3c57141deb205eC2da8bFcb410738630', 'osmo15jw7xccxaxk30lf4xgag8f7aeg53pgkh74e39rv00xfnymldjaas2fk627', '0x481A2AAE41cd34832dDCF5A79404538bb2c02bC8', '0xc3468a191fe51815b26535ed1f82c1f79e6ec37d', 'osmo1zl9ztmwe2wcdvv9std8xn06mdaqaqm789rutmazfh3z869zcax4sv0ctqw'],
    customize: async (eventData, environment) => {
      const { destinationContractAddress, payload } = { ...eventData }
      const customValues = {}

      if (destinationContractAddress.startsWith('0x')) {
        customValues.recipientAddress = `0x${payload.length <= 130 ? payload.substring(26, 66) : payload.substring(90, 130)}`
      }

      return customValues
    },
  },
]

export default customs
