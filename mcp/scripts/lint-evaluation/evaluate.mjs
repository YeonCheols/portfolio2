import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";

import eslintConfig from "./eslint.config.mjs";
import { probes } from "./fixtures.mjs";
import {
  consoleRules,
  coreRules,
  legacyRules,
  oxlintConfig,
} from "./profile.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const require = createRequire(import.meta.url);
const scopes = {
  backend: ["apps/backend/src"],
  console: ["apps/console/src"],
  contracts: ["packages/admin-contracts/src"],
  all: ["apps/backend/src", "apps/console/src", "packages/admin-contracts/src"],
};
const profiles = ["eslint", "native", "hybrid"];
const samples = 5;
const configFile = (profile) =>
  path.join(
    root,
    profile === "hybrid"
      ? ".oxlintrc.json"
      : `oxlint-${profile}-evaluation.json`,
  );
for (const profile of ["native", "hybrid"])
  assert.deepEqual(
    JSON.parse(fs.readFileSync(configFile(profile), "utf8")),
    oxlintConfig(profile === "hybrid"),
  );

const normalizeRule = (rule) => {
  const match = rule?.match(/^([^()]+)\(([^()]+)\)$/);
  return (match ? `${match[1]}/${match[2]}` : (rule ?? "<parser-or-directive>"))
    .replace(/^eslint\//, "")
    .replace(/^react-js\//, "react/");
};
const normalize = (data, cwd) => {
  if (Array.isArray(data)) {
    assert.ok(
      data.every((file) => !file.fatalErrorCount),
      "ESLint parsing failed",
    );
    return data.flatMap((file) =>
      file.messages.map((message) => ({
        file: path.relative(cwd, file.filePath),
        rule: normalizeRule(message.ruleId),
        severity: message.severity === 2 ? "error" : "warning",
      })),
    );
  }
  return data.diagnostics.map((item) => ({
    file: item.filename,
    rule: normalizeRule(item.code),
    severity: item.severity,
  }));
};
const run = (profile, targets, cwd = root, candidateConfig) => {
  const args = [...targets, "--format", "json"];
  const executable = path.join(
    root,
    "node_modules/.bin",
    profile === "eslint" ? "eslint" : "oxlint",
  );
  if (profile === "eslint")
    args.push(
      "--no-config-lookup",
      "--config",
      path.join(root, "scripts/lint-evaluation/eslint.config.mjs"),
    );
  else args.push("--config", candidateConfig ?? configFile(profile));
  const started = performance.now();
  const child = spawnSync(executable, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  assert.ifError(child.error);
  assert.ok(
    child.status === 0 || child.status === 1,
    `${profile} execution failed (${child.status}): ${child.stderr.slice(0, 200)}`,
  );
  let report;
  try {
    report = JSON.parse(child.stdout);
  } catch {
    throw Error(
      `${profile} invalid report: ${child.stdout.slice(0, 200)} ${child.stderr.slice(0, 200)}`,
    );
  }
  return {
    elapsedMs: +(performance.now() - started).toFixed(2),
    exitCode: child.status,
    files: Array.isArray(report) ? report.length : report.number_of_files,
    diagnostics: normalize(report, cwd),
  };
};
const counts = (items, key) => {
  const result = {};
  for (const item of items) {
    const name = key(item);
    result[name] = (result[name] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(result).sort(([a], [b]) => a.localeCompare(b)),
  );
};
const difference = (baseline, candidate) => {
  const before = counts(
    baseline,
    (item) => `${item.file}|${item.rule}|${item.severity}`,
  );
  const after = counts(
    candidate,
    (item) => `${item.file}|${item.rule}|${item.severity}`,
  );
  const missing = [],
    added = [];
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const delta = (after[key] ?? 0) - (before[key] ?? 0);
    if (delta)
      (delta < 0 ? missing : added).push({ key, count: Math.abs(delta) });
  }
  return { missing, added };
};
const evaluateProbes = async () => {
  const directory = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "mcp-oxlint-probes-")),
  );
  try {
    fs.writeFileSync(
      path.join(directory, "package.json"),
      JSON.stringify({ name: "mcp-lint-fixtures", private: true }),
    );
    for (const probe of probes) {
      const file = path.join(directory, probe.file);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, probe.code);
    }
    const lint = new ESLint({
      cwd: directory,
      overrideConfigFile: true,
      overrideConfig: eslintConfig,
    });
    const result = {
      eslint: normalize(await lint.lintFiles(scopes.all), directory),
    };
    for (const profile of ["native", "hybrid"]) {
      const config = JSON.parse(fs.readFileSync(configFile(profile), "utf8"));
      if (profile === "hybrid")
        config.overrides[0].jsPlugins[0].specifier = require.resolve(
          "eslint-plugin-react",
        );
      const file = path.join(directory, `${profile}.json`);
      fs.writeFileSync(file, JSON.stringify(config));
      const checked = run(profile, scopes.all, directory, file);
      assert.equal(
        checked.exitCode,
        1,
        `${profile}: error violations must fail`,
      );
      result[profile] = checked.diagnostics;
      const warning = run(
        profile,
        ["apps/console/src/probes/aria.tsx"],
        directory,
        file,
      );
      assert.equal(warning.exitCode, 0, `${profile}: warnings must not fail`);
      assert.ok(
        warning.diagnostics.some((item) => item.severity === "warning"),
      );
    }
    return probes.map((probe) => {
      const baseline = result.eslint.filter((item) => item.file === probe.file);
      assert.ok(
        probe.rule
          ? baseline.some((item) => item.rule === probe.rule)
          : baseline.length === 0,
        `${probe.name}: invalid ESLint fixture`,
      );
      return {
        name: probe.name,
        rule: probe.rule,
        ...Object.fromEntries(
          profiles.map((profile) => [
            profile,
            result[profile]
              .filter((item) => item.file === probe.file)
              .map((item) => item.rule),
          ]),
        ),
      };
    });
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
};

