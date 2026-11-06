import { useAuthStore } from '@/stores/authStore';
import { can } from '@/utils/permissions';
export function Can({module,action='read',children,fallback=null}) {
 const user=useAuthStore(s=>s.user); return can(user,module,action)?children:fallback;
}
export default function RoleGuard({allowedRoles,permission,children,fallback=null}) {
 const user=useAuthStore(s=>s.user);
 return user && (!allowedRoles || allowedRoles.includes(user.role)) && (!permission || can(user,...permission.split(':'))) ? children : fallback;
}
export function PermissionButton({permission, permissionsAny, ...props}) {
 const user=useAuthStore(s=>s.user);
 if (permission && !can(user,...permission.split(':'))) return null;
 if (permissionsAny && !permissionsAny.some(p=>can(user,...p.split(':')))) return null;
 return <button {...props}/>;
}

