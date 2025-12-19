// Tool Definitions
export { sendNotificationTool, handleSendNotification } from './sendNotification.js';
export { scheduleNotificationTool, handleScheduleNotification } from './scheduleNotification.js';
export { summarizeAndExecuteTool, handleSummarizeAndExecute } from './summarizeAndExecute.js';
export { createEventTool, handleCreateEvent } from './createEvent.js';

// All Tools
export const allTools = [
  'send_notification',
  'schedule_notification',
  'summarize_and_execute',
  'create_event',
] as const;

export type ToolName = (typeof allTools)[number];
