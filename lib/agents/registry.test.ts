import assert from "node:assert/strict";
import test from "node:test";
import { AGENTS, WAVE_ONE, WORKFLOWS, getWorkflow } from "./registry";

test("registers all fourteen specialized agents", () => {
  assert.equal(AGENTS.length, 14);
  for (const agent of AGENTS) {
    assert.equal(agent.canSpend, false);
    assert.equal(agent.canPublish, false);
    assert.equal(agent.canSign, false);
    assert.equal(agent.canAlterOwnership, false);
    assert.ok(agent.workflows.length >= 1);
  }
});

test("wave one workflows are enabled and wired", () => {
  for (const id of WAVE_ONE) {
    const workflow = getWorkflow(id);
    assert.ok(workflow);
    assert.equal(workflow!.enabled, true);
    assert.equal(typeof workflow!.run, "function");
  }
});

test("every workflow points at a known agent", () => {
  const ids = new Set(AGENTS.map((agent) => agent.id));
  for (const workflow of WORKFLOWS) {
    assert.ok(ids.has(workflow.agentId), workflow.id);
  }
});
