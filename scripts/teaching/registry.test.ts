// @vitest-environment node
import { expect, it } from 'vitest';
import { loadProjects } from '../teaching-projects.mjs';

it('registers every buildable project and identifies the interaction-tested projects', async () => {
  const projects = await loadProjects();
  expect(projects.length).toBeGreaterThanOrEqual(8);
  expect(projects.filter((project) => project.verification === 'interaction').map((project) => project.id).sort())
    .toEqual(['climate-control-2050', 'expression-merge', 'math-city-builder', 'physics-accident-bureau', 'wenyan-detective']);
});
