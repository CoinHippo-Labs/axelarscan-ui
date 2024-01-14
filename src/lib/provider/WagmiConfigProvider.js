import { WagmiConfig } from 'wagmi'

import { wagmiConfig } from '@/lib/provider/wagmi'

export default ({ children }) => <WagmiConfig config={wagmiConfig}>{children}</WagmiConfig>