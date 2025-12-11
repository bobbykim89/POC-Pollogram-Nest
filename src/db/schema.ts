import * as t from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const userRoles = t.pgEnum('user_roles', ['USER', 'MANAGER', 'ADMIN'])

export const usersTable = t.pgTable('users', {
  id: t.integer('id').primaryKey().notNull().generatedAlwaysAsIdentity(),
  email: t.varchar('email', { length: 256 }).notNull().unique(),
  password: t.text('password').notNull(),
  role: userRoles().default('USER').notNull(),
  createdAt: t.timestamp('created_at').defaultNow().notNull(),
  updatedAt: t.timestamp('updated_at').defaultNow().notNull(),
})

export const profileTable = t.pgTable('profiles', {
  id: t.integer('id').primaryKey().notNull().generatedAlwaysAsIdentity(),
  username: t.varchar('user_name', { length: 256 }).notNull().unique(),
  imageId: t.varchar('image_id', { length: 256 }),
  profileDescription: t.text('profile_description'),
  userId: t
    .integer('user_id')
    .references(() => usersTable.id)
    .notNull()
    .unique(), // One profile per user
  createdAt: t.timestamp('created_at').defaultNow().notNull(),
  updatedAt: t.timestamp('updated_at').defaultNow().notNull(),
})

export const refreshTokensTable = t.pgTable(
  'refresh_tokens',
  {
    id: t.integer('id').primaryKey().notNull().generatedAlwaysAsIdentity(),
    token: t.text('token').notNull().unique(), // hashed refresh token
    userId: t
      .integer('user_id')
      .references(() => usersTable.id, { onDelete: 'cascade' })
      .notNull(),
    expiresAt: t.timestamp('expires_at').notNull(),
    createdAt: t.timestamp('created_at').defaultNow().notNull(),
    lastUsedAt: t.timestamp('last_used_at'),
    // track device/session info
    userAgent: t.text('user_agent'),
    ipAddress: t.varchar('ip_address', { length: 45 }), // IPv6 max len
    deviceId: t.varchar('device_id', { length: 256 }), // unique device identifier
    isRevoked: t.timestamp('is_revoked'), // NULL = active, timestamp = revoked
  },
  (table) => ({
    userIdIdx: t.index('refresh_tokens_user_id_idx').on(table.userId),
    tokenIdx: t.index('refresh_tokens_token_idx').on(table.token),
    expresAtIdx: t.index('refresh_tokens_expire_at_idx').on(table.expiresAt),
  }),
)

export const postTable = t.pgTable('posts', {
  id: t.integer('id').primaryKey().notNull().generatedAlwaysAsIdentity(),
  text: t.text('text'),
  imageId: t.varchar('image_id', { length: 256 }).notNull(),
  profileId: t
    .integer('profile_id')
    .references(() => profileTable.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: t.timestamp('created_at').defaultNow().notNull(),
  updatedAt: t.timestamp('updated_at').defaultNow().notNull(),
})

export const commentTable = t.pgTable('comments', {
  id: t.integer('id').primaryKey().notNull().generatedAlwaysAsIdentity(),
  text: t.text('text').notNull(),
  profileId: t
    .integer('profile_id')
    .references(() => profileTable.id, { onDelete: 'cascade' })
    .notNull(),
  postId: t
    .integer('post_id')
    .references(() => postTable.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: t.timestamp('created_at').defaultNow().notNull(),
})

// follow/like relations
export const follow = t.pgTable(
  'follow',
  {
    followedById: t
      .integer('followed_by_id')
      .notNull()
      .references(() => profileTable.id, { onDelete: 'cascade' }),
    followingId: t
      .integer('following_id')
      .notNull()
      .references(() => profileTable.id, { onDelete: 'cascade' }),
  },
  (table) => [
    t.primaryKey({ columns: [table.followingId, table.followedById] }),
  ],
)
export const postLike = t.pgTable(
  'post_like',
  {
    profileId: t
      .integer('profile_id')
      .notNull()
      .references(() => profileTable.id, { onDelete: 'cascade' }),
    postId: t
      .integer('post_id')
      .notNull()
      .references(() => postTable.id, { onDelete: 'cascade' }),
  },
  (table) => [t.primaryKey({ columns: [table.profileId, table.postId] })],
)

export const commentLike = t.pgTable(
  'comment_like',
  {
    profileId: t
      .integer('profile_id')
      .notNull()
      .references(() => profileTable.id, { onDelete: 'cascade' }),
    commentId: t
      .integer('comment_id')
      .notNull()
      .references(() => commentTable.id, { onDelete: 'cascade' }),
  },
  (table) => [t.primaryKey({ columns: [table.profileId, table.commentId] })],
)

// relationship between tables
export const userRelations = relations(usersTable, ({ one }) => ({
  profile: one(profileTable, {
    fields: [usersTable.id],
    references: [profileTable.userId],
  }),
}))
export const refreshTokenRelations = relations(
  refreshTokensTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [refreshTokensTable.userId],
      references: [usersTable.id],
    }),
  }),
)
export const profileRelations = relations(profileTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [profileTable.userId],
    references: [usersTable.id],
  }),
  posts: many(postTable),
  comments: many(commentTable),
  following: many(follow),
  followedBy: many(follow),
  likedPosts: many(postLike),
  likedComments: many(commentLike),
}))
export const postRelations = relations(postTable, ({ one, many }) => ({
  userProfile: one(profileTable, {
    fields: [postTable.profileId],
    references: [profileTable.id],
  }),
  comments: many(commentTable),
  likedBy: many(postLike),
}))
export const commentRelations = relations(commentTable, ({ one, many }) => ({
  userProfile: one(profileTable, {
    fields: [commentTable.profileId],
    references: [profileTable.id],
  }),
  post: one(postTable, {
    fields: [commentTable.postId],
    references: [postTable.id],
  }),
  likedBy: many(commentLike),
}))
export const followRelations = relations(follow, ({ one }) => ({
  followedBy: one(profileTable, {
    fields: [follow.followedById],
    references: [profileTable.id],
  }),
  following: one(profileTable, {
    fields: [follow.followingId],
    references: [profileTable.id],
  }),
}))
export const postLikeRelations = relations(postLike, ({ one }) => ({
  profile: one(profileTable, {
    fields: [postLike.profileId],
    references: [profileTable.id],
  }),
  likedPost: one(postTable, {
    fields: [postLike.postId],
    references: [postTable.id],
  }),
}))
export const commentLikeRelations = relations(commentLike, ({ one }) => ({
  profile: one(profileTable, {
    fields: [commentLike.profileId],
    references: [profileTable.id],
  }),
  likedComment: one(commentTable, {
    fields: [commentLike.commentId],
    references: [commentTable.id],
  }),
}))
