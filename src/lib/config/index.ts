export const config = {
  locusBaseUrl: process.env.LOCUS_BASE_URL || 'https://beta-api.paywithlocus.com/api',
  uniswapBaseUrl: process.env.UNISWAP_BASE_URL || 'https://trade-api.gateway.uniswap.org/v1',
  uniswapApiKey: process.env.UNISWAP_API_KEY || '',
  maxSubtasks: 4,
  maxUsdcPerTask: 5,
  maxUsdcPerSubtask: 2,
  escrowTimeoutMs: 5 * 60 * 1000, // 5 minutes
  llmModel: 'gpt-4o',
  // Base chain token addresses
  tokens: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    WETH: '0x4200000000000000000000000000000000000006',
    USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6Da',
  },
  chainId: 8453, // Base
};
