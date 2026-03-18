export class Watcher {
  constructor(runState) {
    this.runState = runState;
  }

  recordFailure(reason) {
    this.runState.watcher.failureCount += 1;
    this.runState.watcher.consecutiveFailureCount += 1;
    this.runState.lastFailureReason = reason;
  }

  recordSuccess() {
    this.runState.watcher.consecutiveFailureCount = 0;
  }

  recordBaseline(metric) {
    this.runState.watcher.baselineMetric = metric;
    this.runState.watcher.bestMetric = metric;
  }

  recordIteration(iteration, metric, accepted) {
    this.runState.watcher.attemptedIterationKinds = [
      ...new Set([...this.runState.watcher.attemptedIterationKinds, iteration.type])
    ];

    if (accepted) {
      this.runState.watcher.bestMetric = Math.max(this.runState.watcher.bestMetric ?? Number.NEGATIVE_INFINITY, metric);
      this.runState.watcher.acceptedIterations.push(iteration.id);
      this.runState.watcher.noImprovementCount = 0;
      this.recordSuccess();
      return;
    }

    this.runState.watcher.revertedIterations.push(iteration.id);
    this.runState.watcher.noImprovementCount += 1;
    this.recordSuccess();
  }

  shouldStopAutonomous(task, config) {
    const stopConfig = {
      maxNoImprovementIterations:
        task.autonomousOptimization.stopConditions?.maxNoImprovementIterations ??
        config.autonomousOptimization.defaultMaxNoImprovementIterations,
      maxConsecutiveFailures:
        task.autonomousOptimization.stopConditions?.maxConsecutiveFailures ??
        config.autonomousOptimization.defaultMaxConsecutiveFailures
    };

    if (this.runState.watcher.consecutiveFailureCount >= stopConfig.maxConsecutiveFailures) {
      return {
        stop: true,
        reason: "Consecutive failure threshold reached."
      };
    }

    if (this.runState.watcher.noImprovementCount >= stopConfig.maxNoImprovementIterations) {
      return {
        stop: true,
        reason: "No-improvement threshold reached."
      };
    }

    return {
      stop: false,
      reason: null
    };
  }
}
