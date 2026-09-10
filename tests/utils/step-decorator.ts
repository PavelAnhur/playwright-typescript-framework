import * as allure from 'allure-js-commons';


/**
 * Wraps an async class method in an Allure step.
 *
 * - With no argument, the step name is `methodName(arg1, arg2, ...)`.
 * - With a template, `{0}`, `{1}`, ... are replaced by the method's arguments.
 * - The wrapped method's return value is preserved.
 *
 * Only works on async methods. Do not apply to sync methods, getters,
 * or methods that return a Locator.
 *
 * @example
 *   @Step('Search for "{0}"')
 *   async searchFor(productName: string) { ... }
 *
 *   @Step()
 *   async logout() { ... }
 */
export function Step(template?: string) {
  return function <A extends unknown[], R>(
    target: (...args: A) => Promise<R>,
    context: ClassMethodDecoratorContext<
      object,
      (...args: A) => Promise<R>
    >
  ): (...args: A) => Promise<R> {
    const methodName = String(context.name);

    return async function (this: object, ...args: A): Promise<R> {
      const stepName = template
        ? interpolate(template, args)
        : defaultStepName(methodName, args);

      return allure.step(stepName, async () => {
        return target.apply(this, args);
      });
    };
  };
}

function interpolate(template: string, args: unknown[]): string {
  return template.replace(/\{(\d+)\}/g, (_, i) => {
    const value = args[Number(i)];
    return value === undefined ? `{${i}}` : stringify(value);
  });
}

function defaultStepName(methodName: string, args: unknown[]): string {
  if (args.length === 0) return methodName;
  return `${methodName}(${args.map(stringify).join(', ')})`;
}

function stringify(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
