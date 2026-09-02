import { ToolDefinition, ToolExecutionContext, ToolExecutionResult } from './types';
import { getLatestMessagesTool, sendMessageTool } from './chat-tools';
import { getUserPostsTool, createPostTool } from './post-tools';
import { getNotificationsTool } from './notification-tools';
import { getMarketplaceEnquiriesTool } from './marketplace-tools';
import { getToleeGroupsTool } from './group-tools';

export class ToolRegistry {
  private static tools: Map<string, ToolDefinition> = new Map();

  static {
    // Register all default tools
    this.register(getLatestMessagesTool);
    this.register(sendMessageTool);
    this.register(getUserPostsTool);
    this.register(createPostTool);
    this.register(getNotificationsTool);
    this.register(getMarketplaceEnquiriesTool);
    this.register(getToleeGroupsTool);
  }

  public static register(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  public static get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public static getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Formats all registered tools for OpenAI / NVIDIA NIM tool calling schema
   */
  public static toOpenAITools() {
    return this.getAll().map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  }

  /**
   * Executes a tool with strict execution context, error boundary & verification
   */
  public static async execute(
    toolName: string,
    args: any,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const tool = this.get(toolName);
    if (!tool) {
      return {
        success: false,
        error: `Tool "${toolName}" system me registered nahi hai.`,
      };
    }

    try {
      console.log(`[ToolRegistry] Executing "${toolName}" for user: ${context.userId}`);
      const result = await tool.execute(args, context);
      return result;
    } catch (err: any) {
      console.error(`[ToolRegistry] Execution error in "${toolName}":`, err);
      return {
        success: false,
        error: `Tool execution me unexpected error aaya: ${err.message || err}`,
      };
    }
  }
}
