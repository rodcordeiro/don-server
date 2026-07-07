// src/main.ts

import { Bootstrap } from "./bootstrap/bootstrap";

Bootstrap
  .start()
  .catch(error => {
  console.error("[bootstrap.error]", error);
  process.exit(1);
});