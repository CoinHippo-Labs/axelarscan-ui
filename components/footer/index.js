import { useSelector, shallowEqual } from 'react-redux'
import moment from 'moment'
import { Img as Image } from 'react-image'
import { FaHeart } from 'react-icons/fa'

export default = () => {
  const { preferences, chain } = useSelector(state => ({ preferences: state.preferences, chain: state.chain }), shallowEqual)
  const { theme } = { ...preferences }
  const { chain_data } = { ...chain }

  return (
    <div className={`footer flex flex-col md:flex-row items-center text-xs space-y-2 sm:space-y-0 p-3 ${theme}`}>
      <div className="w-full md:w-1/2 lg:w-1/4 min-w-max flex items-center justify-center md:justify-start font-medium space-x-1.5">
        <a
          title="axelar core"
          href={`${process.env.NEXT_PUBLIC_DOC_URL}/resources/${process.env.NEXT_PUBLIC_ENVIRONMENT}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-1.5"
        >
          <div className="min-w-max">
            <div className="flex dark:hidden items-center">
              <Image
                src="/logos/logo.png"
                alt=""
                className="w-4 h-4"
              />
            </div>
            <div className="hidden dark:flex items-center">
              <Image
                src="/logos/logo_white.png"
                alt=""
                className="w-4 h-4"
              />
            </div>
          </div>
          <span>Axelar Core</span>
        </a>
        {chain_data?.['axelar-core_version'] && (
          <span className="text-slate-400 dark:text-white font-semibold">
            ({chain_data['axelar-core_version']})
          </span>
        )}
      </div>
      <div className="hidden lg:flex w-full lg:w-2/4 flex-wrap items-center justify-center">
      </div>
      <div className="w-full md:w-1/2 lg:w-1/4 min-w-max flex items-center justify-center md:justify-end text-slate-400 dark:text-white space-x-1">
        <span>© {moment().format('YYYY')} made with</span>
        <FaHeart className="text-red-400 text-xl pr-0.5" />
        <span>
          {"by "}
          <a
            href={process.env.NEXT_PUBLIC_TEAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 dark:text-white font-semibold"
          >
            {process.env.NEXT_PUBLIC_TEAM_NAME}
          </a>
          {" team."}
        </span>
      </div>
    </div>
  )
}