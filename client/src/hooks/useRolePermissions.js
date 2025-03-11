import { useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Custom hook for checking user permissions based on role
 * @returns {Object} Permission utility functions and properties
 */
const useRolePermissions = () => {
  const { user } = useContext(AuthContext);
  
  // Calculate permissions based on user role
  const permissions = useMemo(() => {
    // Default permissions for unauthenticated users
    if (!user) {
      return {
        canView: false,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canManageUsers: false
      };
    }
    
    switch(user.role) {
      case 'owner':
        return {
          canView: true,
          canEdit: true,
          canCreate: true,
          canDelete: true,
          canManageUsers: true,
          canManageSubscription: true,
          isOwner: true,
          isAdmin: true,
          isViewer: false
        };
      
      case 'admin':
        return {
          canView: true,
          canEdit: true,
          canCreate: true,
          canDelete: true,
          canManageUsers: true,
          canManageSubscription: false,
          isOwner: false,
          isAdmin: true,
          isViewer: false
        };
      
      case 'user':
        return {
          canView: true,
          canEdit: true,
          canCreate: true,
          canDelete: true,
          canManageUsers: false,
          canManageSubscription: false,
          isOwner: false,
          isAdmin: false,
          isViewer: false
        };
      
      case 'viewer':
        return {
          canView: true,
          canEdit: false,
          canCreate: false,
          canDelete: false,
          canManageUsers: false,
          canManageSubscription: false,
          isOwner: false,
          isAdmin: false,
          isViewer: true
        };
      
      // Default fallback
      default:
        return {
          canView: true,
          canEdit: false,
          canCreate: false,
          canDelete: false,
          canManageUsers: false,
          canManageSubscription: false,
          isOwner: false,
          isAdmin: false,
          isViewer: false
        };
    }
  }, [user]);
  
  // Function to check if the current user has a particular role
  const hasRole = (role) => {
    if (!user) return false;
    
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    
    return user.role === role;
  };
  
  // Function to conditionally render content based on permissions
  const renderIfHasPermission = (permissionKey, component) => {
    return permissions[permissionKey] ? component : null;
  };
  
  return {
    ...permissions,
    hasRole,
    renderIfHasPermission,
    userRole: user?.role || 'guest'
  };
};

export default useRolePermissions;
