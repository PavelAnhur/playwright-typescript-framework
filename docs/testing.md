# Testing policy

## Locators

Preference order: role → label → text → testid → CSS → XPath.

- No absolute XPath.
- No `nth` without a contract.

### Viewport- and state-dependent visibility

Do not assert or wait for visibility on elements hidden by:

- `opacity` / `pointer-events` (e.g. `.dob-popup`);
- a collapsed mobile nav (`.nav > *` at <=560px);
- a desktop-hidden control (`.nav-toggle`).

Assert attachment, attributes, or content instead. Open the mobile menu before interacting with nav children.
