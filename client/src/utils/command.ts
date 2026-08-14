import { PgCommon } from "./common";
import { PgTerminal } from "./terminal";
import type { Arrayable, Disposable, Getable, SyncOrAsync } from "./types";

/** Terminal command creation parameter */
export type CommandParam<
  N extends string,
  A extends Arg[],
  O extends Option[],
  S,
  R
> = {
  /** Name of the command that will be used in terminal */
  name: N;
  /** Description that will be seen in the `help` command */
  description: string;
  /* Only process the command if the condition passes */
  preChecks?: Arrayable<() => SyncOrAsync<void>>;
} & (WithSubcommands<S> | WithHandle<A, O, R>);

type WithSubcommands<S> = {
  /** Command arguments */
  args?: never;
  /** Command options */
  options?: never;
  /** Function to run when the command is called */
  handle?: never;
  /** Subcommands */
  subcommands?: S;
};

type WithHandle<A, O, R> = {
  /** Command arguments */
  args?: A;
  /** Command options */
  options?: O;
  /** Function to run when the command is called */
  handle: (input: ParsedInput<A, O>) => R;
  /** Subcommands */
  subcommands?: never;
};

type ParsedInput<A, O> = {
  /** Raw input */
  raw: string;
  /** Parsed arguments */
  args: ParsedArgs<A>;
  /** Parsed options */
  options: ParsedOptions<O>;
};

/** Recursively map argument types */
type ParsedArgs<A> = A extends [infer Head, ...infer Tail]
  ? Head extends Arg<infer N, infer V, infer P>
    ? (Head["optional"] extends true
        ? {
            [K in N]?: ArgValue<Head, V, P>;
          }
        : {
            [K in N]: ArgValue<Head, V, P>;
          }) &
        ParsedArgs<Tail>
    : never
  : {};

type ArgValue<A extends Arg, V, P> = A["multiple"] extends true
  ? A["parse"] extends NonNullable<A["parse"]>
    ? P[]
    : V[]
  : A["parse"] extends NonNullable<A["parse"]>
  ? P
  : V;

/** Recursively map option types */
type ParsedOptions<O> = O extends [infer Head, ...infer Tail]
  ? Head extends Option<infer N, infer V, infer P>
    ? (Head["takeValue"] extends true
        ? { [K in N]?: OptionValue<Head, V, P> }
        : { [K in N]?: boolean }) &
        ParsedOptions<Tail>
    : never
  : {};

type OptionValue<O extends Option, V, P> = O["parse"] extends NonNullable<
  O["parse"]
>
  ? P
  : V;

/** Command argument */
export type Arg<
  N extends string = string,
  V extends string = string,
  P = unknown
> = {
  /** Name of the argument */
  name: N;
  /** Description of the argument */
  description?: string;
  /** Whether the argument can be omitted */
  optional?: boolean;
  /** Whether to take multiple values */
  multiple?: boolean;
  /** Accepted values */
  values?: V[] | ((token: string, tokens: string[]) => V[]);
  /** Parse the argument */
  parse?: (token: string, tokens: string[]) => P;
};

/** Command option */
export type Option<
  N extends string = string,
  V extends string = string,
  P = unknown
> = {
  /** Name of the option */
  name: N;
  /** Description of the option */
  description?: string;
  /** Short form of the option passed with a single dash (`-`) */
  short?: boolean | string;
} & (
  | {
      /** Whether to take value for the option */
      takeValue: true;
      /** Accepted values */
      values?: Getable<V[]>;
      /** Parse the option */
      parse?: (token: string, tokens: string[]) => P;
    }
  | {
      takeValue?: never;
      values?: never;
      parse?: never;
    }
);

/** Inferred terminal command implementation */
export type Command<
  N extends string,
  A extends Arg[],
  O extends Option[],
  S,
  R
> = Omit<CommandParam<N, A, O, S, R>, "subcommands"> & {
  subcommands?: S extends Command<
    infer N2,
    infer A2,
    infer O2,
    infer S2,
    infer R2
  >
    ? Command<N2, A2, O2, S2, R2>
    : any[];
};

/** Executable command type for external usage */
type ExecutableCommand<
  N extends string = string,
  A extends Arg[] = Arg[],
  O extends Option[] = Option[],
  S = unknown,
  R = unknown
