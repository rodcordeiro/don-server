// src/main.ts

import { Bootstrap } from "./bootstrap/bootstrap";

try {
  Bootstrap.start();
} catch (error) {
  console.error("[bootstrap.error]", error);
  process.exit(1);
}
