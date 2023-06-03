const JSON_SCHEMA = `
{
    "command": {
        "name": "command name",
        "args": {
            "arg name": "value"
        }
    },
    "thoughts":
    {
        "text": "thought",
        "reasoning": "reasoning",
        "plan": "- short bulleted\n- list that conveys\n- long-term plan",
        "criticism": "constructive self-criticism",
        "speak": "thoughts summary to say to user"
    }
}
`;

export function llm_fix_json_using_multiple_techniques(assistant_reply: string): Object|Object[]|false {
    assistant_reply = assistant_reply.trim();
    if (assistant_reply.startsWith("```json")) {
        assistant_reply = assistant_reply.substring(7);
    }
    if (assistant_reply.endsWith("```")) {
        assistant_reply = assistant_reply.substring(0, assistant_reply.length - 3);
    }
    try {
        let ret = JSON.parse(assistant_reply);
        if(!ret) {
            throw new Error("Invalid JSON");
        }
        return ret;
    } catch (error) {
        console.warn("Invalid JSON, attempting to fix (TODO)");
        // Handle other techniques to fix the JSON
        return false;
    }
}

