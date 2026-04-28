export function buildTeamRequestInstructions(teamRequest: { title: string; identifier: string; requestDetails: string; responseContract: string; requesterName: string; }) {
  
  return `Instructions for handling this Team Request:

      **BASIC RULE**: You must only respond to this Team Request after completing all work. Use the 'update_request_status' Forge MCP tool to update the status of the request to 'completed' (resolution: 'success' or 'failed') and provide your response.

      ### STEP 1: Fetch Request Details
      If you haven't done so yet, please use the 'get_request' Forge MCP tool to fetch the full details of this Team Request (${teamRequest.identifier}).

      ### STEP 2: Analyze Capabilities
      Look for the field 'suggestedCapabilities' in the request data. If there are capabilities associated to the Team Request:
      1. Iterate through them and look them up using the 'get_capability_by_identifier' Forge MCP tool.
      2. For each capability, extract all descriptive fields.
      3. Fully understand what each instruction is about.
      4. Synthesize all information (capability instructions, input/output descriptions, and the request instructions).

      ### STEP 3: Evaluate, Accept or Reject
      Evaluate if you have enough information to execute this request based on its title, description, and synthesized instructions from the associated capabilities.
      - **Note**: There is no need to create a task for extremely simple requests: if the request is a simple question or something you can accomplish using your knowledge or available tools, ACCEPT IT and proceed to STEP 6.
      - **EXHAUST ALL OPTIONS BEFORE REJECTING**: You must make a strong effort to complete the request. Do NOT reject it immediately just because you feel information is missing. 
        You MUST first use all available tools (including MCP tools) to look up the missing information. 
      - IF YOU ABSOLUTELY CANNOT FULFILL IT (only after exhausting all tools): Reject the request using the 'update_request_status' tool (status: 'completed', resolution: 'failed') and provide your reasoning in the 'response' field.
      - IF YOU ACCEPT THE REQUEST: Proceed to STEP 4.

      ### STEP 4: Create and Document TASK
      Use the 'create_task' Forge MCP tool to document your unit of work. 
      You MUST pass the identifier of this request (${teamRequest.identifier}) in the 'requestId' parameter when creating the task to link them together.
      When creating the task, you MUST populate the structured fields:
      - **plan**: Describe how you plan to execute the work to fulfill the request. Include what you understood about the request, the instructions abstracted, and any inferences or deductions.
      - **taskList**: List the main steps you plan to take to execute the work (as a free-text or markdown to-do list).
      *(Note: 'executionLog' will be updated by you during STEP 5, and 'workSummary' will be populated when you finish).*
      - **CRITICAL RULE**: After creating the task, you MUST update the Team Request ${teamRequest.identifier} to indicate you are working on it. Call the 'update_request_status' tool and pass requestId: '${teamRequest.identifier}' AND status: 'in_progress'

      ### STEP 5: Execute Work
      Now, perform the actual work required to fulfill the request. Use whatever tools are necessary.
      Stay on this request until the work is completely finished. Do your best to fulfill the original request following the synthesized instructions.
      If you created a TASK in STEP 4, you SHOULD update the TASK's taskList and executionLog accordingly (using 'update_task') as you execute the work. 
      **CRITICAL RULE** during the execution of your work on this request you can never update any other task than the one you created in step 4.
      You must explain what you did using the 'update_task' tool to update the workSummary field with the result of your work on the request (including deliverables you might have produced on the way).

      ### STEP 6: Finalize Request (Respond)
      1. Once all work is completely finished (whether successful or failed), you must finally call 'update_request_status' to update this request status to 'completed' (resolution: 'success' or 'failed'). 
      Pass the identifier '${teamRequest.identifier}' as the requestId.
      2. Provide your final response in the 'response' field:
         - If you created a TASK for this request, you may just refer to that task in your response.
         - Otherwise, if you didn't create a task (this may happen in case the work is too simple and you decided not to create a task), then in the 'response' field you MUST provide the final response.`;
}

export function buildTeamRequestMessage(teamRequest: { identifier: string; title: string }) {
  return `You received a new Team Request from your FORGE team with the identifier: ${teamRequest.identifier} and title: ${teamRequest.title}. 
  You must use the 'get_request' Forge MCP tool passing the identifier '${teamRequest.identifier}' to fetch the details of this request.
  Read all fields without exception and follow the instructions thoroughly to provide the best possible response and achieve the desired outcome of this request.`;
}