> = Pick<Command<N, A, O, S, R>, "name"> & {
  /** Process the command. */
  execute(...args: string[]): Promise<Awaited<R>>;
  /**
   * @param cb callback function to run when the command starts running
   * @returns a dispose function to clear the event
   */
  onDidStart(cb: (input: string | null) => void): Disposable;
  /**
   * @param cb callback function to run when the command finishes running
   * @returns a dispose function to clear the event
   */
  onDidFinish(
    cb: (
      result: { ok: Awaited<R>; err?: never } | { err: Error; ok?: never }
    ) => void
  ): Disposable;
};

/** Name of all the available commands (only code) */
type CommandCodeName = keyof InternalCommands;

/** Ready to be used commands */
type Commands = {
  [N in CommandCodeName]: InternalCommands[N] extends Command<
    infer N,
    infer A,
    infer O,
    infer S,
    infer R
  >
    ? ExecutableCommand<N, A, O, S, R>
    : never;
};

/** All commands */
export const PgCommand: Commands = new Proxy({} as any, {
  get: (
    target: { [K in CommandCodeName]?: ExecutableCommand },
    cmdCodeName: CommandCodeName
  ) => {
    if (!target[cmdCodeName]) {
      const name = PgCommandManager.all[cmdCodeName].name;
      target[cmdCodeName] = {
        name,
        execute: (...args) => PgCommandManager.execute([name, ...args]),
        onDidStart: (cb) => PgCommandManager.onDidStart(name, cb),
        onDidFinish: (cb) => PgCommandManager.onDidFinish(name, cb),
      };
    }

    return target[cmdCodeName];
  },
});

/**
 * Terminal command manager.
 *
 * This is intended for internal usage. Running commands should be done with
 * `PgCommand` instead.
 */
export class PgCommandManager {
  /** All internal commands */
  static all: InternalCommands;

  /**
   * Get the available command names.
   *
   * @returns the command names
   */
  static getNames() {
    return Object.values(this.all).map((cmd) => cmd.name);
  }

  /**
   * Get the available command completions.
   *
   * @returns the command completions
   */
  static getCompletions() {
    type CompletionArg = { values?: Getable<string[]>; multiple?: boolean };
    type CompletionOption = { takeValue?: boolean; other?: string };
    interface Completions {
      [key: string]: Completions | CompletionArg | CompletionOption;
    }
    const recursivelyGetCompletions = (
      commands: Command<string, any[], any[], any[], any>[],
      completions: Completions = {}
    ) => {
      for (const cmd of commands) {
        completions[cmd.name] = {};
        const completion = completions[cmd.name] as Completions;
        if (cmd.subcommands) {
          recursivelyGetCompletions(cmd.subcommands, completion);
        }
        if (cmd.args) {
          for (const [i, arg] of Object.entries(cmd.args)) {
            completion[i] = { values: arg.values, multiple: arg.multiple };
          }
        }
        if (cmd.options) {
          for (const opt of cmd.options) {
            const long = `--${opt.name}`;
            completion[long] = { takeValue: opt.takeValue, values: opt.values };

            if (opt.short) {
              const short = `-${opt.short}`;
              completion[long] = { ...completion[long], other: short };
              completion[short] = {
                ...completion[long],
                other: long,
              };
            }
          }
        }
      }

      return completions;
    };

    return recursivelyGetCompletions(Object.values(PgCommandManager.all));
  }

