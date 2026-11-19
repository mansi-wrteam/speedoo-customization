#!/usr/bin/env node
// Proves that a JavaScript → TypeScript conversion changed types only.
//
// For every .ts/.tsx file under src/ it finds the original at a git ref (the
// same path, or the same path with .js/.jsx), strips the TypeScript types from
// the new file, prints both old and new code in one canonical format (comments
// and formatting ignored) and compares them. Any difference means runtime code
// changed and the file fails.
//
// Brand-new files with no original (e.g. src/types/**) must emit no runtime
// code at all.
//
// Usage:
//   node scripts/verify-type-only.mjs                   # all src .ts/.tsx vs HEAD
//   node scripts/verify-type-only.mjs --base fd06d3f    # compare against another ref
//   node scripts/verify-type-only.mjs src/utils/a.ts    # only these files
//   node scripts/verify-type-only.mjs --pair old.js new.ts   # two files on disk
//
// Documented, approved runtime changes (plan §6.2) go in
// scripts/verify-type-only.allow.json as { "<path>": "<reason>" }; they are
// still reported but don't fail the run.
//
// Conversion rules this enforces:
//   - use `import type` for type-only imports (verbatimModuleSyntax: a plain
//     import that is only used as a type still counts as a runtime import)
//   - no enums, namespaces, parameter properties, or class fields that only
//     carry a type (use `declare field: T`) — they all emit code
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const base = opt("--base") || "HEAD";
const pairIdx = args.indexOf("--pair");
const pair = pairIdx === -1 ? null : args.splice(pairIdx, 3).slice(1);
const root = process.cwd();

const allowFile = path.join(root, "scripts/verify-type-only.allow.json");
const allow = fs.existsSync(allowFile) ? JSON.parse(fs.readFileSync(allowFile, "utf8")) : {};

// ---------------------------------------------------------------- helpers ---

const gitShow = (ref, file) => {
  try {
    // cat-file, not show: for a missing path containing [brackets] (dynamic routes),
    // `git show rev:path` falls back to a glob pathspec and prints nothing with exit 0.
    return execFileSync("git", ["cat-file", "-p", `${ref}:${file}`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
};

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });

/** Strip TypeScript syntax, keeping every runtime import exactly as written. */
export const stripTypes = (code, fileName) =>
  ts.transpileModule(code, {
    fileName,
    reportDiagnostics: false,
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.Preserve,
      verbatimModuleSyntax: true,
      useDefineForClassFields: true,
      removeComments: true,
    },
  }).outputText;

/**
 * JSX text the way React sees it (same rule as Babel's
 * cleanJSXElementLiteralChild): lines are trimmed at the line breaks and
 * whitespace-only lines disappear, so re-wrapping markup over several lines
 * doesn't count as a change. Returns "" when the text has no effect.
 */
const cleanJsxText = (value) => {
  const lines = value.split(/\r\n|\n|\r/);
  let lastNonEmpty = 0;
  lines.forEach((l, i) => {
    if (/[^ \t]/.test(l)) lastNonEmpty = i;
  });
  let str = "";
  lines.forEach((raw, i) => {
    let line = raw.replace(/\t/g, " ");
    if (i !== 0) line = line.replace(/^[ ]+/, "");
    if (i !== lines.length - 1) line = line.replace(/[ ]+$/, "");
    if (line) {
      if (i !== lastNonEmpty) line += " ";
      str += line;
    }
  });
  return str;
};

/**
 * Normalisations that can never change what the program does:
 *  - parentheses around identifiers, member accesses, calls, `this`, literals
 *    and JSX (type erasure leaves `(x as T).y` as `(x).y`; formatters wrap JSX
 *    in parens)
 *  - JSX text whitespace per React's rules (see cleanJsxText)
 *  - empty JSX expression containers (`{/* comment *\/}`)
 */
const normalise = (ctx) => {
  const f = ctx.factory;
  const visit = (node) => {
    if (ts.isParenthesizedExpression(node)) {
      const inner = node.expression;
      if (
        ts.isIdentifier(inner) ||
        ts.isPropertyAccessExpression(inner) ||
        ts.isElementAccessExpression(inner) ||
        ts.isCallExpression(inner) ||
        inner.kind === ts.SyntaxKind.ThisKeyword ||
        ts.isStringLiteral(inner) ||
        ts.isNumericLiteral(inner) ||
        ts.isParenthesizedExpression(inner) ||
        ts.isJsxElement(inner) ||
        ts.isJsxSelfClosingElement(inner) ||
        ts.isJsxFragment(inner)
      ) {
        return ts.visitNode(inner, visit);
      }
    }
    if (ts.isJsxText(node)) {
      const text = cleanJsxText(node.text);
      return text ? f.createJsxText(text, false) : undefined;
    }
    if (ts.isJsxExpression(node) && !node.expression && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      return undefined;
    }
    return ts.visitEachChild(node, visit, ctx);
  };
  return (sf) => ts.visitNode(sf, visit);
};

const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });

const textKinds = new Set([
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NumericLiteral,
  ts.SyntaxKind.BigIntLiteral,
  ts.SyntaxKind.RegularExpressionLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateHead,
  ts.SyntaxKind.TemplateMiddle,
  ts.SyntaxKind.TemplateTail,
  ts.SyntaxKind.JsxText,
]);

/**
 * Structural fingerprint of a node: every node kind, identifier, operator,
 * keyword, modifier and literal value, in order — but no positions, line
 * breaks, formatting or comments. Two programs with the same fingerprint are
 * the same program.
 */
