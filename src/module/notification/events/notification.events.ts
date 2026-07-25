export class TaskAssignedEvent {
  taskId!: string;
  title!: string;
  assigneeId!: string;
  actorId!: string;
  actorName!: string;
  workspaceId!: string;
  projectId!: string;
  boardId!: string;
  columnId!: string;
}

export class CommentMentionEvent {
  commentId!: string;
  taskId!: string;
  taskTitle!: string;
  mentionedUserId!: string;
  actorId!: string;
  actorName!: string;
  workspaceId!: string;
  projectId!: string;
  boardId!: string;
  columnId!: string;
}

export class WorkspaceInvitationEvent {
  workspaceId!: string;
  workspaceName!: string;
  invitedUserId!: string;
  actorId!: string;
  actorName!: string;
}
