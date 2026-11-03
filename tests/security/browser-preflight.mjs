import { chromium } from "@playwright/test";
import {
  assertPatchedVersion,
  secureBrowserExecutable,
} from "./browser-policy.cjs";

export default async function browserPreflight() {
  // Launch with no page or untrusted input before accepting the actual runtime.
  const browser = await chromium.launch({
    executablePath: secureBrowserExecutable(),
    chromiumSandbox: true,
  });
  try {
    const version = browser.version();
    assertPatchedVersion(version);
    console.log(`Verified Chrome runtime ${version}; sandbox requested.`);
  } finally {
    await browser.close();
  }
}
