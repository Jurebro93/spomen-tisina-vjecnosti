import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { licenseAllowsEdits, stripHtml } from "../_shared/famousPortraits.ts";

Deno.test("accepts licenses that allow derivative works", () => {
  assertEquals(licenseAllowsEdits("CC BY-SA 4.0"), true);
  assertEquals(licenseAllowsEdits("CC BY 3.0"), true);
  assertEquals(licenseAllowsEdits("Public domain"), true);
  assertEquals(licenseAllowsEdits("CC0 1.0"), true);
});

Deno.test("rejects noncommercial, no-derivatives and unknown licenses", () => {
  assertEquals(licenseAllowsEdits("CC BY-NC 4.0"), false);
  assertEquals(licenseAllowsEdits("CC BY-ND 4.0"), false);
  assertEquals(licenseAllowsEdits("All rights reserved"), false);
  assertEquals(licenseAllowsEdits(""), false);
});

Deno.test("strips Wikimedia HTML metadata", () => {
  assertEquals(stripHtml('<a href="x">Jane Doe</a>&nbsp;Archive'), "Jane Doe Archive");
});