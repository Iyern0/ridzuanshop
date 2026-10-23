// Split the v50 script into top-level statements using the real parser.
//
// A statement ends at the first line where the accumulated text (from the first
// non-comment line after the previous statement) compiles on its own. V8 does
// the brace/string/regex bookkeeping, so template strings and nested blocks
// cannot fool it.
//
//   node tools/split-js.mjs <js-file> <out.json>
//
// Output: [{start, end, text}] with char offsets into the input. Concatenating
// the texts reproduces the input byte for byte - the script asserts that.

import fs from "node:fs";
import vm from "node:vm";

const [inPath, outPath] = process.argv.slice(2);
const src = fs.readFileSync(inPath, "utf8");
const lines = src.split("\n");
const lineStart = [0];
for (let k = 0; k < lines.length - 1; k++) lineStart.push(lineStart[k] + lines[k].length + 1);
const n = lines.length;

function compiles(text) {
  try {
    new vm.Script("(function(){" + text + "\n})");
    return true;
  } catch {
    return false;
  }
}

// A chunk of only comments/blank lines compiles, but it is not a statement: it
// documents the statement that follows, so it is carried into that one.
function hasCode(text) {
  return /[^\s;]/.test(
    text.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "")
  ) || /;/.test(text.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, ""));
}

const TRIVIA = /^\s*(\/\/.*|\/\*.*\*\/\s*)?$/;
const isTrivia = (l) => l.trim() === "" || /^\s*(\/\/|\/\*)/.test(l);

const stmts = [];
let i = 0;
while (i < n) {
  const start = i;
  while (i < n && isTrivia(lines[i])) i++;
  if (i === n) {
    // trailing comments/blank lines
    stmts.push({ start: lineStart[start], end: src.length, text: src.slice(lineStart[start]) });
    break;
  }
  let end = i;
  let text = "";
  for (; end < n; end++) {
    const endOff = end + 1 < n ? lineStart[end + 1] : src.length;
    text = src.slice(lineStart[start], endOff);
    if (hasCode(text) && compiles(text)) break;
  }
  if (end >= n) {
    console.error("could not close statement starting at line", start + 1, JSON.stringify(text.slice(0, 200)));
    process.exit(2);
  }
  const endOff = end + 1 < n ? lineStart[end + 1] : src.length;
  stmts.push({ start: lineStart[start], end: endOff, text: text });
  i = end + 1;
}

const rebuilt = stmts.map((s) => s.text).join("");
if (rebuilt !== src) {
  console.error("MISMATCH: rebuilt", rebuilt.length, "vs src", src.length);
  for (let k = 0; k < Math.min(rebuilt.length, src.length); k++) {
    if (rebuilt[k] !== src[k]) {
      console.error("first divergence at", k);
      console.error("rebuilt:", JSON.stringify(rebuilt.slice(Math.max(0, k - 80), k + 80)));
      console.error("src    :", JSON.stringify(src.slice(Math.max(0, k - 80), k + 80)));
      break;
    }
  }
  process.exit(1);
}

fs.writeFileSync(outPath, JSON.stringify(stmts));
console.log("statements:", stmts.length, "chars:", src.length);
