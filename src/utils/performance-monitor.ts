/**
 * Performance monitoring utilities
 */

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  avgRenderTime: number;
  slowRenders: number;
}

const componentMetrics = new Map<string, PerformanceMetrics>();

/**
 * Monitor component render performance
 */
export function trackRender(componentName: string) {
  if (process.env.NODE_ENV !== 'development') return;
  
  const startTime = performance.now();
  
  return () => {
    const duration = performance.now() - startTime;
    const current = componentMetrics.get(componentName) || {
      renderCount: 0,
      lastRenderTime: 0,
      avgRenderTime: 0,
      slowRenders: 0
    };
    
    const newCount = current.renderCount + 1;
    const newAvg = ((current.avgRenderTime * current.renderCount) + duration) / newCount;
    const isSlow = duration > 16; // > 16ms is slow
    
    componentMetrics.set(componentName, {
      renderCount: newCount,
      lastRenderTime: duration,
      avgRenderTime: newAvg,
      slowRenders: current.slowRenders + (isSlow ? 1 : 0)
    });
    
    // Warn about slow renders
    if (isSlow) {
      console.warn(`🐌 Slow render: ${componentName} took ${duration.toFixed(2)}ms`);
    }
    
    // Warn about excessive re-renders
    if (newCount > 100 && newCount % 50 === 0) {
      console.warn(`🔄 ${componentName} has rendered ${newCount} times`);
    }
  };
}

/**
 * Get performance report for all components
 */
export function getPerformanceReport(): Record<string, PerformanceMetrics> {
  if (process.env.NODE_ENV !== 'development') return {};
  
  const report: Record<string, PerformanceMetrics> = {};
  
  componentMetrics.forEach((metrics, name) => {
    report[name] = { ...metrics };
  });
  
  return report;
}

/**
 * Clear performance metrics
 */
export function clearMetrics() {
  componentMetrics.clear();
}

/**
 * Log performance summary
 */
export function logPerformanceSummary() {
  if (process.env.NODE_ENV !== 'development') return;
  
  const report = getPerformanceReport();
  const components = Object.entries(report);
  
  if (components.length === 0) return;
  
  console.group('📊 Performance Summary');
  
  // Sort by render count
  components
    .sort(([,a], [,b]) => b.renderCount - a.renderCount)
    .slice(0, 10) // Top 10
    .forEach(([name, metrics]) => {
      const slowPercent = ((metrics.slowRenders / metrics.renderCount) * 100).toFixed(1);
      console.log(
        `${name}: ${metrics.renderCount} renders, ${metrics.avgRenderTime.toFixed(2)}ms avg, ${slowPercent}% slow`
      );
    });
  
  console.groupEnd();
}