  /**
   * Execute from the given tokens.
   *
   * All command processing logic happens in this method.
   *
   * @param tokens parsed input tokens
   * @returns the return value of the command
   */
  static async execute(tokens: string[]) {
    return await PgTerminal.process(async () => {
      const inputCmdName = tokens.at(0);
      if (!inputCmdName) return;

      const topCmd = Object.values(PgCommandManager.all).find(
        (cmd) => cmd.name === inputCmdName
      );
      if (!topCmd) {
        throw new Error(
          `Command \`${PgTerminal.italic(inputCmdName)}\` not found.`
        );
      }

      const input = tokens.join(" ");

      // Dispatch start event
      const eventNames = PgCommandManager._getEventNames(topCmd.name);
      PgCommon.createAndDispatchCustomEvent(eventNames.start, input);

      let cmd: Command<string, Arg[], Option[], any[], any> = topCmd;
      const args: string[] = [];
      const opts: string[] = [];

      for (const i in tokens) {
        const token = tokens[i];
        const nextIndex = +i + 1;
        const nextToken = tokens.at(nextIndex);
        const subcmd = cmd.subcommands?.find((cmd) => cmd.name === token);
        if (subcmd) cmd = subcmd;

        // Handle checks
        if (cmd.preChecks) {
          const preChecks = PgCommon.toArray(cmd.preChecks);
          for (const preCheck of preChecks) await preCheck();
        }

        // Early continue if it's not the end of the command
        const isLast = +i === tokens.length - 1;
        const isNextTokenSubcmd = cmd.subcommands?.some(
          (cmd) => cmd.name === nextToken
        );
        if (!isLast && isNextTokenSubcmd) continue;

        // Check missing command processor
        if (!cmd.handle) {
          printSubcommandHelp(cmd, tokens, +i);
          break;
        }

        const hasArgsOrOptions = Boolean(
          cmd.args?.length || (cmd.options?.length ?? 0) > 1
        );
        if (hasArgsOrOptions) {
          if (nextToken === "--help" || nextToken === "-h") {
            printCommandHelp(cmd, tokens, +i);
            return;
          }

          if (nextToken && !isNextTokenSubcmd) {
            collectArgsAndOptions(cmd, tokens, nextIndex, args, opts);
          }
        }

        const parsedArgs = parseArguments(cmd.args, args, tokens);
        const parsedOpts = parseOptions(cmd.options, opts, tokens);

        // Run the command processor
        let result;
        try {
          const ret = await cmd.handle({
            raw: input,
            args: parsedArgs,
            options: parsedOpts,
          });
          result = { ok: ret };
          return ret;
        } catch (e) {
          result = { err: e };
          throw e;
        } finally {
          PgCommon.createAndDispatchCustomEvent(eventNames.finish, result);
        }
      }
    });
  }

  /**
   * Runs after the command starts execution.
   *
   * @param name command name
   * @returns a disposable to clear the event listener
   */
  static onDidStart(
    name: string,
    ...params: Parameters<ExecutableCommand["onDidStart"]>
  ) {
    return PgCommon.onDidChange(this._getEventNames(name).start, ...params);
  }

  /**
   * Runs after the command finishes execution.
   *
   * @param name command name
   * @returns a disposable to clear the event listener
   */
  static onDidFinish(
    name: string,
    ...params: Parameters<ExecutableCommand["onDidFinish"]>
  ) {
    return PgCommon.onDidChange(this._getEventNames(name).finish, ...params);
  }

  /** Get custom event names of the given command. */
  private static _getEventNames(name: string) {
    return {
      start: "ondidrunstart" + name,
      finish: "ondidrunfinish" + name,
    };
  }
}

type AnyCommand = Command<string, Arg[], Option[], any[], any>;

const printSubcommandHelp = (
  command: AnyCommand,
  tokens: string[],
  commandIndex: number
) => {
  PgTerminal.println(`
${command.description}

Usage: ${[...tokens.slice(0, commandIndex), command.name].join(" ")} <COMMAND>

Commands:

${PgTerminal.formatList(command.subcommands!)}`);
};

const printCommandHelp = (
  command: AnyCommand,
  tokens: string[],
  commandIndex: number
) => {
  const usagePrefix = `Usage: ${[
    ...tokens.slice(0, commandIndex),
    command.name,
  ].join(" ")} [OPTIONS]`;
  const lines = [command.description];

  if (command.subcommands) {
    lines.push(
      `${usagePrefix} <COMMAND>`,
      "Commands:",
      PgTerminal.formatList(command.subcommands)
    );
  }
  if (command.args) {
    const usageArgs = command.args.map(formatArgumentName).join(" ");
    const argumentList = command.args.map((argument) => [
      formatArgumentName(argument),
      (argument.description ?? "") +
        (Array.isArray(argument.values)
          ? ` (possible values: ${argument.values.join(", ")})`
          : ""),
    ]);
    lines.push(
      `${usagePrefix} ${usageArgs}`,
      "Arguments:",
      PgTerminal.formatList(argumentList)
    );
  }
  if (command.options) {
    const optionList = command.options.map((option) => [
      `${option.short ? `-${option.short}, ` : ""}--${option.name} ${
        option.takeValue ? `<${option.name.toUpperCase()}>` : ""
      }`,
      option.description ?? "",
    ]);
    lines.push("Options:", PgTerminal.formatList(optionList));
  }

  PgTerminal.println(lines.join("\n\n"));
};

