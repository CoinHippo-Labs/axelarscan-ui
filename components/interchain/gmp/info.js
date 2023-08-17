import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import { Card, CardBody, CardFooter, Stepper, Step, Tooltip } from '@material-tailwind/react'
import moment from 'moment'
import { TbGasStation, TbGasStationOff } from 'react-icons/tb'
import { RiErrorWarningLine, RiTimerFlashLine, RiTimerLine, RiArrowLeftFill, RiArrowRightFill, RiInformationLine } from 'react-icons/ri'

import Spinner from '../../spinner'
import NumberDisplay from '../../number'
import Image from '../../image'
import Copy from '../../copy'
import AccountProfile from '../../profile/account'
import ExplorerLink from '../../explorer/link'
import TimeSpent from '../../time/timeSpent'
import TimeUntil from '../../time/timeUntil'
import { getChainData, getAssetData } from '../../../lib/config'
import { formatUnits } from '../../../lib/number'
import { toArray, getTitle, ellipse, createMomentFromUnixtime, totalTimeString } from '../../../lib/utils'

const TIME_FORMAT = 'MMM D, YYYY h:mm:ss A'
const normalizeEvent = event => event?.replace('ContractCall', 'callContract')

export default ({ data, buttons }) => {
  const { chains, assets } = useSelector(state => ({ chains: state.chains, assets: state.assets }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }

  const {
    call,
    gas_paid,
    gas_paid_to_callback,
    express_executed,
    confirm,
    approved,
    executed,
    is_executed,
    error,
    refunded,
    fees,
    gas,
    is_insufficient_fee,
    not_enough_gas_to_execute,
    no_gas_remain,
    simplified_status,
    callback_data,
    origin_data,
    token_sent,
    token_deployment_initialized,
    token_deployed,
    estimated_time_spent,
  } = { ...data }
  let { amount } = { ...data }
  const { event, chain, chain_type, destination_chain_type, transactionHash, logIndex, block_timestamp, returnValues } = { ...call }
  const { destinationChain, destinationContractAddress, symbol } = { ...returnValues }
  const { from } = { ...call?.transaction }

  const source_chain_data = getChainData(chain, chains_data)
  const destination_chain_data = getChainData(destinationChain, chains_data)
  const axelar_chain_data = getChainData('axelarnet', chains_data)
  const asset_data = getAssetData(symbol, assets_data)
  const { addresses } = { ...asset_data }
  let { decimals, image } = { ...addresses?.[chain] } 
  decimals = decimals || asset_data?.decimals || 18
  image = image || asset_data?.image
  amount = amount || returnValues?.amount ? formatUnits(returnValues.amount, decimals) : undefined

  const errored = error && moment().diff(moment((error?.block_timestamp || approved?.block_timestamp || (confirm?.created_at?.ms / 1000)) * 1000), 'seconds') > 120
  const steps = toArray([
    {
      id: 'send',
      title: call ? 'Sent' : 'Send',
      status: call ? 'success' : 'pending',
      data: call,
      chain_data: source_chain_data,
    },
    {
      id: 'pay_gas',
      title: (gas_paid || gas_paid_to_callback) && !is_insufficient_fee ? 'Gas Paid' : moment().diff(moment(block_timestamp * 1000), 'seconds') < 30 ? 'Checking Gas Paid' : 'Pay Gas',
      status: gas_paid || gas_paid_to_callback ? is_insufficient_fee ? 'failed' : 'success' : 'pending',
      data: gas_paid || gas_paid_to_callback,
      chain_data: gas_paid_to_callback ? destination_chain_data : source_chain_data,
      tooltip: is_insufficient_fee ? 'Insufficient Base Fee. Please add more gas.' : '',
    },
    (express_executed || buttons?.express) && {
      id: 'express',
      title: 'Express',
      status: express_executed ? 'success' : 'pending',
      data: express_executed,
      chain_data: destination_chain_data,
    },
    chain_type !== 'cosmos' && (confirm || !approved || !(executed || is_executed || error)) && {
      id: 'confirm',
      title: confirm ? 'Confirmed' : gas_paid || gas_paid_to_callback || express_executed ? 'Waiting for Finality' : 'Confirm',
      status: confirm ? 'success' : 'pending',
      data: confirm,
      chain_data: axelar_chain_data,
      tooltip: !confirm && (gas_paid || gas_paid_to_callback || express_executed) ? `Cross-chain transactions need to be finalized on the source chain before they can be settled. This requires Axelar to wait for an approval and can take ${estimated_time_spent?.confirm ? `~${totalTimeString(0, estimated_time_spent.confirm)} on ${source_chain_data?.name || chain}` : '~30 mins depending on the chain (e.g. Ethereum, Base, Arbitrum etc.)'}` : null,
    },
    destination_chain_type !== 'cosmos' && {
      id: 'approve',
      title: approved ? 'Approved' : confirm ? 'Approving' : 'Approve',
      status: approved ? 'success' : 'pending',
      data: approved,
      chain_data: destination_chain_data,
    },
    {
      id: 'execute',
      title: executed || is_executed ? 'Executed' : errored ? 'Error' : 'Execute',
      status: executed || is_executed ? 'success' : errored ? 'failed' : 'pending',
      data: executed || is_executed || error,
      chain_data: executed?.axelarTransactionHash && !executed.transactionHash ? axelar_chain_data : destination_chain_data,
    },
    refunded?.receipt?.status && {
      id: 'refund',
      title: 'Refunded',
      status: 'success',
      data: refunded,
      chain_data: source_chain_data,
    },
  ])

  const logDisplay = chain_type === 'evm' && typeof logIndex === 'number' ? `:${logIndex}` : ''
  let extra
  let timeSpent
  let estimatedTimeSpent

  switch (simplified_status) {
    case 'received':
      if (call) {
        if (express_executed) {
          timeSpent = (
            <Tooltip key="express_executed" placement="top-start" content="Express">
              <div className="w-fit h-6 flex items-center text-green-400 dark:text-green-500 space-x-1">
                <RiTimerFlashLine size={18} />
                <TimeSpent
                  fromTime={block_timestamp}
                  toTime={express_executed.block_timestamp}
                  noTooltip={true}
                  className="font-medium"
                />
              </div>
            </Tooltip>
          )
        }
        if (executed) {
          const { source_token } = { ...fees }
          const { symbol } = { ...source_token }
          extra = gas?.gas_paid_amount > 0 && typeof gas.gas_remain_amount === 'number' && (
            <Tooltip placement="top-start" content="Gas Used">
              <div className="w-fit h-6 flex items-center font-medium space-x-1">
                <TbGasStation size={18} className="ml-0.5 -mr-0.5" />
                <NumberDisplay
                  value={gas.gas_paid_amount - gas.gas_remain_amount}
                  format="0,0.00"
                  suffix={` ${symbol}`}
                  noTooltip={true}
                />
              </div>
            </Tooltip>
          )
          timeSpent = toArray([
            timeSpent,
            <Tooltip key="executed" placement="top-start" content="Total time spent">
              <div className="w-fit h-6 flex items-center text-slate-300 dark:text-slate-600 space-x-1">
                <RiTimerLine size={18} />
                <TimeSpent
                  fromTime={block_timestamp}
                  toTime={executed.block_timestamp}
                  noTooltip={true}
                  className="font-medium"
                />
              </div>
            </Tooltip>,
          ])
        }
      }
      break
    default:
      if ((gas_paid && gas?.gas_paid_amount > 0) || gas_paid_to_callback) {
        const { express_supported, source_token } = { ...fees }
        const { symbol, gas_price } = { ...source_token }
        extra = (
          <Tooltip key="gas_paid" placement="top-start" content="Gas Deposited">
            <div className="w-fit h-6 flex items-center font-medium space-x-1">
              <TbGasStation size={18} className="ml-0.5 -mr-0.5" />
              <NumberDisplay
                value={gas_paid ? gas.gas_paid_amount : gas_paid_to_callback * gas_price}
                format="0,0.00"
                suffix={` ${symbol}`}
                noTooltip={true}
              />
            </div>
          </Tooltip>
        )
        if (estimated_time_spent && !(is_insufficient_fee || not_enough_gas_to_execute) && !error) {
          estimatedTimeSpent = (
            <Tooltip key="time_spent" placement="top-start" content="Time spent">
              <div className="w-fit h-6 flex items-center text-blue-400 dark:text-white space-x-1.5 ml-0.5">
                <Spinner name="Watch" width={14} height={14} />
                <TimeSpent
                  fromTime={block_timestamp}
                  noTooltip={true}
                  className="font-medium"
                />
              </div>
            </Tooltip>
          )
          estimatedTimeSpent = (
            <div className="flex flex-col">
              {estimatedTimeSpent}
              {toArray([
                express_supported && !(confirm || approved) && estimated_time_spent.express_execute > 0 && moment().diff(moment(block_timestamp * 1000), 'seconds') < estimated_time_spent.express_execute && (
                  <Tooltip key="expected_express" placement="top-start" content="Expected time to express">
                    <div className="w-fit h-6 flex items-center text-slate-300 dark:text-slate-600 space-x-1">
                      ~
                      <RiTimerFlashLine size={18} />
                      <TimeSpent
                        fromTime={0}
                        toTime={estimated_time_spent.express_execute}
                        noTooltip={true}
                        className="font-medium"
                      />
                    </div>
                  </Tooltip>
                ),
                estimated_time_spent.total > 0 && (
                  <Tooltip key="expected_execute" placement="top-start" content="Expected time to execute">
                    <div className="w-fit h-6 flex items-center text-slate-300 dark:text-slate-600 space-x-1">
                      ~
                      <RiTimerLine size={18} />
                      <TimeSpent
                        fromTime={0}
                        toTime={estimated_time_spent.total}
                        noTooltip={true}
                        className="font-medium"
                      />
                    </div>
                  </Tooltip>
                ),
              ])}
            </div>
          )
        }
      }
      if (not_enough_gas_to_execute) {
        extra = toArray([
          extra,
          <Tooltip key="not_enough_gas_to_execute" placement="top-start" content="Not enough gas to execute">
            <div className="w-fit flex items-center text-red-500 dark:text-red-600 font-medium space-x-1">
              <TbGasStationOff size={18} className="ml-0.5 -mr-0.5" />
              <span>Execute Gas</span>
            </div>
          </Tooltip>,
        ])
      }
      else if (is_insufficient_fee && !approved) {
        extra = toArray([
          extra,
          <Tooltip key="is_insufficient_fee" placement="top-start" content="Insufficient base fee">
            <div className="w-fit flex items-center text-red-500 dark:text-red-600 font-medium space-x-1">
              <RiErrorWarningLine size={18} />
              <span>Base Fee</span>
            </div>
          </Tooltip>,
        ])
      }
      else if (no_gas_remain && (!refunded || (refunded.receipt && !refunded.receipt.status)) && (executed || error)) {
        extra = toArray([
          extra,
          <Tooltip key="no_gas_remain" placement="top-start" content="No refund for this GMP call">
            <div className="w-fit flex items-center text-slate-300 dark:text-slate-600 font-medium space-x-1">
              <TbGasStationOff size={18} className="ml-0.5 -mr-0.5" />
              <span>Refund Gas</span>
            </div>
          </Tooltip>,
        ])
      }
      break
  }

  return (
    <Card className="card">
      <CardBody className="pb-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-8">
          <div className="order-1 flex flex-col space-y-2">
            <div className="flex items-center space-x-1">
              <Tooltip content={`${transactionHash}${logDisplay}`}>
                <span className="text-black dark:text-white font-semibold">
                  {ellipse(transactionHash, 8)}{logDisplay}
                </span>
              </Tooltip>
              {transactionHash && <Copy value={transactionHash} />}
              <ExplorerLink value={transactionHash} explorer={source_chain_data?.explorer} hasEventLog={logDisplay} />
            </div>
            <div className="flex items-center space-x-1">
              <Tooltip content="Method">
                <div className="w-fit h-6 bg-slate-50 dark:bg-slate-800 rounded flex items-center text-slate-600 dark:text-slate-200 font-medium py-1 px-2">
                  {token_sent ? 'InterchainTransfer' : token_deployment_initialized ? 'TokenDeploymentInitialized' : token_deployed ? 'TokenDeployed' : getTitle(normalizeEvent(event))}
                </div>
              </Tooltip>
              {callback_data?.call?.transactionHash && (
                <Link
                  href={`/gmp/${callback_data.call.transactionHash}${callback_data.call.chain_type === 'evm' && typeof callback_data.call.logIndex === 'number' ? `:${callback_data.call.logIndex}` : ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-6 bg-blue-400 dark:bg-blue-600 rounded flex items-center text-white font-medium py-1 px-2"
                >
                  <span>Callback</span>
                  <RiArrowRightFill size={14} className="ml-0.5 -mr-0.5" />
                </Link>
              )}
              {origin_data?.call?.transactionHash && (
                <Link
                  href={`/gmp/${origin_data.call.transactionHash}${origin_data.call.chain_type === 'evm' && typeof origin_data.call.logIndex === 'number' ? `:${origin_data.call.logIndex}` : ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-6 bg-blue-400 dark:bg-blue-600 rounded flex items-center text-white font-medium py-1 px-2"
                >
                  <RiArrowLeftFill size={14} className="-ml-0.5 mr-0.5" />
                  <span>Origin</span>
                </Link>
              )}
            </div>
            {token_sent ?
              typeof amount === 'number' && (
                <div className="h-6 flex items-center">
                  <NumberDisplay
                    value={amount}
                    format="0,0.00"
                    suffix={` ${token_sent.symbol}`}
                  />
                </div>
              ) :
              token_deployment_initialized ?
                token_deployment_initialized.tokenSymbol && (
                  <div className="h-6 flex items-center">
                    <span className="whitespace-nowrap text-sm font-semibold">
                      {token_deployment_initialized.tokenSymbol}
                    </span>
                  </div>
                ) :
                token_deployed ?
                  token_deployed.symbol && (
                    <div className="h-6 flex items-center">
                      <span className="whitespace-nowrap text-sm font-semibold">
                        {token_deployed.symbol}
                      </span>
                    </div>
                  ) :
                  symbol && (
                    <div className="h-6 flex items-center space-x-2">
                      {image && (
                        <Image
                          src={image}
                          width={24}
                          height={24}
                        />
                      )}
                      {typeof amount === 'number' && (
                        <NumberDisplay
                          value={amount}
                          format="0,0.00"
                          suffix={` ${symbol}`}
                        />
                      )}
                    </div>
                  )
            }
          </div>
          <div className="order-3 lg:order-2 sm:col-span-2 lg:col-span-3 bg-slate-50 dark:bg-slate-800 rounded sm:rounded-lg flex flex-col justify-center space-y-1 p-2 sm:p-3">
            <div className="flex items-center justify-between space-x-3">
              <div className="w-fit min-w-max h-6 flex items-center text-slate-600 dark:text-slate-200 text-sm space-x-2">
                {source_chain_data?.image && (
                  <Image
                    src={source_chain_data.image}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                )}
                <span className="font-semibold">
                  {source_chain_data?.name || getTitle(chain)}
                </span>
              </div>
              <div className="w-full h-6 flex items-center space-x-3">
                <div className="w-full h-1 border-t-2 border-dashed border-slate-300 dark:border-slate-600 mt-0.5" />
                <div className="w-fit flex items-center space-x-2">
                  <div className="min-w-max">
                    <div className="block dark:hidden">
                      <Image
                        src="/logos/logo.png"
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    </div>
                    <div className="hidden dark:block">
                      <Image
                        src="/logos/logo_white.png"
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    </div>
                  </div>
                  <span className="hidden sm:block text-black dark:text-white font-semibold">
                    Axelar
                  </span>
                </div>
                <div className="w-full h-1 border-t-2 border-dashed border-slate-300 dark:border-slate-600 mt-0.5" />
              </div>
              <div className="w-fit min-w-max h-6 flex items-center text-slate-600 dark:text-slate-200 text-sm space-x-2">
                {destination_chain_data?.image && (
                  <Image
                    src={destination_chain_data.image}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                )}
                <span className="font-semibold">
                  {destination_chain_data?.name || getTitle(destinationChain)}
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-slate-600 dark:text-slate-200 text-sm sm:space-x-3">
              <div className="h-6 flex items-center">
                <AccountProfile
                  address={from}
                  ellipseLength={8}
                  noCopy={true}
                  explorer={source_chain_data?.explorer}
                  chain={source_chain_data?.id}
                />
              </div>
              <div className="h-6 flex items-center">
                <AccountProfile
                  address={destinationContractAddress}
                  ellipseLength={8}
                  noCopy={true}
                  explorer={destination_chain_data?.explorer}
                  chain={destination_chain_data?.id}
                />
              </div>
            </div>
          </div>
          <div className="order-2 lg:order-3 flex flex-col text-slate-600 dark:text-slate-200 text-sm space-y-1">
            {extra}
            {timeSpent && (
              <div className="h-6 flex items-center space-x-4">
                {timeSpent}
              </div>
            )}
            {estimatedTimeSpent}
          </div>
        </div>
      </CardBody>
      <CardFooter className="card-footer mb-4">
        <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="flex flex-col justify-end space-y-1">
            {block_timestamp > 0 && (
              <span className="whitespace-nowrap text-slate-400 dark:text-slate-500 font-medium">
                {moment(block_timestamp * 1000).format(TIME_FORMAT)}
              </span>
            )}
          </div>
          <div className="sm:col-span-2 lg:col-span-4 space-y-0.5">
            <div className="text-slate-600 dark:text-slate-200 font-semibold">
              Status
            </div>
            <Stepper activeStep={-1} className="stepper">
              {steps.map((s, i) => {
                const { id, title, status, data, chain_data, tooltip } = { ...s }
                const { confirmation_txhash, poll_id, axelarTransactionHash, receipt } = { ...data }
                let { transactionHash } = { ...data }
                const { explorer } = { ...chain_data }
                const { url, transaction_path } = { ...explorer }
                transactionHash = transactionHash || receipt?.transactionHash || receipt?.hash

                let _url
                if (url && transaction_path) {
                  switch (id) {
                    case 'pay_gas':
                      if (transactionHash || origin_data?.call?.transactionHash) {
                        _url = `${url}${transaction_path.replace('{tx}', transactionHash || origin_data?.call?.transactionHash)}`
                      }
                      break
                    case 'confirm':
                      if (confirmation_txhash) {
                        _url = `/tx/${confirmation_txhash}`
                      }
                      else if (poll_id) {
                        _url = `/evm-poll/${poll_id}`
                      }
                      break
                    case 'executed':
                      if (transactionHash || axelarTransactionHash) {
                        _url = `${url}${transaction_path.replace('{tx}', transactionHash || axelarTransactionHash)}`
                      }
                      break
                    default:
                      if (transactionHash) {
                        _url = `${url}${transaction_path.replace('{tx}', transactionHash)}`
                      }
                      break
                  }
                }

                let bgColor
                let color
                switch (status) {
                  case 'success':
                    bgColor = 'bg-green-500 dark:bg-green-600'
                    color = 'text-green-500 dark:text-green-400'
                    break
                  case 'failed':
                    bgColor = 'bg-red-400 dark:bg-red-500'
                    color = 'text-red-400 dark:text-red-500'
                    break
                  default:
                    bgColor = `bg-blue-400 dark:bg-blue-500 ${steps.findIndex(s => s.status === 'pending') === i ? 'ring-4 ring-blue-100 dark:ring-blue-900' : ''}`
                    color = 'text-blue-400 dark:text-blue-500'
                    break
                }

                const button = buttons?.[id]
                let component = (
                  <div className="flex flex-col items-center">
                    <span className="text-white mt-0.5">
                      {i + 1}
                    </span>
                    <div className={`w-max flex items-center whitespace-nowrap ${color} text-xs font-medium space-x-0.5 mt-1`}>
                      <span>{title}</span>
                      {tooltip && <RiInformationLine size={14} />}
                    </div>
                    {id === 'confirm' && tooltip && !express_executed && estimated_time_spent && createMomentFromUnixtime(block_timestamp + estimated_time_spent.confirm).diff(moment()) > 0 && (
                      <div className={`flex flex-wrap whitespace-nowrap ${color} text-xs font-medium`}>
                        (<TimeUntil
                          time={block_timestamp + estimated_time_spent.confirm}
                          noTooltip={true}
                          className="font-medium"
                        />)
                      </div>
                    )}
                  </div>
                )
                if (tooltip) {
                  component = (
                    <Tooltip content={tooltip} className="w-48">
                      {component}
                    </Tooltip>
                  )
                }

                return (
                  <Step key={i} className={`w-6 h-6 ${bgColor} flex flex-col items-center`}>
                    {_url ?
                      <Link href={_url} target="_blank" rel="noopener noreferrer">
                        {component}
                      </Link> :
                      component
                    }
                    {button && (
                      <div className="w-max flex flex-col items-center text-xs font-medium space-y-1 mt-0.5">
                        {button}
                      </div>
                    )}
                  </Step>
                )
              })}
            </Stepper>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}