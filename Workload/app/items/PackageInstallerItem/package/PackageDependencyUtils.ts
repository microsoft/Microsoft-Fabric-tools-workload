import { DeploymentVariables, PackageItem, PackageItemDependency } from "../PackageInstallerItemModel";

/**
 * Error thrown when circular dependencies are detected during package item sorting.
 */
export class CircularDependencyError extends Error {
  constructor(public readonly cycle: string[]) {
    super(`Circular dependency detected: ${cycle.join(' -> ')}`);
    this.name = 'CircularDependencyError';
  }
}

/**
 * Sorts an array of PackageItems based on their dependencies using topological sorting.
 * Items without dependencies are placed first, followed by dependent items in correct order.
 * 
 * @param items - Array of PackageItems to sort
 * @param currentWorkspaceId - Optional workspace ID for resolving relative dependencies
 * @returns Sorted array of PackageItems with dependencies resolved
 * @throws {CircularDependencyError} When circular dependencies are detected
 * 
 * @example
 * ```typescript
 * const items: PackageItem[] = [
 *   { displayName: "ItemC", dependsOn: [{ itemId: "ItemB" }] },
 *   { displayName: "ItemA" }, // No dependencies - dependsOn can be omitted
 *   { displayName: "ItemB", dependsOn: [{ itemId: "ItemA" }] },
 *   { displayName: "ItemD", dependsOn: [] } // Empty dependencies array
 * ];
 * 
 * const sorted = sortPackageItemsByDependencies(items);
 * // Result: [ItemA, ItemD, ItemB, ItemC]
 * ```
 */
export function sortPackageItemsByDependencies(
  items: PackageItem[], 
  currentWorkspaceId?: string
): PackageItem[] {
  if (!items || items.length === 0) {
    return [];
  }

  // Create a map for quick item lookup
  const itemMap = new Map<string, PackageItem>();
  const itemsByKey = new Map<string, PackageItem>();
  
  // Build lookup maps using display name as identifier
  items.forEach(item => {
    const key = item.displayName;
    itemMap.set(key, item);
    itemsByKey.set(key, item);
  });

  // Build dependency graph
  const dependencyGraph = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();
  
  // Initialize graph and in-degree counts
  items.forEach(item => {
    const key = item.displayName;
    dependencyGraph.set(key, new Set());
    inDegree.set(key, 0);
  });

  // Build edges and calculate in-degrees
  items.forEach(item => {
    const itemKey = item.displayName;
    const dependencies = item.dependsOn || [];
    
    dependencies.forEach(dep => {
      // Resolve dependency key - use itemId as the key for now
      // In a real scenario, you might want to match by actual item properties
      const depKey = findDependencyKey(dep, items, currentWorkspaceId);
      
      if (depKey && itemsByKey.has(depKey)) {
        // Add edge from dependency to current item
        dependencyGraph.get(depKey)?.add(itemKey);
        // Increase in-degree of current item
        inDegree.set(itemKey, (inDegree.get(itemKey) || 0) + 1);
      }
    });
  });

  // Kahn's algorithm for topological sorting
  const result: PackageItem[] = [];
  const queue: string[] = [];
  
  // Find all items with no dependencies (in-degree = 0)
  inDegree.forEach((degree, itemKey) => {
    if (degree === 0) {
      queue.push(itemKey);
    }
  });

  // Track visited nodes for cycle detection
  const visited = new Set<string>();
  
  while (queue.length > 0) {
    const currentKey = queue.shift()!;
    visited.add(currentKey);
    
    const currentItem = itemsByKey.get(currentKey);
    if (currentItem) {
      result.push(currentItem);
    }

    // Process all items that depend on the current item
    const dependents = dependencyGraph.get(currentKey) || new Set();
    dependents.forEach(dependentKey => {
      // Decrease in-degree
      const newInDegree = (inDegree.get(dependentKey) || 0) - 1;
      inDegree.set(dependentKey, newInDegree);
      
      // If in-degree becomes 0, add to queue
      if (newInDegree === 0) {
        queue.push(dependentKey);
      }
    });
  }

  // Check for circular dependencies
  if (result.length !== items.length) {
    const unprocessed = items
      .filter(item => !visited.has(item.displayName))
      .map(item => item.displayName);
    throw new CircularDependencyError(unprocessed);
  }

  return result;
}

