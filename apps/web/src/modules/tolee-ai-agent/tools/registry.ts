import { ToolDefinition, ToolExecutionContext, ToolExecutionResult } from './types';
import { getLatestMessagesTool, sendMessageTool } from './chat-tools';
import { getUserPostsTool, createPostTool } from './post-tools';
import { getNotificationsTool } from './notification-tools';
import { getMarketplaceEnquiriesTool } from './marketplace-tools';
import { getToleeGroupsTool } from './group-tools';
import {
  getUserProfileTool,
  getRadarAlertsTool,
  getStoriesTool,
  getWalletBalanceTool,
  getScheduleTool,
  createReminderTool,
  liveWebSearchTool,
  agentReachTool,
  toleeSongsTool,
  calendarAssistantTool,
  emailAssistantTool,
} from './extended-tools';
import {
  postToGroupsTool,
  getAdOptionsTool,
  createAdCampaignTool,
  updateProfileBioTool,
  deletePostTool,
  searchUserMemoryTool,
  saveUserMemoryTool,
  forgetUserMemoryTool,
  cancelActiveTaskTool,
} from './v3-tools';
import {
  generateImageTool,
  generateVideoTool,
  getGenerationStatusTool,
  listMyGenerationsTool,
  cancelGenerationTool,
  saveMediaAsReelDraftTool,
} from './media-tools';

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

    // Register extended live Tolee tools
    this.register(getUserProfileTool);
    this.register(getRadarAlertsTool);
    this.register(getStoriesTool);
    this.register(getWalletBalanceTool);
    this.register(getScheduleTool);
    this.register(createReminderTool);
    this.register(liveWebSearchTool);
    this.register(agentReachTool);
    this.register(toleeSongsTool);
    this.register(calendarAssistantTool);
    this.register(emailAssistantTool);

    // Register V3 Agentic Tools
    this.register(postToGroupsTool);
    this.register(getAdOptionsTool);
    this.register(createAdCampaignTool);
    this.register(updateProfileBioTool);
    this.register(deletePostTool);
    this.register(searchUserMemoryTool);
    this.register(saveUserMemoryTool);
    this.register(forgetUserMemoryTool);
    this.register(cancelActiveTaskTool);

    // Register Open-Higgsfield Generative Media Tools
    this.register(generateImageTool);
    this.register(generateVideoTool);
    this.register(getGenerationStatusTool);
    this.register(listMyGenerationsTool);
    this.register(cancelGenerationTool);
    this.register(saveMediaAsReelDraftTool);

    // Register canonical & standard aliases
    this.register({ ...sendMessageTool, name: 'send_message' });
    this.register({ ...createPostTool, name: 'create_post' });
    this.register({ ...createReminderTool, name: 'create_reminder' });
    this.register({ ...deletePostTool, name: 'delete_post' });

    // Logical dot-notation aliases (Section 4 & Open-Higgsfield)
    this.register({ ...createPostTool, name: 'content.create_post' });
    this.register({ ...getUserPostsTool, name: 'content.get_post_status' });
    this.register({ ...deletePostTool, name: 'content.delete_post' });
    this.register({ ...getToleeGroupsTool, name: 'groups.list_my_groups' });
    this.register({ ...postToGroupsTool, name: 'groups.post_to_groups' });
    this.register({ ...getLatestMessagesTool, name: 'chats.list_conversations' });
    this.register({ ...sendMessageTool, name: 'chats.send_message' });
    this.register({ ...getAdOptionsTool, name: 'ads.get_options' });
    this.register({ ...createAdCampaignTool, name: 'ads.create_campaign' });
    this.register({ ...createAdCampaignTool, name: 'ads.boost_post' });
    this.register({ ...getUserProfileTool, name: 'profile.get' });
    this.register({ ...updateProfileBioTool, name: 'profile.update_bio' });
    this.register({ ...getScheduleTool, name: 'tasks.get_status' });
    this.register({ ...cancelActiveTaskTool, name: 'tasks.cancel' });
    this.register({ ...searchUserMemoryTool, name: 'memory.search' });
    this.register({ ...saveUserMemoryTool, name: 'memory.save' });
    this.register({ ...forgetUserMemoryTool, name: 'memory.forget' });
    this.register({ ...generateImageTool, name: 'media.generate_image' });
    this.register({ ...generateVideoTool, name: 'media.generate_video' });
    this.register({ ...getGenerationStatusTool, name: 'media.get_generation_status' });
    this.register({ ...listMyGenerationsTool, name: 'media.list_my_generations' });
    this.register({ ...cancelGenerationTool, name: 'media.cancel_generation' });
    this.register({ ...saveMediaAsReelDraftTool, name: 'reels.create_draft' });
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
