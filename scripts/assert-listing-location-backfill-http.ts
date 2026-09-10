/**
 * Local regression: PostgREST PATCH 204 must not throw in the Fetch adapter.
 * No network. No Supabase mutation.
 */
import { buildFetchResponse } from "./listingLocationBackfillShared";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

function mockPatch204(): Response {
  return buildFetchResponse({
    status: 204,
    statusText: "No Content",
    headers: new Headers({ "content-length": "0" }),
    body: Buffer.alloc(0),
  });
}

const patchOk = mockPatch204();
assert(patchOk.status === 204, "mocked PATCH keeps status 204");
assert(patchOk.statusText === "No Content", "mocked PATCH keeps statusText");
assert(patchOk.ok, "204 is a successful response");
assert(patchOk.headers.get("content-length") === "0", "mocked PATCH keeps headers");

void (async () => {
  const text = await patchOk.text();
  assert(text === "", "204 body is empty, not an empty-string constructor argument");

  const failed = buildFetchResponse({
    status: 409,
    statusText: "Conflict",
    headers: new Headers({ "content-type": "application/json" }),
    body: Buffer.from(JSON.stringify({ message: "duplicate" }), "utf8"),
  });
  assert(failed.status === 409, "failed PATCH keeps error status");
  assert(!failed.ok, "failed PATCH is not ok");
  const err = JSON.parse(await failed.text()) as { message?: string };
  assert(err.message === "duplicate", "failed PATCH body remains readable so apply still blocks");

  const withBody = buildFetchResponse({
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "application/json" }),
    body: Buffer.from(JSON.stringify({ id: "read-back" }), "utf8"),
  });
  assert(withBody.status === 200, "read-back GET still carries a JSON body");
  const payload = JSON.parse(await withBody.text()) as { id?: string };
  assert(payload.id === "read-back", "read-back path can continue after a 204 PATCH");

  console.log("PASS mocked PATCH 204 adapter");
})().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
