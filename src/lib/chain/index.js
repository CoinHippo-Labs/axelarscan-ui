import { toCase } from '@/lib/parser'

export const isAxelar = chain => ['axelarnet', 'axelar'].includes(toCase(chain, 'lower'))
