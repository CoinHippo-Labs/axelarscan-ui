import clsx from 'clsx'

export function Tooltip({ content, className, children }) {
  return (
    <div className="group relative flex justify-center">
      <div className="hidden group-hover:block absolute z-50 bg-black -top-10 px-2 py-1 rounded-lg">
        <div className={clsx('text-white text-sm font-normal', className)}>
          {content}
        </div>
      </div>
      {children}
    </div>
  )
}