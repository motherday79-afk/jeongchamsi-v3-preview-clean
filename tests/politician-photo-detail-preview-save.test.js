import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync("src/app.js", "utf8");
const people = fs.readFileSync("src/views/people.js", "utf8");

function listenerBody(eventName) {
  const marker = `document.addEventListener("${eventName}", async event => {`;
  const start = app.indexOf(marker);
  assert.notEqual(start, -1, `${eventName} listener missing`);
  const next = app.indexOf("document.addEventListener(", start + marker.length);
  return app.slice(start, next === -1 ? app.length : next);
}

test("detail politician photo selection only previews; submit performs the save", () => {
  const changeBody = listenerBody("change");
  const submitBody = listenerBody("submit");

  assert.match(changeBody, /\[data-politician-photo-input\]/);
  assert.match(changeBody, /preparePoliticianPhotoPreview/);
  assert.doesNotMatch(changeBody, /savePoliticianPhotoForm\(form\)/);
  assert.match(changeBody, /data-politician-photo-save/);

  assert.match(submitBody, /form\.matches\("\[data-politician-photo-form\]"\)/);
  assert.match(submitBody, /savePoliticianPhotoForm\(form\)/);
});

test("detail politician photo editor includes an on-page preview and explicit save button", () => {
  assert.match(people, /data-politician-photo-preview/);
  assert.match(people, /data-politician-photo-save/);
  assert.match(people, /type="submit"/);
  assert.match(people, /저장/);
});
