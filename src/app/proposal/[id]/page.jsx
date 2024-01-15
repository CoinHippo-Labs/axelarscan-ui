import { Proposal } from '@/components/Proposal'

export default ({ params }) => {
  const { id } = { ...params }
  return <Proposal id={id} />
}