const fingerprint = (node) => {
  const parts = [];
  ts.forEachChild(
    node,
    (child) => {
      parts.push(fingerprint(child));
    },
    (list) => {
      parts.push(`[${list.map(fingerprint).join(",")}]`);
    }
  );
  let label = ts.SyntaxKind[node.kind];
  if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) label += `:${node.text}`;
  else if (textKinds.has(node.kind)) label += `:${JSON.stringify(node.text)}`;
  return parts.length ? `${label}(${parts.join(",")})` : label;
};

/**
 * Canonical form of a JS/JSX program: one entry per top-level statement, with
 * its structural fingerprint (used for the comparison) and its printed text
 * (only used to show a reviewer where a difference is).
 */
export const canonical = (code, fileName) => {
  const kind = /\.(jsx|tsx)$/.test(fileName) ? ts.ScriptKind.JSX : ts.ScriptKind.JS;
  const jsName = fileName.replace(/\.tsx$/, ".jsx").replace(/\.ts$/, ".js");
  const sf = ts.createSourceFile(jsName, code, ts.ScriptTarget.ESNext, true, kind);
  const out = ts.transform(sf, [normalise]).transformed[0];
  return out.statements.map((stmt) => ({
    key: fingerprint(stmt),
    text: printer.printNode(ts.EmitHint.Unspecified, stmt, out),
  }));
};

const sameProgram = (a, b) => a.length === b.length && a.every((s, i) => s.key === b[i].key);

/** True when a stripped file declares nothing at runtime (only `export {}` left). */
const isTypeOnly = (statements) =>
  statements.every(
    ({ key }) => key === "ExportDeclaration(NamedExports([]))" || key.startsWith("ExportDeclaration(NamedExports([]))")
  );

/** Statements that differ, shown as printed code (first/last differing index). */
const diffStatements = (a, b, maxLines = 12) => {
  let start = 0;
  while (start < a.length && start < b.length && a[start].key === b[start].key) start++;
  let endA = a.length - 1;
  let endB = b.length - 1;
  while (endA >= start && endB >= start && a[endA].key === b[endB].key) {
    endA--;
    endB--;
  }
  const lines = (stmts, sign) =>
    stmts
      .flatMap((st) => st.text.split("\n"))
      .slice(0, maxLines)
      .map((l) => `   ${sign} ${l}`);
  return [`   @@ top-level statement ${start + 1}`, ...lines(a.slice(start, endA + 1), "-"), ...lines(b.slice(start, endB + 1), "+")].join("\n");
};

// ------------------------------------------------------------------ checks ---

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
if (isMain) main();

function main() {
  const results = { ok: 0, fail: 0, allowed: 0, newTypesOnly: 0 };

  const report = (status, file, detail = "") => {
    console.log(`${status.padEnd(9)} ${file}${detail ? `\n${detail}` : ""}`);
  };

  const compare = (label, oldCode, oldName, newCode, newName) => {
    // An original that is already TypeScript is type-stripped too, so edits to
    // converted files are compared program-to-program.
    const before = canonical(/\.(ts|tsx)$/.test(oldName) ? stripTypes(oldCode, oldName) : oldCode, oldName);
    const after = canonical(stripTypes(newCode, newName), newName);
    if (sameProgram(before, after)) {
      results.ok++;
      report("OK", label);
      return;
    }
    const detail = diffStatements(before, after);
    // Allowlist entries may be keyed by the new file path or by the full label.
    const reason = allow[label] || allow[newName];
    if (reason) {
      results.allowed++;
      report("ALLOWED", label, `   reason: ${reason}\n${detail}`);
    } else {
      results.fail++;
      report("DIFF", label, detail);
    }
  };

  if (pair) {
    const [oldFile, newFile] = pair;
    compare(`${oldFile} -> ${newFile}`, fs.readFileSync(oldFile, "utf8"), oldFile, fs.readFileSync(newFile, "utf8"), newFile);
  } else {
    const files = (args.length ? args : walk(path.join(root, "src")))
      .map((f) => path.relative(root, path.resolve(root, f)))
      .filter((f) => /\.(ts|tsx)$/.test(f))
      // Declaration files emit nothing at runtime (and can't be transpiled).
      .filter((f) => !f.endsWith(".d.ts"))
      .sort();

    for (const file of files) {
      const code = fs.readFileSync(path.join(root, file), "utf8");
      const candidates = [
        file,
        file.replace(/\.tsx$/, ".jsx"),
        file.replace(/\.tsx$/, ".js"),
        file.replace(/\.ts$/, ".js"),
        file.replace(/\.ts$/, ".jsx"),
      ];
      const origName = candidates.find((c) => gitShow(base, c) !== null);

      if (!origName) {
        // New file: it may only declare types.
        const emitted = file.endsWith(".d.ts") ? [] : canonical(stripTypes(code, file), file);
        if (isTypeOnly(emitted)) {
          results.newTypesOnly++;
          report("NEW-TYPES", file);
        } else if (allow[file]) {
          results.allowed++;
          report("ALLOWED", file, `   reason: ${allow[file]}\n   (new file with runtime code)`);
        } else {
          results.fail++;
          report("NEW-CODE", file, "   new file emits runtime code — needs review / allowlist entry:\n" + emitted.flatMap((st) => st.text.split("\n")).slice(0, 8).map((l) => `   + ${l}`).join("\n"));
        }
        continue;
      }

      compare(origName === file ? file : `${origName} -> ${file}`, gitShow(base, origName), origName, code, file);
    }
  }

  console.log(
    `\n${results.ok} unchanged at runtime, ${results.newTypesOnly} new type-only files, ${results.allowed} allowed differences, ${results.fail} FAILED (base: ${pair ? "files" : base})`
  );
  process.exit(results.fail ? 1 : 0);
}
