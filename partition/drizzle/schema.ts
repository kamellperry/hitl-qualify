import { pgSchema, pgEnum, pgTable, uuid, text, varchar, bigserial, timestamp, boolean, jsonb, inet, integer, bigint, index, uniqueIndex, foreignKey, primaryKey, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const accounts = pgSchema("accounts");
export const auth = pgSchema("auth");
export const campaigns = pgSchema("campaigns");
export const prospects = pgSchema("prospects");
export const qualifications = pgSchema("qualifications");
export const serviceAccounts = pgSchema("service_accounts");
export const threads = pgSchema("threads");
export const orgMemberRoleInAuth = auth.enum("org_member_role", ["owner", "admin", "member"])
export const subscriptionTierInAuth = auth.enum("subscription_tier", ["lite", "pro", "enterprise"])
export const campaignStatus = pgEnum("campaign_status", ["draft", "running", "paused", "done"])
export const platform = pgEnum("platform", ["facebook", "instagram"])
export const subscriptionStatusInAuth = auth.enum("subscription_status", ["active", "trialing", "past_due", "unpaid", "incomplete", "incomplete_expired", "canceled", "paused"])
export const qualificationAssignmentStatus = pgEnum("qualification_assignment_status", ["reserved", "completed", "expired", "released"])
export const qualificationDecision = pgEnum("qualification_decision", ["yes", "no", "maybe", "skip"])
export const userRoleInAuth = auth.enum("user_role", ["super_admin", "admin", "user", "readonly"])


export const instagramAccountsInAccounts = accounts.table("instagram_accounts", {
	id: uuid().defaultRandom().primaryKey(),
	userId: uuid("user_id").notNull(),
	username: text().notNull(),
	password: text().notNull(),
	totp: text(),
	proxy: text(),
	cookie: text(),
	createdAt: timestamp("created_at", { withTimezone: true }),
	updatedAt: timestamp("updated_at", { withTimezone: true }),
	actionNeeded: boolean("action_needed").default(false).notNull(),
}, (table) => [
	index("idx_accounts_instagram_accounts_user_id").using("btree", table.userId.asc().nullsLast()),
]);

export const accessInviteInAuth = auth.table("access_invite", {
	id: uuid().defaultRandom().primaryKey(),
	email: text().notNull(),
	tokenHash: text("token_hash").notNull(),
	accessType: text("access_type").notNull(),
	planOverride: text("plan_override"),
	metadata: jsonb().default({}).notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	maxUses: integer("max_uses").default(1).notNull(),
	usedCount: integer("used_count").default(0).notNull(),
	intendedSubject: text("intended_subject"),
	revokedAt: timestamp("revoked_at", { withTimezone: true }),
	consumedAt: timestamp("consumed_at", { withTimezone: true }),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	deletedAt: timestamp("deleted_at", { precision: 6, withTimezone: true }),
}, (table) => [
	index("access_invite_email_idx").using("btree", table.email.asc().nullsLast()),
	index("access_invite_expires_at_idx").using("btree", table.expiresAt.asc().nullsLast()),
	unique("access_invite_token_hash_unique").on(table.tokenHash),]);

export const accountInAuth = auth.table("account", {
	id: text().primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text(),
	password: text(),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	deletedAt: timestamp("deleted_at", { precision: 6, withTimezone: true }),
});

export const adminMagicLinkTokenInAuth = auth.table("admin_magic_link_token", {
	id: uuid().defaultRandom().primaryKey(),
	email: text().notNull(),
	tokenHash: text("token_hash").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	consumedAt: timestamp("consumed_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
	index("admin_magic_link_token_email_idx").using("btree", table.email.asc().nullsLast()),
	index("admin_magic_link_token_expires_idx").using("btree", table.expiresAt.asc().nullsLast()),
	uniqueIndex("admin_magic_link_token_hash_unique").using("btree", table.tokenHash.asc().nullsLast()),
]);

export const adminSessionInAuth = auth.table("admin_session", {
	id: uuid().defaultRandom().primaryKey(),
	email: text().notNull(),
	tokenHash: text("token_hash").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	revokedAt: timestamp("revoked_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
	index("admin_session_email_idx").using("btree", table.email.asc().nullsLast()),
	index("admin_session_expires_idx").using("btree", table.expiresAt.asc().nullsLast()),
	uniqueIndex("admin_session_token_hash_unique").using("btree", table.tokenHash.asc().nullsLast()),
]);

export const auditLogInAuth = auth.table("audit_log", {
	id: bigserial({ mode: 'number' }).primaryKey(),
	actorId: text("actor_id"),
	action: text().notNull(),
	subjectId: text("subject_id"),
	ip: inet(),
	userAgent: text("user_agent"),
	metadata: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("audit_log_action_idx").using("btree", table.action.asc().nullsLast()),
	index("audit_log_actor_idx").using("btree", table.actorId.asc().nullsLast()),
	index("audit_log_subject_idx").using("btree", table.subjectId.asc().nullsLast()),
]);

export const invitationInAuth = auth.table("invitation", {
	id: uuid().defaultRandom().primaryKey(),
	organizationId: uuid("organization_id").notNull().references(() => organizationInAuth.id, { onDelete: "cascade" } ),
	email: text().notNull(),
	role: orgMemberRoleInAuth().default("member").notNull(),
	token: text().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	invitedBy: text("invited_by").notNull().references(() => userInAuth.id),
	acceptedAt: timestamp("accepted_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("invitation_email_idx").using("btree", table.email.asc().nullsLast()),
	index("invitation_org_id_idx").using("btree", table.organizationId.asc().nullsLast()),
	index("invitation_token_idx").using("btree", table.token.asc().nullsLast()),
	unique("invitation_token_unique").on(table.token),]);

export const organizationInAuth = auth.table("organization", {
	id: uuid().defaultRandom().primaryKey(),
	name: text().notNull(),
	slug: text(),
	logo: text(),
	createdBy: text("created_by").notNull().references(() => userInAuth.id),
	metadata: jsonb().default({}).notNull(),
	subscriptionTier: subscriptionTierInAuth("subscription_tier").default("lite"),
	billingEmail: text("billing_email"),
	createdAt: timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("organization_created_by_idx").using("btree", table.createdBy.asc().nullsLast()),
	index("organization_slug_idx").using("btree", table.slug.asc().nullsLast()),
	unique("organization_slug_unique").on(table.slug),]);

export const organizationMemberInAuth = auth.table("organization_member", {
	id: uuid().defaultRandom().primaryKey(),
	organizationId: uuid("organization_id").notNull().references(() => organizationInAuth.id, { onDelete: "cascade" } ),
	userId: text("user_id").notNull().references(() => userInAuth.id, { onDelete: "cascade" } ),
	role: orgMemberRoleInAuth().default("member").notNull(),
	joinedAt: timestamp("joined_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	invitedBy: text("invited_by").references(() => userInAuth.id),
	createdAt: timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("org_member_org_id_idx").using("btree", table.organizationId.asc().nullsLast()),
	index("org_member_user_id_idx").using("btree", table.userId.asc().nullsLast()),
	unique("org_member_unique").on(table.organizationId, table.userId),]);

export const sessionInAuth = auth.table("session", {
	id: text().primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: text().notNull(),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull(),
	impersonatedBy: text("impersonated_by"),
	activeOrganizationId: uuid("active_organization_id"),
	fresh: boolean().default(true),
	deletedAt: timestamp("deleted_at", { precision: 6, withTimezone: true }),
}, (table) => [
	unique("session_token_unique").on(table.token),]);

export const subscriptionInAuth = auth.table("subscription", {
	id: uuid().defaultRandom().primaryKey(),
	userId: text("user_id").notNull().references(() => userInAuth.id, { onDelete: "cascade" } ),
	plan: text(),
	stripeCustomerId: text("stripe_customer_id"),
	stripeSubscriptionId: text("stripe_subscription_id"),
	status: subscriptionStatusInAuth().default("incomplete").notNull(),
	periodStart: timestamp("period_start", { withTimezone: true }),
	periodEnd: timestamp("period_end", { withTimezone: true }),
	trialStart: timestamp("trial_start", { withTimezone: true }),
	trialEnd: timestamp("trial_end", { withTimezone: true }),
	cancelAt: timestamp("cancel_at", { withTimezone: true }),
	cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
	seats: integer().default(1),
	latestInvoiceId: text("latest_invoice_id"),
	priceId: text("price_id"),
	productId: text("product_id"),
	createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
	uniqueIndex("subscription_stripe_subscription_id_unique").using("btree", table.stripeSubscriptionId.asc().nullsLast()).where(sql`(stripe_subscription_id IS NOT NULL)`),
	index("subscription_user_id_idx").using("btree", table.userId.asc().nullsLast()),
]);

export const twoFactorInAuth = auth.table("two_factor", {
	id: uuid().defaultRandom().primaryKey(),
	userId: text("user_id").notNull().references(() => userInAuth.id, { onDelete: "cascade" } ),
	secret: text().notNull(),
	backupCodes: text("backup_codes").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("two_factor_user_id_idx").using("btree", table.userId.asc().nullsLast()),
	unique("two_factor_user_id_unique").on(table.userId),]);

export const userInAuth = auth.table("user", {
	id: text().primaryKey(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: boolean("email_verified").notNull(),
	image: text(),
	createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
	role: text().notNull(),
	banned: boolean(),
	banReason: text("ban_reason"),
	banExpires: timestamp("ban_expires"),
	username: text(),
	displayUsername: text("display_username"),
	twoFactorEnabled: boolean("two_factor_enabled").default(false),
	activeOrganizationId: text("active_organization_id"),
	subscriptionTier: subscriptionTierInAuth("subscription_tier").default("lite"),
	apiKey: text("api_key"),
	bio: text(),
	phone: text(),
	location: text(),
	website: text(),
	twitter: text(),
	linkedin: text(),
	onboardingStep: text("onboarding_step"),
	onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
	stripeCustomerId: text("stripe_customer_id"),
	deletedAt: timestamp("deleted_at", { precision: 6, withTimezone: true }),
}, (table) => [
	index("email_idx").using("btree", table.email.asc().nullsLast()),
	index("id_idx").using("btree", table.id.asc().nullsLast()),
	index("username_idx").using("btree", table.username.asc().nullsLast()),
	unique("user_email_unique").on(table.email),	unique("user_username_unique").on(table.username),]);

export const userAccessInAuth = auth.table("user_access", {
	userId: text("user_id").primaryKey(),
	accessType: text("access_type").default("customer").notNull(),
	requiresBilling: boolean("requires_billing").default(true).notNull(),
	features: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	deletedAt: timestamp("deleted_at", { precision: 6, withTimezone: true }),
}, (table) => [
	index("user_access_access_type_idx").using("btree", table.accessType.asc().nullsLast()),
	index("user_access_user_id_idx").using("btree", table.userId.asc().nullsLast()),
]);

export const userPreferencesInAuth = auth.table("user_preferences", {
	id: uuid().defaultRandom().primaryKey(),
	userId: uuid("user_id").notNull(),
	theme: text().default("dark"),
	displayDensity: text("display_density").default("comfortable"),
	animationsEnabled: boolean("animations_enabled").default(true),
	reducedMotion: boolean("reduced_motion").default(false),
	notificationsEmail: boolean("notifications_email").default(false),
	notificationsPush: boolean("notifications_push").default(false),
	notificationsInApp: boolean("notifications_in_app").default(false),
	privacyAnalytics: boolean("privacy_analytics").default(false),
	privacyDataSharing: boolean("privacy_data_sharing").default(false),
	fontSize: text("font_size").default("medium"),
	highContrast: boolean("high_contrast").default(false),
	language: text().default("en"),
	createdAt: timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("user_preferences_user_id_idx").using("btree", table.userId.asc().nullsLast()),
]);

export const verificationInAuth = auth.table("verification", {
	id: text().primaryKey(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	deletedAt: timestamp("deleted_at", { precision: 6, withTimezone: true }),
});

export const campaignsInCampaigns = campaigns.table("campaigns", {
	id: uuid().defaultRandom().primaryKey(),
	userId: uuid("user_id").notNull(),
	displayName: text("display_name").notNull(),
	targetingQuery: text("targeting_query").notNull(),
	starterContext: text("starter_context").notNull(),
	isActive: boolean("is_active").default(true),
	prospectIds: text("prospect_ids").array().default([]),
	createdAt: timestamp("created_at", { withTimezone: true }),
	updatedAt: timestamp("updated_at", { withTimezone: true }),
	context: jsonb(),
}, (table) => [
	index("idx_campaigns_campaigns_context").using("btree", table.context.asc().nullsLast()),
	index("idx_campaigns_campaigns_user_id").using("btree", table.userId.asc().nullsLast()),
]);

export const instagramProspectsInProspects = prospects.table("instagram_prospects", {
	id: uuid().defaultRandom().primaryKey(),
	accountId: uuid("account_id"),
	campaignId: uuid("campaign_id"),
	username: text().notNull(),
	isVerified: boolean("is_verified").default(false).notNull(),
	fullName: text("full_name").notNull(),
	biography: text(),
	externalUrl: text("external_url"),
	followerCount: bigint("follower_count", { mode: 'number' }),
	followingCount: bigint("following_count", { mode: 'number' }),
	mediaCount: bigint("media_count", { mode: 'number' }),
	pk: text().notNull(),
	profilePicEncoding: text("profile_pic_encoding"),
	isPrivate: boolean("is_private").default(false).notNull(),
	isBusiness: boolean("is_business").default(false).notNull(),
	isProfessional: boolean("is_professional").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }),
	updatedAt: timestamp("updated_at", { withTimezone: true }),
	context: jsonb(),
	mediaEncodings: text("media_encodings"),
	isManual: boolean("is_manual").default(false).notNull(),
	rootInstagram: text("root_instagram"),
	hintCampaignIds: text("hint_campaign_ids").array().default(sql`ARRAY[]`),
}, (table) => [
	uniqueIndex("idx_instagram_prospects_pk").using("btree", table.pk.asc().nullsLast()),
	index("idx_prospects_instagram_prospects_account_id").using("btree", table.accountId.asc().nullsLast()),
	index("idx_prospects_instagram_prospects_campaign_id").using("btree", table.campaignId.asc().nullsLast()),
	index("idx_prospects_instagram_prospects_context").using("btree", table.context.asc().nullsLast()),
	uniqueIndex("idx_prospects_instagram_prospects_pk").using("btree", table.pk.asc().nullsLast()),
	index("idx_prospects_instagram_prospects_username").using("btree", table.username.asc().nullsLast()),
	unique("instagram_prospects_pk_key").on(table.pk),]);

export const prismaMigrations = pgTable("_prisma_migrations", {
	id: varchar({ length: 36 }).primaryKey(),
	checksum: varchar({ length: 64 }).notNull(),
	finishedAt: timestamp("finished_at", { withTimezone: true }),
	migrationName: varchar("migration_name", { length: 255 }).notNull(),
	logs: text(),
	rolledBackAt: timestamp("rolled_back_at", { withTimezone: true }),
	startedAt: timestamp("started_at", { withTimezone: true }).default(sql`now()`).notNull(),
	appliedStepsCount: integer("applied_steps_count").default(0).notNull(),
});

export const userOnboardings = pgTable("user_onboardings", {
	id: uuid().defaultRandom().primaryKey(),
	userId: text("user_id").notNull().references(() => userInAuth.id, { onDelete: "cascade" } ),
	name: text(),
	planIntent: text("plan_intent"),
	step: text(),
	data: jsonb().default({}).notNull(),
	completedAt: timestamp("completed_at", { precision: 6, withTimezone: true }),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	deletedAt: timestamp("deleted_at", { precision: 6, withTimezone: true }),
}, (table) => [
	index("user_onboardings_user_id_idx").using("btree", table.userId.asc().nullsLast()),
	uniqueIndex("user_onboardings_user_id_unique").using("btree", table.userId.asc().nullsLast()),
]);

export const userPreferences = pgTable("user_preferences", {
	id: uuid().defaultRandom().primaryKey(),
	userId: text("user_id").notNull().references(() => userInAuth.id, { onDelete: "cascade" } ),
	theme: text().default("system"),
	animationsEnabled: boolean("animations_enabled").default(true),
	reducedMotion: boolean("reduced_motion").default(false),
	notificationsEmail: boolean("notifications_email").default(true),
	notificationsPush: boolean("notifications_push").default(false),
	notificationsInApp: boolean("notifications_in_app").default(true),
	language: text().default("en"),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	deletedAt: timestamp("deleted_at", { precision: 6, withTimezone: true }),
}, (table) => [
	index("user_preferences_user_id_idx").using("btree", table.userId.asc().nullsLast()),
	uniqueIndex("user_preferences_user_id_unique").using("btree", table.userId.asc().nullsLast()),
]);

export const qualificationAssignmentsInQualifications = qualifications.table("qualification_assignments", {
	id: uuid().defaultRandom().primaryKey(),
	prospectId: uuid("prospect_id").notNull().references(() => instagramProspectsInProspects.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	assignedToUserId: text("assigned_to_user_id").notNull().references(() => userInAuth.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	campaignId: uuid("campaign_id").references(() => campaignsInCampaigns.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	status: qualificationAssignmentStatus().default("reserved").notNull(),
	decision: qualificationDecision(),
	reservedAt: timestamp("reserved_at", { withTimezone: true }).default(sql`now()`).notNull(),
	lockExpiresAt: timestamp("lock_expires_at", { withTimezone: true }),
	completedAt: timestamp("completed_at", { withTimezone: true }),
	consumedAt: timestamp("consumed_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
	index("qualification_assignment_campaign_status_consumed_idx").using("btree", table.campaignId.asc().nullsLast(), table.status.asc().nullsLast(), table.consumedAt.asc().nullsLast()),
	index("qualification_assignment_campaign_status_idx").using("btree", table.campaignId.asc().nullsLast(), table.status.asc().nullsLast()),
	index("qualification_assignment_prospect_idx").using("btree", table.prospectId.asc().nullsLast()),
	index("qualification_assignment_user_status_idx").using("btree", table.assignedToUserId.asc().nullsLast(), table.status.asc().nullsLast()),
]);

export const swipeLockInQualifications = qualifications.table("swipe_lock", {
	id: uuid().defaultRandom().primaryKey(),
	prospectId: uuid("prospect_id").notNull().references(() => instagramProspectsInProspects.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	campaignId: uuid("campaign_id").notNull(),
	lockedByUserId: text("locked_by_user_id").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
	uniqueIndex("idx_qual_lock_prospect_campaign").using("btree", table.prospectId.asc().nullsLast(), table.campaignId.asc().nullsLast()),
	index("idx_qualifications_swipe_lock_expires_at").using("btree", table.expiresAt.asc().nullsLast()),
	index("idx_qualifications_swipe_lock_locked_by_user_id").using("btree", table.lockedByUserId.asc().nullsLast()),
]);

export const swipeResultInQualifications = qualifications.table("swipe_result", {
	id: uuid().defaultRandom().primaryKey(),
	prospectId: uuid("prospect_id").notNull().references(() => instagramProspectsInProspects.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	campaignId: uuid("campaign_id").notNull().references(() => campaignsInCampaigns.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	decision: text().notNull(),
	decidedBy: text("decided_by").notNull(),
	consumedAt: timestamp("consumed_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
	uniqueIndex("idx_qual_result_prospect_campaign").using("btree", table.prospectId.asc().nullsLast(), table.campaignId.asc().nullsLast()),
]);

export const instagramServiceAccountsInServiceAccounts = serviceAccounts.table("instagram_service_accounts", {
	id: uuid().defaultRandom().primaryKey(),
	username: text().notNull(),
	password: text().notNull(),
	totp: text().notNull(),
	proxy: text().notNull(),
	cookie: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }),
	updatedAt: timestamp("updated_at", { withTimezone: true }),
	actionNeeded: boolean("action_needed").default(false).notNull(),
});

export const instagramThreadsInThreads = threads.table("instagram_threads", {
	id: uuid().defaultRandom().primaryKey(),
	threadId: text("thread_id").notNull(),
	userId: text("user_id").notNull(),
	accountId: uuid("account_id").notNull(),
	threadTitle: text("thread_title").notNull(),
	items: jsonb().default([]),
	createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
	pk: text(),
}, (table) => [
	index("idx_threads_instagram_threads_account_id").using("btree", table.accountId.asc().nullsLast()),
	index("idx_threads_instagram_threads_user_id").using("btree", table.userId.asc().nullsLast()),
	unique("instagram_threads_thread_id_key").on(table.threadId),]);