const probeResults = await evaluateProbes();
if (process.argv[2] === "--verify") {
  for (const probe of probeResults)
    assert.deepEqual(
      probe.hybrid.slice().sort(),
      probe.eslint.slice().sort(),
      `${probe.name}: production Oxlint lost coverage`,
    );
  console.log(
    `Production Oxlint verified: ${probeResults.length} fixtures; errors fail; warnings remain non-blocking.`,
  );
  process.exit(0);
}
const results = {};
for (const [scope, targets] of Object.entries(scopes)) {
  const collected = Object.fromEntries(
    profiles.map((profile) => [profile, []]),
  );
  for (let round = 0; round <= samples; round++) {
    const order = [
      ...profiles.slice(round % profiles.length),
      ...profiles.slice(0, round % profiles.length),
    ];
    for (const profile of order) collected[profile].push(run(profile, targets));
    console.log(`${scope}: initial + ${round}/${samples} warm rounds`);
  }
  results[scope] = {};
  for (const [profile, runs] of Object.entries(collected)) {
    const first = runs[0],
      warm = runs.slice(1).map((run) => run.elapsedMs);
    assert.equal(
      first.files,
      collected.eslint[0].files,
      `${scope}/${profile}: file scope mismatch`,
    );
    for (const sample of runs)
      assert.deepEqual(
        counts(sample.diagnostics, JSON.stringify),
        counts(first.diagnostics, JSON.stringify),
        `${scope}/${profile}: unstable diagnostics`,
      );
    results[scope][profile] = {
      files: first.files,
      exitCode: first.exitCode,
      initialMs: first.elapsedMs,
      warmMs: warm,
      medianMs: [...warm].sort((a, b) => a - b)[2],
      errors: first.diagnostics.filter((item) => item.severity === "error")
        .length,
      warnings: first.diagnostics.filter((item) => item.severity === "warning")
        .length,
      byRule: counts(first.diagnostics, (item) => item.rule),
      differenceFromESLint: difference(
        collected.eslint[0].diagnostics,
        first.diagnostics,
      ),
    };
  }
}
const files = spawnSync("git", ["ls-files", ...scopes.all], {
  cwd: root,
  encoding: "utf8",
})
  .stdout.trim()
  .split("\n")
  .filter((file) => /\.[jt]sx?$/.test(file));
const hash = createHash("sha256");
for (const file of files.sort())
  hash
    .update(file)
    .update("\0")
    .update(fs.readFileSync(path.join(root, file)))
    .update("\0");
const output = {
  commit: spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).stdout.trim(),
  sourceDigest: hash.digest("hex"),
  measuredAt: new Date().toISOString(),
  environment: {
    platform: process.platform,
    architecture: process.arch,
    node: process.version,
    cpu: os.cpus()[0].model,
    logicalCpus: os.cpus().length,
    eslint: require("eslint/package.json").version,
    oxlint: require("oxlint/package.json").version,
  },
  policy: {
    existingMcpLint: false,
    comparisonOnly: true,
    coreRules: Object.keys(coreRules),
    consoleRules: Object.keys(consoleRules),
    nativeMissingRules: legacyRules,
    nextjs: false,
    fsd: false,
    structuralChecks: [
      "directory-boundary.test.ts",
      "apps/backend/src/runtime-boundary.test.ts",
    ],
  },
  method: {
    warmSamples: samples,
    order: "Serial, rotating profile order",
    cache:
      "Fresh CLI process; no linter cache; OS file cache not cleared. Initial sample is not OS-cold.",
    includesTests: true,
    typeAware: false,
  },
  scopes: results,
  probes: probeResults,
  equivalentForEvaluatedCases: Object.fromEntries(
    ["native", "hybrid"].map((profile) => [
      profile,
      probeResults.every(
        (probe) =>
          JSON.stringify(probe.eslint.slice().sort()) ===
          JSON.stringify(probe[profile].slice().sort()),
      ) &&
        Object.values(results).every(
          (scope) =>
            !scope[profile].differenceFromESLint.missing.length &&
            !scope[profile].differenceFromESLint.added.length,
        ),
    ]),
  ),
};
const destination = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, "docs/oxlint-evaluation-results.json");
fs.writeFileSync(destination, JSON.stringify(output, null, 2) + "\n");
console.log(
  `Wrote ${path.relative(root, destination)}; evaluated equivalence: ${JSON.stringify(output.equivalentForEvaluatedCases)}`,
);
