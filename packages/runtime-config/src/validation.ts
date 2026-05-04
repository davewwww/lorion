import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import type { RuntimeConfigContext } from './types';

export type RuntimeConfigValidationMode = 'none' | 'optional' | 'startup' | 'onUse';

export type RuntimeConfigValidationPolicy = {
  validation?: RuntimeConfigValidationMode;
};

export type RuntimeConfigValidationSchemaRegistry = Record<string, object>;

export type RuntimeConfigValidationErrorTarget = {
  scopeId: string;
};

export type RuntimeConfigValidationErrorFormatter = (
  target: RuntimeConfigValidationErrorTarget,
  validationError: ErrorObject,
) => Error;

export type RuntimeConfigValidationPolicyInput =
  | RuntimeConfigValidationMode
  | RuntimeConfigValidationPolicy
  | undefined;

export const defaultRuntimeConfigValidationMode: RuntimeConfigValidationMode = 'optional';

export function resolveRuntimeConfigValidationMode(
  input: RuntimeConfigValidationPolicyInput,
): RuntimeConfigValidationMode {
  return typeof input === 'string'
    ? input
    : (input?.validation ?? defaultRuntimeConfigValidationMode);
}

export function shouldRegisterRuntimeConfigValidationSchema(
  input: RuntimeConfigValidationPolicyInput,
): boolean {
  return resolveRuntimeConfigValidationMode(input) !== 'none';
}

export function shouldValidateRuntimeConfigAtStartup(
  input: RuntimeConfigValidationPolicyInput,
): boolean {
  const mode = resolveRuntimeConfigValidationMode(input);

  return mode !== 'none' && mode !== 'onUse';
}

export function shouldRequireRuntimeConfigAtStartup(
  input: RuntimeConfigValidationPolicyInput,
): boolean {
  return resolveRuntimeConfigValidationMode(input) === 'startup';
}

function formatDefaultRuntimeConfigValidationError(
  target: RuntimeConfigValidationErrorTarget,
  validationError: ErrorObject,
): Error {
  const jsonPath = validationError.instancePath || '/';
  const schemaError = `${validationError.keyword}${validationError.message ? `: ${validationError.message}` : ''}`;

  return new Error(
    [
      'RuntimeConfig schema validation failed.',
      `Scope: ${target.scopeId}`,
      `JSON path: ${jsonPath}`,
      `Schema error: ${schemaError}`,
    ].join('\n'),
  );
}

export class RuntimeConfigValidatorRegistry {
  readonly #cache = new Map<string, ValidateFunction>();
  readonly #formatError: RuntimeConfigValidationErrorFormatter;
  readonly #schemas: RuntimeConfigValidationSchemaRegistry;

  constructor(
    schemas: RuntimeConfigValidationSchemaRegistry,
    options: {
      formatError?: RuntimeConfigValidationErrorFormatter;
    } = {},
  ) {
    this.#formatError = options.formatError ?? formatDefaultRuntimeConfigValidationError;
    this.#schemas = schemas;
  }

  get(scopeId: string): ValidateFunction {
    const schema = this.#schemas[scopeId];

    if (!schema) {
      throw new Error(`RuntimeConfig validation schema not registered for scope "${scopeId}".`);
    }

    const cached = this.#cache.get(scopeId);
    if (cached) return cached;

    const validate = new Ajv({ strict: false, allErrors: false }).compile(schema);
    this.#cache.set(scopeId, validate);

    return validate;
  }

  assert(scopeId: string, fragment: RuntimeConfigContext): void {
    const validate = this.get(scopeId);

    if (validate(fragment)) return;

    const validationError = validate.errors?.[0];

    if (!validationError) {
      throw new Error(`RuntimeConfig schema validation failed for scope "${scopeId}".`);
    }

    throw this.#formatError({ scopeId }, validationError);
  }
}

export function createRuntimeConfigValidatorRegistry(
  schemas: RuntimeConfigValidationSchemaRegistry,
  options: {
    formatError?: RuntimeConfigValidationErrorFormatter;
  } = {},
): RuntimeConfigValidatorRegistry {
  return new RuntimeConfigValidatorRegistry(schemas, options);
}
