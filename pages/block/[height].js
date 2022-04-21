import { useRouter } from 'next/router'

import Block from '../../components/blocks/block'

export default function BlockHeight() {
  const router = useRouter()
  const { query } = { ...router }

  return (
    <Block height={query?.height} />
  )
}