import { useSelector, shallowEqual } from 'react-redux'
import { Card, CardBody, CardFooter, Chip, Tooltip } from '@material-tailwind/react'
import _ from 'lodash'
import { TbFileSearch } from 'react-icons/tb'
import { GoDotFill } from 'react-icons/go'

import Image from '../image'
import AddMetamask from '../metamask/add-button'
import ValueBox from '../value-box'
import { toArray, getTitle } from '../../lib/utils'

export default ({ data }) => {
  const { contracts } = useSelector(state => ({ contracts: state.contracts }), shallowEqual)
  const { contracts_data } = { ...contracts }
  const { gateway_contracts, gas_service_contracts } = { ...contracts_data }

  const {
    id,
    chain_id,
    chain_name,
    deprecated,
    endpoints,
    name,
    image,
    explorer,
    prefix_address,
    chain_type,
  } = { ...data }
  const { rpc, lcd } = { ...endpoints }
  const { url, address_path } = { ...explorer }

  const gateway_address = gateway_contracts?.[id]?.address
  const gas_service_address = gas_service_contracts?.[id]?.address

  return (
    <Card key={id} className="card">
      <CardBody>
        <div className="flex items-start justify-between">
          <Image
            src={image}
            width={52}
            height={52}
            className="3xl:w-16 3xl:h-16 rounded-full p-1 -m-1"
          />
          <div className="flex items-center space-x-2">
            {url && (
              <Tooltip content="Explorer">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 dark:text-blue-500"
                >
                  <TbFileSearch size={24} />
                </a>
              </Tooltip>
            )}
            {chain_type === 'evm' && (
              <AddMetamask chain={id} />
            )}
            <Tooltip content={deprecated ? 'Deactivated' : 'Active'}>
              <div>
                <GoDotFill size={18} className={`${deprecated ? 'text-red-500 dark:text-red-500' : 'text-green-500 dark:text-green-500'}`} />
              </div>
            </Tooltip>
          </div>
        </div>
        <div className="title flex items-center space-x-1">
          <span>{name}</span>
        </div>
        <div className="description">
          {chain_name && <ValueBox title="Chain Name" value={chain_name} />}
          {gateway_address && (
            <ValueBox
              url={url && `${url}${address_path?.replace('{address}', gateway_address)}`}
              title="Gateway Address"
              value={gateway_address}
            />
          )}
          {gas_service_address && (
            <ValueBox
              url={url && `${url}${address_path?.replace('{address}', gas_service_address)}`}
              title="Gas Service Address"
              value={gas_service_address}
            />
          )}
          {toArray(rpc).length > 0 && (
            <ValueBox
              url={_.head(toArray(rpc))}
              title="RPC Endpoint"
              value={_.head(toArray(rpc))}
              noEllipse={true}
            />
          )}
          {toArray(lcd).length > 0 && (
            <ValueBox
              url={_.head(toArray(lcd))}
              title="LCD Endpoint"
              value={_.head(toArray(lcd))}
              noEllipse={true}
            />
          )}
          {prefix_address && (
            <ValueBox
              title="Address Prefix"
              value={prefix_address}
            />
          )}
        </div>
      </CardBody>
      <CardFooter className="card-footer">
        <div className="flex items-center space-x-2">
          <Chip
            color="amber"
            value={getTitle(chain_type)}
            className="chip normal-case font-medium"
          />
          {chain_id && (
            <Chip
              color="teal"
              value={`Chain ID: ${chain_id}`}
              className="chip normal-case font-medium"
            />
          )}
        </div>
      </CardFooter>
    </Card>
  )
}