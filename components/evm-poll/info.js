import { useSelector, shallowEqual } from 'react-redux'
import moment from 'moment'
import { ProgressBar } from 'react-loader-spinner'
import { BiCheckCircle, BiXCircle } from 'react-icons/bi'
import { HiOutlineClock } from 'react-icons/hi'

import Image from '../image'
import Copy from '../copy'
import { getChain, chainName } from '../../lib/object/chain'
import { getAsset, assetManager } from '../../lib/object/asset'
import { number_format, name, ellipse, to_json, loader_color } from '../../lib/utils'

export default (
  {
    data,
  },
) => {
  const {
    preferences,
    evm_chains,
    assets,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        evm_chains: state.evm_chains,
        assets: state.assets,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    evm_chains_data,
  } = { ...evm_chains }
  const {
    assets_data,
  } = { ...assets }

  const {
    id,
    created_at,
    updated_at,
    sender_chain,
    transaction_id,
    transfer_id,
    deposit_address,
    confirmation,
    failed,
    success,
    event,
    participants,
    confirmation_events,
    votes,
  } = { ...data }
  const {
    ms,
  } = { ...created_at }

  const chain_data =
    getChain(
      sender_chain,
      evm_chains_data,
    )
  const {
    chain_id,
    image,
    explorer,
  } = { ...chain_data }
  const {
    url,
    transaction_path,
  } = { ...explorer }

  const status =
    success ?
      'completed' :
      failed ?
        'failed' :
        confirmation ||
        (votes || [])
          .findIndex(v =>
            v?.confirmed
          ) > -1 ?
          'confirmed' :
          'pending'

  const _url =
    [
      'operator',
      'token_deployed',
    ].findIndex(s =>
      (event || '')
        .toLowerCase()
        .includes(s)
    ) > -1 ?
      `${url}${transaction_path?.replace('{tx}', transaction_id)}` :
      `/${
        event?.includes('token_sent') ?
          'transfer' :
          event?.includes('contract_call') ||
          !(
            event?.includes('transfer') ||
            deposit_address
          ) ?
            'gmp' :
            'transfer'
      }/${
        transaction_id ||
        (
          transfer_id ?
            `?transfer_id=${transfer_id}` :
            ''
        )
      }`

  const rowClassName = 'flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 space-x-0 md:space-x-2'
  const titleClassName = 'w-40 lg:w-64 tracking-wider text-slate-600 dark:text-slate-300 text-sm lg:text-base font-medium'

  return (
    <div className="bg-slate-100 dark:bg-slate-900 bg-opacity-75 dark:bg-opacity-75 w-fit flex flex-col rounded-lg space-y-4 py-6 px-5">
      <div className={rowClassName}>
        <span className={titleClassName}>
          Poll ID:
        </span>
        {data ?
          id &&
          (
            <Copy
              size={20}
              value={id}
              title={<span className="cursor-pointer break-all text-black dark:text-white text-sm lg:text-base font-medium">
                {ellipse(
                  id,
                  16,
                )}
              </span>}
            />
          ) :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Chain:
        </span>
        {data ?
          sender_chain &&
          (
            <div className="h-6 flex items-center space-x-2">
              {chain_data ?
                <>
                  {
                    image &&
                    (
                      <Image
                        src={image}
                        className="w-6 h-6 rounded-full"
                      />
                    )
                  }
                  <span className="text-base font-semibold">
                    {chainName(chain_data)}
                  </span>
                </> :
                <span className="font-medium">
                  {name(sender_chain)}
                </span>
              }
            </div>
          ) :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      {
        (
          !data ||
          confirmation_events?.length > 0 ||
          event
        ) &&
        (
          <div className={rowClassName}>
            <span className={titleClassName}>
              Event:
            </span>
            {data ?
              confirmation_events?.length > 0 ?
                <div className="flex flex-col space-y-1">
                  {confirmation_events
                    .map((e, i) => {
                      const {
                        type,
                        txID,
                      } = { ...e }
                      let {
                        asset,
                        amount,
                        symbol,
                      } = { ...e }

                      const __url =
                        ![
                          'tokenConfirmation',
                        ].includes(type) &&
                        txID ?
                          `/${
                            type?.includes('TokenSent') ?
                              'transfer' :
                              type?.includes('ContractCall') ?
                                'gmp' :
                                'transfer'
                          }/${txID}` :
                          _url

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
                          _type =
                            type ||
                            value
                          break
                      }

                      asset =
                        (asset || '')
                          .split('""')
                          .join('')

                      const amount_object =
                        to_json(
                          asset
                        )

                      if (amount_object) {
                        asset = amount_object.denom
                        amount = amount_object.amount
                      }

                      const asset_data =
                        getAsset(
                          asset ||
                          symbol,
                          assets_data,
                        )
                      const {
                        id,
                        contracts,
                      } = { ...asset_data }
                      let {
                        image,
                      } = { ...asset_data }

                      const contract_data = (contracts || [])
                        .find(c =>
                          c?.chain_id === chain_id
                        )

                      symbol =
                        contract_data?.symbol ||
                        asset_data?.symbol ||
                        symbol

                      image =
                        contract_data?.image ||
                        image

                      return (
                        <a
                          key={i}
                          href={__url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-fit bg-slate-200 dark:bg-slate-800 rounded flex items-center space-x-2 -mt-0.5 py-0.5 px-2"
                        >
                          <span className="capitalize text-sm lg:text-base font-medium">
                            {name(_type)
                              .split(' ')
                              .join('')
                            }
                          </span>
                          {
                            symbol &&
                            (
                              <div className="flex items-center space-x-1">
                                {
                                  image &&
                                  (
                                    <Image
                                      src={image}
                                      className="w-4 h-4 rounded-full"
                                    />
                                  )
                                }
                                {
                                  amount &&
                                  (
                                    <span className="text-xs">
                                      {number_format(
                                        assetManager
                                          .amount(
                                            amount,
                                            id,
                                            assets_data,
                                            chain_id,
                                          ),
                                        '0,0.000',
                                      )}
                                    </span>
                                  )
                                }
                                <span className="text-xs">
                                  {symbol}
                                </span>
                              </div>
                            )
                          }
                        </a>
                      )
                    })
                  }
                </div> :
                <a
                  href={_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="max-w-min bg-slate-200 dark:bg-slate-800 rounded capitalize text-sm lg:text-base font-medium py-0.5 px-2"
                >
                  {name(event)
                    .split(' ')
                    .join('')
                  }
                </a> :
              <ProgressBar
                borderColor={loader_color(theme)}
                width="24"
                height="24"
              />
            }
          </div>
        )
      }
      <div className={rowClassName}>
        <span className={titleClassName}>
          Status:
        </span>
        {data ?
          status &&
          (
            <div className={`${['completed', 'confirmed'].includes(status) ? 'text-green-400 dark:text-green-300' : status === 'failed' ? 'text-red-500 dark:text-red-600' : 'text-blue-400 dark:text-blue-500'} flex items-center space-x-1`}>
              {[
                'completed',
                'confirmed',
              ].includes(status) ?
                <BiCheckCircle
                  size={20}
                /> :
                status === 'failed' ?
                  <BiXCircle
                    size={20}
                  /> :
                  <HiOutlineClock
                    size={20}
                  />
              }
              <span className="uppercase text-sm lg:text-base font-semibold">
                {status}
              </span>
            </div>
          ) :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          EVM Transaction ID:
        </span>
        {data ?
          transaction_id &&
          (
            <div className="h-6 flex items-center space-x-1">
              {url ?
                <>
                  <a
                    href={`${url}${transaction_path?.replace('{tx}', transaction_id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                  >
                    {ellipse(
                      transaction_id,
                      16,
                    )}
                  </a>
                  <Copy
                    size={20}
                    value={transaction_id}
                  />
                </> :
                <Copy
                  size={20}
                  value={transaction_id}
                  title={<span className="cursor-pointer break-all text-slate-400 dark:text-slate-200 font-medium">
                    {ellipse(
                      transaction_id,
                      12,
                    )}
                  </span>}
                />
              }
            </div>
          ) :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      {
        transfer_id &&
        (
          <div className={rowClassName}>
            <span className={titleClassName}>
              Transfer ID:
            </span>
            <div className="flex items-center space-x-1">
              <a
                href={_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
              >
                {transfer_id}
              </a>
              <Copy
                size={20}
                value={transfer_id}
              />
            </div>
          </div>
        )
      }
      {
        deposit_address &&
        (
          <div className={rowClassName}>
            <span className={titleClassName}>
              Deposit Address:
            </span>
            <div className="flex items-center space-x-1">
              <a
                href={`/account/${deposit_address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
              >
                {ellipse(
                  deposit_address,
                  12,
                )}
              </a>
              <Copy
                size={20}
                value={deposit_address}
              />
            </div>
          </div>
        )
      }
      <div className={rowClassName}>
        <span className={titleClassName}>
          Created:
        </span>
        {data ?
          ms &&
          (
            <span className="whitespace-nowrap text-slate-400 dark:text-slate-600 text-sm lg:text-base font-normal">
              {
                moment(ms)
                  .fromNow()
              } ({
                moment(ms)
                  .format('MMM D, YYYY h:mm:ss A')
              })
            </span>
          ) :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      {
        updated_at?.ms &&
        updated_at.ms > ms &&
        (
          <div className={rowClassName}>
            <span className={titleClassName}>
              Updated:
            </span>
            {data ?
              updated_at?.ms &&
              (
                <span className="whitespace-nowrap text-slate-400 dark:text-slate-600 text-sm lg:text-base font-normal">
                  {
                    moment(updated_at.ms)
                      .fromNow()
                  } ({
                    moment(updated_at.ms)
                      .format('MMM D, YYYY h:mm:ss A')
                  })
                </span>
              ) :
              <ProgressBar
                borderColor={loader_color(theme)}
                width="24"
                height="24"
              />
            }
          </div>
        )
      }
      {
        participants &&
        (
          <div className={rowClassName}>
            <span className={titleClassName}>
              Participants:
            </span>
            <div className="h-6 flex items-center text-base font-medium">
              {number_format(
                participants.length,
                '0,0',
              )}
            </div>
          </div>
        )
      }
    </div>
  )
}