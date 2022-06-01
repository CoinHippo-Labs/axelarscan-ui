import { FiCode } from 'react-icons/fi'

import Image from '../image'
import { number_format } from '../../lib/utils'

export default ({ data }) => {
  return data && (
    <div className="min-w-max h-104 overflow-auto bg-slate-100 dark:bg-slate-900 rounded-lg flex flex-col">
      {data.map((d, i) => (
        <div
          key={i}
          className="hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-between text-base font-bold hover:font-extrabold space-x-5 py-2 px-3"
        >
          <div className="flex items-center space-x-3">
            <Image
              src={d?.source_chain_data?.image}
              title={d?.source_chain_data?.name}
              className="w-6 h-6 rounded-full"
            />
            <FiCode size={16} />
            <Image
              src={d?.destination_chain_data?.image}
              title={d?.destination_chain_data?.name}
              className="w-6 h-6 rounded-full"
            />
          </div>
          <span>
            {number_format(d?.num_txs, '0,0')}
          </span>
        </div>
      ))}
    </div>
  )
}