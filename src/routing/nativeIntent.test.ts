import assert from "node:assert/strict";
import test from "node:test";

import { redirectSystemPath } from "../app/+native-intent";

test("Dropbox callback is consumed without hiding other deep links", () => {
  assert.equal(
    redirectSystemPath({
      path: "expensemanager://oauth?code=temporary-code&state=expected-state",
      initial: false,
    }),
    null
  );
  assert.equal(
    redirectSystemPath({ path: "expensemanager://history", initial: false }),
    "expensemanager://history"
  );
});
