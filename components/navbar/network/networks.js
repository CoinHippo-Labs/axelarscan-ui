import { networks } from '../../../lib/menus'

export default function Networks({ handleDropdownClick }) {
  return (
    <>
      <div className="dropdown-title">Change Network</div>
      <div className="flex flex-wrap pb-1">
        {networks.map((item, i) => (
          item.disabled ?
            <div
              key={i}
              title="Not available yet"
              className="dropdown-item w-1/2 cursor-not-allowed flex items-center justify-start space-x-1.5 p-2"
            >
              {item.icon}
              <span className="text-xs">{item.title}</span>
            </div>
            :
            <a
              key={i}
              href={item.url}
              onClick={handleDropdownClick}
              className="dropdown-item w-1/2 flex items-center justify-start space-x-1.5 p-2"
            >
              {item.icon}
              <span className="text-xs">{item.title}</span>
            </a>
        ))}
      </div>
    </>
  )
}