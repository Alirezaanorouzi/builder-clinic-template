import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core"

export const provisionStatusEnum = pgEnum("provision_status", [
  "pending",
  "ready",
  "error",
])

export const previewRuntimeEnum = pgEnum("preview_runtime", ["local", "sandbox"])

export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
])

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Untitled project"),
  builderSessionId: uuid("builder_session_id"),
  previewUrl: text("preview_url"),
  previewRuntime: previewRuntimeEnum("preview_runtime"),
  provisionStatus: provisionStatusEnum("provision_status")
    .notNull()
    .default("pending"),
  provisionError: text("provision_error"),
  modelSelection: text("model_selection"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull().default(""),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export type User = typeof users.$inferSelect
export type Project = typeof projects.$inferSelect
export type Message = typeof messages.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type NewMessage = typeof messages.$inferInsert