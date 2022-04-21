import { Img } from 'react-image'

export default function Assets({ assets, handleDropdownClick }) {
  return (
    <div className="flex flex-wrap py-1">
      {assets?.map((item, i) => (
        <div
          key={i}
          onClick={() => handleDropdownClick(item.id)}
          className="dropdown-item w-full cursor-pointer flex items-center justify-between space-x-1.5 p-2"
        >
          <div className="flex items-center space-x-1.5">
            <Img
              src={item?.asset?.image}
              alt=""
              className="w-6 h-6 rounded-full"
            />
            <span className="text-sm font-semibold">
              {item?.asset?.title}
            </span>
          </div>
          <span className="text-gray-400 dark:text-gray-600 text-sm ml-auto">
            {item?.asset?.symbol}
          </span>
        </div>
      ))}
    </div>
  )
}