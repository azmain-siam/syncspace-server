import { SetMetadata } from '@nestjs/common';
import { WorkspaceRole } from 'src/module/workspace/enums/workspace-role.enum';

export const WORKSPACE_ROLES_KEY = 'workspace_roles';

export const WorkspaceRoles = (...roles: WorkspaceRole[]) =>
  SetMetadata(WORKSPACE_ROLES_KEY, roles);
