export class CommentCreatedEvent {
  constructor(
    public readonly commentId: string,
    public readonly taskId: string,
    public readonly workspaceId: string,
    public readonly authorId: string,
    public readonly content: string,
    public readonly createdAt: Date,
  ) {}
}

export class CommentMentionEvent {
  constructor(
    public readonly commentId: string,
    public readonly taskId: string,
    public readonly workspaceId: string,
    public readonly authorId: string,
    public readonly mentionedUserId: string,
    public readonly username: string,
  ) {}
}

export class CommentUpdatedEvent {
  constructor(
    public readonly commentId: string,
    public readonly taskId: string,
    public readonly workspaceId: string,
    public readonly authorId: string,
    public readonly content: string,
    public readonly updatedAt: Date,
  ) {}
}

export class CommentDeletedEvent {
  constructor(
    public readonly commentId: string,
    public readonly taskId: string,
    public readonly workspaceId: string,
    public readonly authorId: string,
  ) {}
}
