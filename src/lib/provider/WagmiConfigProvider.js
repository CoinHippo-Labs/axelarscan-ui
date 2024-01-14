import { WagmiConfig } from 'wagmi'

import { wagmiConfig } from '@/src/lib/provider/wagmi'

export default ({ children }) => <WagmiConfig config={wagmiConfig}>{children}</WagmiConfig>