/**
 * Finds the key for a dependency within the current item set.
 * Handles both relative and absolute dependencies.
 * 
 * @param dependency - The dependency to resolve
 * @param items - All available items
 * @param currentWorkspaceId - Current workspace ID for relative dependency resolution
 * @returns The key of the matching item, or null if not found
 */
function findDependencyKey(
  dependency: PackageItemDependency, 
  items: PackageItem[], 
  currentWorkspaceId?: string
): string | null {
  // For this implementation, we'll match by displayName
  
  if (dependency.workspaceId && dependency.workspaceId !== currentWorkspaceId) {
    // Absolute dependency outside current workspace - not resolvable in current set
    return null;
  }

  const depDisplayName = DeploymentVariables.getItemDisplayNameFromVariable(dependency.itemId);
  
  // Find item by matching the display name extracted from the variable format
  // The dependency.itemId is in format {{DisplayName}}, so we extract the display name
  // Also check the item type if specified in the dependency
  const matchingItem = items.find(item => 
    item.displayName === depDisplayName &&
    (dependency.itemType === undefined || dependency.itemType === item.type));
  
  return matchingItem?.displayName || null;
}

/**
 * Validates that a package has no circular dependencies.
 * 
 * @param items - Array of PackageItems to validate
 * @param currentWorkspaceId - Optional workspace ID for resolving relative dependencies
 * @returns True if no circular dependencies exist
 * @throws {CircularDependencyError} When circular dependencies are detected
 */
export function validatePackageDependencies(
  items: PackageItem[], 
  currentWorkspaceId?: string
): boolean {
  try {
    sortPackageItemsByDependencies(items, currentWorkspaceId);
    return true;
  } catch (error) {
    if (error instanceof CircularDependencyError) {
      throw error;
    }
    return false;
  }
}

/**
 * Gets all items that depend on a specific item.
 * 
 * @param targetItem - The item to find dependents for
 * @param items - All available items
 * @param currentWorkspaceId - Optional workspace ID for resolving relative dependencies
 * @returns Array of items that depend on the target item
 */
export function getItemDependents(
  targetItem: PackageItem,
  items: PackageItem[],
  currentWorkspaceId?: string
): PackageItem[] {
  const dependents: PackageItem[] = [];
  
  items.forEach(item => {
    const dependencies = item.dependsOn || [];
    const hasDependency = dependencies.some(dep => {
      const depKey = findDependencyKey(dep, items, currentWorkspaceId);
      return depKey === targetItem.displayName;
    });
    
    if (hasDependency) {
      dependents.push(item);
    }
  });
  
  return dependents;
}

/**
 * Gets all dependencies for a specific item (direct dependencies only).
 * 
 * @param targetItem - The item to find dependencies for
 * @param items - All available items
 * @param currentWorkspaceId - Optional workspace ID for resolving relative dependencies
 * @returns Array of items that the target item depends on
 */
export function getItemDependencies(
  targetItem: PackageItem,
  items: PackageItem[],
  currentWorkspaceId?: string
): PackageItem[] {
  const dependencies: PackageItem[] = [];
  const targetDependencies = targetItem.dependsOn || [];
  
  targetDependencies.forEach(dep => {
    const depKey = findDependencyKey(dep, items, currentWorkspaceId);
    if (depKey) {
      const dependencyItem = items.find(item => item.displayName === depKey);
      if (dependencyItem) {
        dependencies.push(dependencyItem);
      }
    }
  });
  
  return dependencies;
}