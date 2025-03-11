import React, { memo } from 'react';

/**
 * Higher order component to memoize a component with custom comparison
 * @param {React.Component} Component - Component to memoize
 * @param {Function} arePropsEqual - Custom props comparison function (optional)
 * @returns {React.MemoExoticComponent} - Memoized component
 */
export const withMemoization = (Component, arePropsEqual) => {
  // If custom comparison function is provided, use it
  if (arePropsEqual) {
    return memo(Component, arePropsEqual);
  }
  
  // Otherwise use default shallow comparison
  return memo(Component);
};

/**
 * Custom comparison function for item components to avoid unnecessary re-renders
 * Only re-renders if important properties change
 */
export const itemPropsAreEqual = (prevProps, nextProps) => {
  // Always re-render if id changes
  if (prevProps.item?._id !== nextProps.item?._id) {
    return false;
  }
  
  // Check critical fields for changes
  const criticalFields = [
    'name', 
    'description', 
    'quantity', 
    'location', 
    'category', 
    'labels',
    'updatedAt'
  ];
  
  for (const field of criticalFields) {
    // Skip if field doesn't exist in either props
    if (!prevProps.item || !nextProps.item) continue;
    
    // For object fields, compare stringified versions
    if (typeof prevProps.item[field] === 'object' && typeof nextProps.item[field] === 'object') {
      if (JSON.stringify(prevProps.item[field]) !== JSON.stringify(nextProps.item[field])) {
        return false;
      }
    } 
    // For primitive fields, compare directly
    else if (prevProps.item[field] !== nextProps.item[field]) {
      return false;
    }
  }
  
  // Special handling for action handlers - only compare references
  const actionHandlers = [
    'onUpdateQuantity', 
    'onActionClick', 
    'onDelete', 
    'onArchive'
  ];
  
  for (const handler of actionHandlers) {
    if (prevProps[handler] !== nextProps[handler]) {
      return false;
    }
  }
  
  // If we got here, props are considered equal
  return true;
};

/**
 * Performance optimization wrappers for common components
 */

// Create optimized versions of components
export const OptimizedItemRow = (props) => {
  const MemoizedComponent = withMemoization(props.component, itemPropsAreEqual);
  return <MemoizedComponent {...props} />;
};
