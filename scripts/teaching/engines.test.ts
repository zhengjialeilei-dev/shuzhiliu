import { afterEach, expect, it, vi } from 'vitest';
import { CityEngine } from '../../project-library/all-projects/工程源码/math-city-builder/src/services/city-engine';
import { CaseEngine } from '../../project-library/all-projects/工程源码/wenyan-detective/src/services/case-engine';
import { InvestigationStore } from '../../project-library/all-projects/工程源码/physics-accident-bureau/src/services/investigation-store';
import { BrakingPhysics } from '../../project-library/all-projects/工程源码/physics-accident-bureau/src/services/braking-physics';
import { ClimateStore } from '../../project-library/all-projects/工程源码/climate-control-2050/src/services/climate-store';
import { ClimateModel } from '../../project-library/all-projects/工程源码/climate-control-2050/src/services/climate-model';
import { verdicts as caseVerdicts } from '../../project-library/all-projects/工程源码/wenyan-detective/src/data/case-file';
import { verdicts as physicsVerdicts } from '../../project-library/all-projects/工程源码/physics-accident-bureau/src/data/case-data';

afterEach(() => vi.useRealTimers());

it('only finishes a city task after a valid, still-current check', () => {
  const engine = new CityEngine();
  engine.start(); engine.openTask('market'); engine.finishTask();
  expect(engine.snapshot.completed.size).toBe(0);
  engine.updateValue('salePrice', 204); engine.checkActiveTask();
  expect(engine.snapshot.completed.size).toBe(0);
  engine.updateValue('salePrice', 200); engine.finishTask();
  expect(engine.snapshot.completed.size).toBe(0);
  engine.updateValue('salePrice', 204); engine.checkActiveTask(); engine.finishTask();
  expect(engine.snapshot.completed.has('market')).toBe(true);
});

it('protects verdict gates in the domain layer, not only disabled buttons', () => {
  const classical = new CaseEngine();
  classical.submitVerdict(caseVerdicts[0].id);
  expect(classical.snapshot.verdictId).toBeNull();
  const physics = new InvestigationStore();
  physics.submitVerdict(physicsVerdicts[0].id);
  expect(physics.snapshot.verdictId).toBeNull();
});

it('records the initial conditions and rejects mid-trial parameter/preset changes', () => {
  vi.useFakeTimers();
  const store = new InvestigationStore();
  store.loadAccidentPreset(); store.runTrial();
  store.updateInput('speedKmh', 20); store.setRoad('ice'); store.loadAccidentPreset();
  expect(store.snapshot.input.speedKmh).toBe(72);
  expect(store.snapshot.input.road).toBe('wet');
  vi.advanceTimersByTime(1600);
  expect(store.snapshot.trials).toHaveLength(1);
  expect(store.snapshot.trials[0].speedKmh).toBe(72);
  expect(store.snapshot.trials[0].reactionDistance).toBeCloseTo(28);
});

it('cancels pending trial callbacks on restart', () => {
  vi.useFakeTimers();
  const store = new InvestigationStore();
  store.runTrial(); store.restart(); vi.advanceTimersByTime(2000);
  expect(store.snapshot.trials).toHaveLength(0);
  expect(store.snapshot.simulating).toBe(false);
});

it('braking distance quadruples when speed doubles at fixed friction', () => {
  const model = new BrakingPhysics();
  const input = { speedKmh: 36, reactionTime: 1, road: 'dry' as const, availableDistance: 55 };
  const slow = model.calculate(input);
  const fast = model.calculate({ ...input, speedKmh: 72 });
  expect(fast.brakingDistance).toBeCloseTo(slow.brakingDistance * 4);
  expect(fast.reactionDistance).toBeCloseTo(slow.reactionDistance * 2);
});

it('suggested climate policy satisfies the current teaching model and restart clears it', () => {
  const store = new ClimateStore();
  const model = new ClimateModel();
  store.start(); store.loadBalancedPlan();
  expect(model.isSuccessful(model.calculate(store.snapshot.policy))).toBe(true);
  store.submit(); store.restart();
  expect(store.snapshot.submitted).toBe(false);
  expect(store.snapshot.policy.renewable).toBe(30);
});

it('subscriptions can be removed and snapshots cannot mutate stored values', () => {
  const engine = new CityEngine();
  const listener = vi.fn();
  const unsubscribe = engine.subscribe(listener);
  expect(listener).toHaveBeenCalledTimes(1);
  unsubscribe(); engine.start();
  expect(listener).toHaveBeenCalledTimes(1);
  const snapshot = engine.snapshot;
  snapshot.values.salePrice = 999; snapshot.completed.add('market');
  expect(engine.snapshot.values.salePrice).toBe(200);
  expect(engine.snapshot.completed.size).toBe(0);
});
