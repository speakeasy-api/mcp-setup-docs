import { createMcpAdapter } from 'pi-mcp-adapter'

/** Factory-only MCP surface: isolated from user/global MCP configuration. */
export const exaMcpConfig = Object.freeze({
  settings: {
    scriptMode: false,
  },
  mcpServers: {
    exa: {
      url: 'https://mcp.exa.ai/mcp',
      lifecycle: 'lazy',
      includeTools: ['web_search_exa', 'get_code_context_exa'],
    },
  },
})

export default createMcpAdapter({ config: exaMcpConfig })
