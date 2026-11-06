import { mkdir } from "node:fs/promises";

export default async function setup() {
  await mkdir(new URL("../../test-results/screenshots/", import.meta.url), {
    recursive: true,
  });
}
