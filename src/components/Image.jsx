import NextImage from 'next/image'

const OPTIMIZER_URL = ''
const loader = ({ src, width, quality = 75 }) => `${OPTIMIZER_URL ? `${OPTIMIZER_URL}/_next` : ''}${src?.startsWith('/') ? '' : '/'}${src}${OPTIMIZER_URL ? `?url=${src?.startsWith('/') ? process.env.NEXT_PUBLIC_APP_URL : ''}${src}&w=${width}&q=${quality}` : ''}`

export function Image({ src, alt = '', ...props }) {
  return src && (
    <NextImage
      alt={alt}
      {...props}
      src={src}
      loader={() => loader({ ...props, src })}
      unoptimized
    />
  )
}
