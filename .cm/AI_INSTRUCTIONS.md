# Context Memory (.cm) - AI Agent Workspace Instructions & Memory Alignment Protocol

This project utilizes a Context Memory persistent local memory system under the .cm/ folder to prevent context loss during conversation wipes, truncations, or model resets.

## 1. Startup Checklist (CRITICAL)
Before answering the first user prompt or proposing any plans:
1. **Read** .cm/session_summary.md to understand the project's current status, goals, and recent activity.
2. **Compare** the content in session_summary.md with the active conversation history.
3. **Detect Resets**: If the conversation history is empty or lacks reference to the goals/tasks in the summary, assume a context wipe has occurred.
4. **Alert and Resume**: If a context reset is detected, output a clear alert to the user:
   "⚠️ I detected that the conversation history has been reset. Restoring context from .cm/session_summary.md to resume work seamlessly."

## 2. Maintaining Memory
At the end of any coding session or task:
1. **Update** .cm/session_summary.md with the new project state, completed tasks, and next steps.
2. **Create/Update** walkthrough logs (e.g., walkthrough.md) summarizing the modifications.
3. **Commit & Push**: Ensure memory files are pushed to GitHub.
