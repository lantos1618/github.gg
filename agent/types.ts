// Types for the agent visualizer

export interface Usage {
  input_tokens?: number;
  output_tokens?: number;
}

export interface ToolCallContent {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ToolResultContent {
  type: 'tool_result';
  tool_use_id: string;
  content: string | Record<string, unknown>;
  is_error?: boolean;
}

export type MessageContent = ToolCallContent | TextContent | ToolResultContent;

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: MessageContent[];
  usage?: Usage;
}

export interface SystemMessage {
  type: 'system';
  subtype?: string;
}

export interface UserMessage {
  type: 'user';
  message: Message;
}

export interface AssistantMessage {
  type: 'assistant';
  message: Message;
}

export interface ToolResultMessage {
  type: 'tool_result';
  name: string;
  output?: string;
}

export interface ResultMessage {
  type: 'result';
  result: string;
}

export type StreamEvent =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolResultMessage
  | ResultMessage;

export interface TodoItem {
  content: string;
  status: 'completed' | 'in_progress' | 'pending';
  priority?: 'high' | 'medium' | 'low';
}

export interface ToolCallInfo {
  toolCall: AssistantMessage;
  timestamp: string;
}

export interface ToolResultInfo {
  toolResult: UserMessage;
  timestamp: string;
}
