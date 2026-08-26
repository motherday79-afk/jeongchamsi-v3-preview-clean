import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync("src/app.js", "utf8");

function listenerBody(eventName) {
  const marker = `document.addEventListener("${eventName}", async event => {`;
  const start = app.indexOf(marker);
  assert.notEqual(start, -1, `${eventName} listener missing`);
  const next = app.indexOf("document.addEventListener(", start + marker.length);
  return app.slice(start, next === -1 ? app.length : next);
}

test("politician file selection is handled on change, not input", () => {
  const inputBody = listenerBody("input");
  const changeBody = listenerBody("change");
  assert.doesNotMatch(inputBody, /\[data-politician-photo-input\]/);
  assert.match(changeBody, /\[data-politician-photo-input\]/);
  assert.match(changeBody, /savePoliticianPhotoForm\(form\)/);
});
