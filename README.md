# Axelarscan: a block explorer for the Axelar network
This is the frontend of [Axelarscan](https://axelarscan.io), which displays the block information of the Axelar network and network statistics obtained from [Axelarscan API](https://github.com/CoinHippo-Labs/axelarscan-api). The project is implemented based on [Next.js](https://github.com/vercel/next.js).

<img width="1440" alt="home" src="https://user-images.githubusercontent.com/87146398/174470447-7ac7b896-b0d2-40f6-82ec-ad38d4d1fc8b.png">

## Pages
- [Home](https://axelarscan.io) - The overview information of the network, including the current consensus state, the latest blocks produced, the latest transactions, etc.
- [Validators](https://axelarscan.io/validators) - Lists of the network validators and their statistics.   
- [Polls](https://axelarscan.io/evm-polls) - List of the EVM polls.
- [Blocks](https://axelarscan.io/blocks) - List of the latest blocks produced in the network.
- [TX](https://axelarscan.io/transactions) - List of the latest transactions in. the network.
- [Transfers](https://axelarscan.io/transfers) displays the statistics of cross-chain transfers happening through the Axelar network.
- [Batches](https://axelarscan.io/batches) displays a list of the recent command batches that are going to (or have been submitted) to EVM chains.
- [Assets](https://axelarscan.io/assets) - List of the assets and chains supported on the Axelar network

### Prerequisites
node >= 16.0.0

## Run on [localhost:3000](http://localhost:3000)
```bash
yarn
yarn dev
```

## License
[Next.js](https://github.com/vercel/next.js/blob/canary/license.md) is MIT licensed
