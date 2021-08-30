export type ActionPayloadBuilder =
  | {
      t: "FieldMap";
      c: {
        [k: string]: ActionInvokeDefDataField;
      };
    }
  | {
      t: "Script";
      c: string;
    };

export type ActionInvokeDefDataField =
  | {
      t: "Input";
      c: [string, boolean];
    }
  | {
      t: "Context";
      c: [string, boolean];
    }
  | {
      t: "Constant";
      c: any;
    }
  | {
      t: "Script";
      c: string;
    };

export interface ActionInvokeDef {
  task_action_local_id: string;
  data: ActionPayloadBuilder;
}

export type String = string;

export type ScriptOrTemplate =
  | {
      t: "Template";
      c: [string, true][];
    }
  | {
      t: "Script";
      c: string;
    };

export type TemplateFieldFormat =
  | {
      type: "string";
    }
  | {
      type: "string_array";
    }
  | {
      type: "integer";
    }
  | {
      type: "float";
    }
  | {
      type: "boolean";
    }
  | {
      type: "object";
    }
  | {
      type: "choice";
      choices: string[];
      min?: number | null;
      max?: number | null;
    };

export interface ActionPayload {
  action_id?: String | null;
  action_category_id: String;
  name: string;
  description?: string | null;
  executor_id: string;
  executor_template: ScriptOrTemplate;
  template_fields: TemplateField[];
  account_required: boolean;
  account_types?: string[] | null;
}

export interface TemplateField {
  name: string;
  format: TemplateFieldFormat;
  optional: boolean;
  description?: string | null;
}

export type TransitionTarget =
  | {
      t: "One";
      c: string;
    }
  | {
      t: "Script";
      c: string;
    };

export interface EventHandler {
  trigger_id: string;
  target?: TransitionTarget | null;
  actions?: ActionInvokeDef[] | null;
}

export interface Input {
  input_id: String;
  input_category_id?: String | null;
  name: string;
  description?: string | null;
  payload_schema: any;
}

export interface InputPayload {
  input_id?: String | null;
  input_category_id?: String | null;
  name: string;
  description?: string | null;
  payload_schema: any;
}

export type InputStatus = "pending" | "success" | "error";

export type ActionStatus = "success" | "pending" | "running" | "error";

export interface InputsLogEntry {
  inputs_log_id: string;
  task_name: string;
  task_id: String;
  input_status: InputStatus;
  input_error: any;
  task_trigger_name: string;
  task_trigger_local_id: string;
  timestamp: string;
  actions: InputLogEntryAction[];
}

export interface InputLogEntryAction {
  actions_log_id: string;
  task_action_local_id: string;
  task_action_name: string;
  result: any;
  status: ActionStatus;
  timestamp: string;
}

export interface StateDefinition {
  description?: string | null;
  on: EventHandler[];
}

export interface StateMachine {
  name: string;
  description?: string | null;
  initial: string;
  on?: EventHandler[];
  states: {
    [k: string]: StateDefinition;
  };
}

export interface StateMachineData {
  state: string;
  context: any;
}

export interface TaskDescription {
  task_id: String;
  name: string;
  description?: string | null;
  alias?: string | null;
  enabled: boolean;
  created: string;
  modified: string;
  last_triggered?: string | null;
  successes: number;
  failures: number;
  stats_since: string;
}

export type TaskConfig = {
  type: "StateMachine";
  data: StateMachine[];
};

export type TaskState = {
  type: "StateMachine";
  data: StateMachineData[];
};

export interface TaskInput {
  name: string;
  description?: string | null;
  alias?: string | null;
  enabled: boolean;
  compiled: TaskConfig;
  source: any;
  state: TaskState;
  actions: {
    [k: string]: TaskActionInput;
  };
  triggers: {
    [k: string]: TaskTriggerInput;
  };
}

export interface TaskActionInput {
  name: string;
  action_id: String;
  account_id?: String | null;
  action_template?: [string, true][] | null;
}

export interface TaskTriggerInput {
  input_id: String;
  name: string;
  description?: string | null;
}

export interface TaskResult {
  task_id: String;
  name: string;
  description?: string | null;
  alias?: string | null;
  enabled: boolean;
  task_template_version: number;
  compiled: TaskConfig;
  source: any;
  state: TaskState;
  created: string;
  modified: string;
  actions: {
    [k: string]: TaskActionInput;
  };
  triggers: {
    [k: string]: TaskTriggerInput;
  };
}

export interface TransitionCondition {
  target: string;
  cond: string;
}