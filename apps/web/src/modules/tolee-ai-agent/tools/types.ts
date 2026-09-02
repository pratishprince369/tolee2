export type ToolRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ToolDefinition {
  name: string;
  description: string;
  riskLevel: ToolRiskLevel;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      items?: { type: string };
    }>;
    required?: string[];
  };
  execute: (args: any, context: ToolExecutionContext) => Promise<ToolExecutionResult>;
}

export interface ToolExecutionContext {
  userId: string;
  userName?: string;
  userRole?: string;
  sessionId: string;
  isVoiceMode?: boolean;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
  requiresConfirmation?: boolean;
  confirmationDetails?: {
    actionType: string;
    description: string;
    summary: string;
    payload: any;
  };
}
