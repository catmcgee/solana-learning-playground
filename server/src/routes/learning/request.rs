use anyhow::anyhow;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use uuid::Uuid;

use super::{session::session_safety_id, tools::tutor_tools, MAX_OUTPUT_TOKENS};

const MAX_WORKSPACE_FILES: usize = 64;
const MAX_FILE_CONTENT_BYTES: usize = 128 * 1024;
const MAX_MESSAGE_BYTES: usize = 16 * 1024;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AiRequest {
    message: String,
    previous_response_id: Option<String>,
    workspace: Vec<WorkspaceFile>,
    current_file: Option<String>,
    selection: Option<String>,
    lesson_id: Option<String>,
    runtime: Option<Value>,
    tool_outputs: Option<Vec<ToolOutput>>,
}

#[derive(Deserialize, Serialize)]
struct WorkspaceFile {
    path: String,
    content: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ToolOutput {
    call_id: String,
    output: Value,
}

pub(super) fn create_openai_request(payload: AiRequest, model: &str, owner: Uuid) -> Value {
    let input = create_input(&payload);
    let mut request = json!({
        "model": model,
        "instructions": super::tools::TUTOR_INSTRUCTIONS,
        "input": input,
        "stream": true,
        "store": true,
        "max_output_tokens": MAX_OUTPUT_TOKENS,
        "reasoning": { "effort": "medium", "context": "all_turns" },
        "text": { "verbosity": "medium" },
        "safety_identifier": session_safety_id(owner),
        "tools": tutor_tools(),
    });
    if let Some(previous_response_id) = payload.previous_response_id {
        request["previous_response_id"] = Value::String(previous_response_id);
    }
    request
}

fn create_input(payload: &AiRequest) -> Value {
    if let Some(outputs) = payload
        .tool_outputs
        .as_ref()
        .filter(|items| !items.is_empty())
    {
        return Value::Array(
            outputs
                .iter()
                .map(|item| {
                    json!({
                        "type": "function_call_output",
                        "call_id": item.call_id,
                        "output": item.output.to_string()
                    })
                })
                .collect(),
        );
    }

    let context = json!({
        "lesson": payload.lesson_id,
        "currentFile": payload.current_file,
        "selection": payload.selection,
        "workspace": payload.workspace,
        "runtime": payload.runtime,
    });
    json!([{
        "role": "user",
        "content": [{
            "type": "input_text",
            "text": format!(
                "{}\n\n<playground_context>{}</playground_context>",
                payload.message,
                context
            )
        }]
    }])
}

pub(super) fn validate_ai_request(payload: &AiRequest) -> anyhow::Result<()> {
    if payload.message.trim().is_empty()
        && payload
            .tool_outputs
            .as_ref()
            .map(Vec::is_empty)
            .unwrap_or(true)
    {
        return Err(anyhow!("Message cannot be empty"));
    }
    if payload.message.len() > MAX_MESSAGE_BYTES
        || payload
            .selection
            .as_ref()
            .is_some_and(|selection| selection.len() > MAX_MESSAGE_BYTES)
        || payload
            .previous_response_id
            .as_ref()
            .is_some_and(|id| id.len() > 128)
        || payload.lesson_id.as_ref().is_some_and(|id| id.len() > 64)
        || payload
            .tool_outputs
            .as_ref()
            .is_some_and(|outputs| outputs.len() > 16)
    {
        return Err(anyhow!("Tutor request exceeds allowed limits"));
    }
    if payload.workspace.len() > MAX_WORKSPACE_FILES {
        return Err(anyhow!("Workspace contains too many files"));
    }
    if payload.tool_outputs.as_ref().is_some_and(|outputs| {
        outputs.iter().any(|output| {
            output.call_id.len() > 128 || output.output.to_string().len() > MAX_FILE_CONTENT_BYTES
        })
    }) {
        return Err(anyhow!("Tutor tool output exceeds allowed limits"));
    }
    if payload.workspace.iter().any(invalid_workspace_file) {
        return Err(anyhow!("Workspace file exceeds tutor limits"));
    }
    Ok(())
}

fn invalid_workspace_file(file: &WorkspaceFile) -> bool {
    let allowed_path = file.path.starts_with("src/") || file.path.starts_with("tests/");
    !allowed_path
        || file.path.contains("..")
        || file.path.contains("//")
        || file.path.len() > 256
        || file.content.len() > MAX_FILE_CONTENT_BYTES
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tutor_context_rejects_hidden_workspace_files() {
        let payload = AiRequest {
            message: "Explain this".into(),
            previous_response_id: None,
            workspace: vec![WorkspaceFile {
                path: ".workspace/program-info.json".into(),
                content: "{}".into(),
            }],
            current_file: None,
            selection: None,
            lesson_id: Some("hello-solana".into()),
            runtime: None,
            tool_outputs: None,
        };
        assert!(validate_ai_request(&payload).is_err());
    }
}
