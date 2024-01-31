import { WagmiConfig } from 'wagmi'

import { wagmiConfig } from '@/lib/provider/wagmi'

export default function WagmiConfigProvider({ children }) { return <WagmiConfig config={wagmiConfig}>{children}</WagmiConfig> }