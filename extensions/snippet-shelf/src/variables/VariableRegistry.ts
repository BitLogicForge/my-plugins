import { normalizeName } from '../util/text';
import { VALUE_VARIABLES, ValueResolver } from './builtins';
import { PICKER_VARIABLES, PickerResolver } from './pickers';

/** Extra names (normalized) that map to a variable's display name. */
const ALIASES: Readonly<Record<string, string>> = {
  branch: 'current branch',
  mainbranch: 'default branch',
  origin: 'remote url',
  originurl: 'remote url',
  repo: 'repo name',
  weburl: 'repo web url',
  sha: 'head sha',
  ticket: 'branch ticket',
  operation: 'git operation',
  workspace: 'workspace folder',
  linenumber: 'line',
  filepath: 'file',
  selectedtext: 'selection',
  pickbranches: 'pick branch',
  pickconflict: 'pick conflicted file',
};

/** Finds built-in variables by name, ignoring case, spaces and punctuation. */
export class VariableRegistry {
  constructor(
    readonly values: Readonly<Record<string, ValueResolver>> = VALUE_VARIABLES,
    readonly pickers: Readonly<Record<string, PickerResolver>> = PICKER_VARIABLES,
    private readonly aliases: Readonly<Record<string, string>> = ALIASES,
  ) {}

  value(name: string): ValueResolver | undefined {
    return this.find(this.values, name);
  }

  picker(name: string): PickerResolver | undefined {
    return this.find(this.pickers, name);
  }

  private find<T>(table: Readonly<Record<string, T>>, name: string): T | undefined {
    const key = normalizeName(name);
    const display = this.aliases[key] ?? Object.keys(table).find((k) => normalizeName(k) === key);
    return display !== undefined && display in table ? table[display] : undefined;
  }
}