const formatArgumentName = (argument: Arg) => {
  const name = argument.name.toUpperCase();
  return argument.multiple ? `[${name}]` : `<${name}>`;
};

const collectArgsAndOptions = (
  command: AnyCommand,
  tokens: string[],
  startIndex: number,
  args: string[],
  options: string[]
) => {
  let takeOptionValue = false;
  for (const token of tokens.slice(startIndex)) {
    if (takeOptionValue) {
      options.push(token);
      takeOptionValue = false;
      continue;
    }

    if (token.startsWith("-") && command.options) {
      const option = command.options.find(
        (candidate) =>
          `--${candidate.name}` === token || `-${candidate.short}` === token
      );
      if (!option) throw new Error(`Unexpected option: \`${token}\``);
      options.push(token);
      takeOptionValue = !!option.takeValue;
    } else if (command.args) {
      args.push(token);
    }
  }

  const nextToken = tokens[startIndex];
  if (!command.args && command.subcommands) {
    if (nextToken.startsWith("-")) {
      throw new Error(`Unexpected option: \`${nextToken}\``);
    }
    throw new Error(
      `Subcommand doesn't exist: \`${nextToken}\`\n\nAvailable subcommands: ${command.subcommands
        .map((subcommand) => subcommand.name)
        .join(", ")}`
    );
  }
  if (
    args.length > (command.args?.length ?? 0) &&
    !command.args?.at(-1)?.multiple
  ) {
    throw new Error(
      `Provided argument count is higher than expected: ${args.length}`
    );
  }
};

const parseArguments = (
  definitions: Arg[] | undefined,
  args: string[],
  tokens: string[]
) => {
  const parsed: Record<string, Arrayable<unknown>> = {};
  definitions?.forEach((argument, index) => {
    const inputArgs = argument.multiple
      ? args.slice(index)
      : args[index]
      ? [args[index]]
      : [];
    if (!inputArgs.length) {
      if (!argument.optional) {
        throw new Error(`Argument not specified: \`${argument.name}\``);
      }
      return;
    }

    if (argument.values) {
      const values =
        typeof argument.values === "function"
          ? argument.values(args[index], tokens)
          : argument.values;
      const invalidValue = inputArgs.find((value) => !values.includes(value));
      if (invalidValue) {
        throw new Error(
          `Incorrect argument value given: \`${invalidValue}\` ` +
            `(possible values: ${values.join(", ")})`
        );
      }
    }

    if (argument.parse) {
      const parse = createParse("argument", argument);
      parsed[argument.name] = argument.multiple
        ? inputArgs.map((token) => parse(token, tokens))
        : parse(inputArgs[0], tokens);
    } else {
      parsed[argument.name] = argument.multiple ? inputArgs : inputArgs[0];
    }
  });
  return parsed;
};

const parseOptions = (
  definitions: Option[] | undefined,
  options: string[],
  tokens: string[]
) => {
  const parsed: Record<string, unknown> = {};
  definitions?.forEach((option) => {
    const index = options.findIndex(
      (value) => value === `--${option.name}` || value === `-${option.short}`
    );
    if (index === -1) return;

    if (!option.takeValue) {
      parsed[option.name] = true;
      return;
    }

    const value = options.at(index + 1);
    if (!value) throw new Error(`Option value not given: \`${option.name}\``);
    if (option.values) {
      const values = PgCommon.callIfNeeded(option.values);
      if (!values.includes(value)) {
        throw new Error(
          `Incorrect option value given: \`${value}\` ` +
            `(possible values: ${values.join(", ")})`
        );
      }
    }
    parsed[option.name] = option.parse
      ? createParse("option", option)(value, tokens)
      : value;
  });
  return parsed;
};

const createParse = <T extends Arg | Option>(
  kind: "argument" | "option",
  item: T
): NonNullable<T["parse"]> => {
  if (!item.parse) throw new Error(`Parse not defined: ${item.name}`);
  const parse = item.parse as (token: string, tokens: string[]) => unknown;
  return ((token: string, tokens: string[]) => {
    try {
      return parse(token, tokens);
    } catch (error: any) {
      throw new Error(
        `Failed to parse ${kind}: \`${item.name}\`${
          error.message ? `: ${error.message}` : ""
        }`
      );
    }
  }) as NonNullable<T["parse"]>;
};
