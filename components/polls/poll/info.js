import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import { Chip, Tooltip } from '@material-tailwind/react'
import moment from 'moment'

import Spinner from '../../spinner'
import NumberDisplay from '../../number'
import Image from '../../image'
import Copy from '../../copy'
import { getChainData, getAssetData } from '../../../lib/config'
import { formatUnits } from '../../../lib/number'
import { split, toArray, includesStringList, getTitle, ellipse, toJson } from '../../../lib/utils'

const TIME_FORMAT = 'MMM D, YYYY h:mm:ss A'

export default ({ data }) => {
  const { chains, assets } = useSelector(state => ({ chains: state.chains, assets: state.assets }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }

  const {
    id,
    initiated_txhash,
    sender_chain,
    transaction_id,
    transfer_id,
    deposit_address,
    event,
    success,
    failed,
    confirmation,
    participants,
    confirmation_events,
    votes,
    created_at,
    updated_at,
  } = { ...data }
  const { name, image, explorer } = { ...getChainData(sender_chain, chains_data) }
  const { url, transaction_path } = { ...explorer }

  const status = success ? 'completed' : failed ? 'failed' : confirmation || toArray(votes).findIndex(v => v.confirmed) > -1 ? 'confirmed' : 'pending'
  const _url = includesStringList(event, ['operator', 'token_deployed']) ? `${url}${transaction_path?.replace('{tx}', transaction_id)}` : `/${includesStringList(event, ['contract_call']) || !(includesStringList(event, ['transfer']) || deposit_address) ? 'gmp' : 'transfer'}/${transaction_id ? transaction_id : transfer_id ? `?transfer_id=${transfer_id}` : ''}`

  const rowClassName = 'flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2'
  const titleClassName = 'w-40 lg:w-64 tracking-wider text-slate-600 dark:text-slate-400 text-sm lg:text-base font-semibold'

  return (
    <div className="bg-slate-50 dark:bg-slate-900 w-fit flex flex-col rounded-lg space-y-4 p-6">
      <div className={rowClassName}>
        <span className={titleClassName}>Poll ID:</span>
        {data ?
          id && (
            <Copy
              size={20}
              value={id}
              title={
                <span className="text-sm lg:text-base font-semibold">
                  {ellipse(id, 16)}
                </span>
              }
            />
          ) :
          <Spinner name="ProgressBar" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>Chain:</span>
        {data ?
          sender_chain && (
            <Tooltip content={name}>
              <div className="w-fit">
                <Image
                  src={image}
                  width={24}
                  height={24}
                  className="3xl:w-8 3xl:h-8 rounded-full"
                />
              </div>
            </Tooltip>
          ) :
          <Spinner name="ProgressBar" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>Event:</span>
        {data ?
          toArray(confirmation_events).length > 0 ?
            <div className="flex flex-col space-y-1">
              {toArray(confirmation_events).map((e, i) => {
                const { type, txID } = { ...e }
                let { asset, symbol, amount } = { ...e }

                let _type
                switch (type) {
                  case 'depositConfirmation':
                    _type = 'Transfer'
                    break
                  case 'ContractCallApproved':
                    _type = 'ContractCall'
                    break
                  case 'ContractCallApprovedWithMint':
                  case 'ContractCallWithMintApproved':
                    _type = 'ContractCallWithToken'
                    break
                  default:
                    _type = type || event
                    break
                }

                const event_url = _type !== 'tokenConfirmation' && txID ? `/${includesStringList(_type, ['ContractCall']) ? 'gmp' : 'transfer'}/${txID}` : _url
                const amountObject = toJson(asset)
                if (amountObject) {
                  asset = amountObject.denom
                  amount = amountObject.amount
                }

                const asset_data = getAssetData(asset || symbol, assets_data)
                const { decimals, addresses } = { ...asset_data }
                let { image } = { ...asset_data }

                const token_data = addresses?.[id]
                symbol = token_data?.symbol || asset_data?.symbol || symbol
                image = token_data?.image || image

                return (
                  <a
                    key={i}
                    href={event_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-fit min-w-max bg-slate-100 dark:bg-slate-800 rounded flex items-center space-x-2 py-1 px-2"
                  >
                    <span className="capitalize text-xs font-medium">
                      {split(getTitle(_type), 'normal', ' ').join('')}
                    </span>
                    {symbol && (
                      <div className="flex items-center space-x-1">
                        {image && (
                          <Image
                            src={image}
                            width={20}
                            height={20}
                          />
                        )}
                        {!!(amount) && decimals && (
                          <NumberDisplay
                            value={formatUnits(amount, decimals)}
                            format="0,0.000000"
                            className="text-xs font-semibold"
                          />
                        )}
                        <span className="text-xs font-semibold">
                          {symbol}
                        </span>
                      </div>
                    )}
                  </a>
                )
              })}
            </div> :
            event && (
              <a
                href={_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-fit min-w-max bg-slate-100 dark:bg-slate-800 rounded capitalize text-xs font-medium py-1 px-2"
              >
                {split(getTitle(event), 'normal', ' ').join('')}
              </a>
            ) :
          <Spinner name="ProgressBar" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>Status:</span>
        {data ?
          status && (
            <Chip
              color={['completed', 'confirmed'].includes(status) ? 'green' : status === 'failed' ? 'red' : 'blue'}
              value={status}
              className="chip capitalize text-xs font-medium py-1 px-2"
            />
          ) :
          <Spinner name="ProgressBar" />
        }
      </div>
      {initiated_txhash && (
        <div className={rowClassName}>
          <span className={titleClassName}>Initiated TxHash:</span>
          <div className="flex items-center space-x-1">
            <Link
              href={`/tx/${initiated_txhash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 dark:text-blue-500 font-semibold"
            >
              {ellipse(initiated_txhash, 12)}
            </Link>
            <Copy size={20} value={initiated_txhash} />
          </div>
        </div>
      )}
      <div className={rowClassName}>
        <span className={titleClassName}>Transaction ID:</span>
        {data ?
          url ?
            <div className="flex items-center space-x-1">
              <a
                href={`${url}${transaction_path?.replace('{tx}', transaction_id)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 dark:text-blue-500 font-semibold"
              >
                {ellipse(transaction_id, 12)}
              </a>
              <Copy size={20} value={transaction_id} />
            </div> :
            <Copy
              size={20}
              value={transaction_id}
              title={
                <span className="cursor-pointer break-all text-slate-400 dark:text-slate-500 font-semibold">
                  {ellipse(transaction_id, 12)}
                </span>
              }
            /> :
          <Spinner name="ProgressBar" />
        }
      </div>
      {transfer_id && (
        <div className={rowClassName}>
          <span className={titleClassName}>Transfer ID:</span>
          <div className="flex items-center space-x-1">
            <a
              href={_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 dark:text-blue-500 font-medium"
            >
              {transfer_id}
            </a>
            <Copy size={20} value={transfer_id} />
          </div>
        </div>
      )}
      {deposit_address && (
        <div className={rowClassName}>
          <span className={titleClassName}>Deposit Address:</span>
          <div className="flex items-center space-x-1">
            <Link
              href={`/account/${deposit_address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 dark:text-blue-500 font-medium"
            >
              {ellipse(deposit_address, 12)}
            </Link>
            <Copy size={20} value={deposit_address} />
          </div>
        </div>
      )}
      <div className={rowClassName}>
        <span className={titleClassName}>Created:</span>
        {data ?
          created_at?.ms && (
            <span className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-sm lg:text-base font-normal">
              {moment(created_at.ms).fromNow()} ({moment(created_at.ms).format(TIME_FORMAT)})
            </span>
          ) :
          <Spinner name="ProgressBar" />
        }
      </div>
      {updated_at?.ms > created_at?.ms && (
        <div className={rowClassName}>
          <span className={titleClassName}>Updated:</span>
          <span className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-sm lg:text-base font-normal">
            {moment(updated_at.ms).fromNow()} ({moment(updated_at.ms).format(TIME_FORMAT)})
          </span>
        </div>
      )}
      {participants && (
        <div className={rowClassName}>
          <span className={titleClassName}>Participants:</span>
          <NumberDisplay
            value={participants.length}
            format="0,0"
          />
        </div>
      )}
    </div>
  )
}