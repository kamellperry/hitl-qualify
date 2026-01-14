import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
	userInAuth: {
		organizationInAuthsViaInvitationInAuth: r.many.organizationInAuth({
			from: r.userInAuth.id.through(r.invitationInAuth.invitedBy),
			to: r.organizationInAuth.id.through(r.invitationInAuth.organizationId),
			alias: "userInAuth_id_organizationInAuth_id_via_invitationInAuth"
		}),
		organizationInAuthsCreatedBy: r.many.organizationInAuth({
			alias: "organizationInAuth_createdBy_userInAuth_id"
		}),
		organizationMemberInAuthsInvitedBy: r.many.organizationMemberInAuth({
			alias: "organizationMemberInAuth_invitedBy_userInAuth_id"
		}),
		organizationMemberInAuthsUserId: r.many.organizationMemberInAuth({
			alias: "organizationMemberInAuth_userId_userInAuth_id"
		}),
		subscriptionInAuths: r.many.subscriptionInAuth(),
		twoFactorInAuths: r.many.twoFactorInAuth(),
		userOnboardings: r.many.userOnboardings(),
		userPreferences: r.many.userPreferences(),
		qualificationAssignmentsInQualifications: r.many.qualificationAssignmentsInQualifications(),
	},
	organizationInAuth: {
		userInAuths: r.many.userInAuth({
			alias: "userInAuth_id_organizationInAuth_id_via_invitationInAuth"
		}),
		userInAuth: r.one.userInAuth({
			from: r.organizationInAuth.createdBy,
			to: r.userInAuth.id,
			alias: "organizationInAuth_createdBy_userInAuth_id"
		}),
		organizationMemberInAuths: r.many.organizationMemberInAuth(),
	},
	organizationMemberInAuth: {
		userInAuthInvitedBy: r.one.userInAuth({
			from: r.organizationMemberInAuth.invitedBy,
			to: r.userInAuth.id,
			alias: "organizationMemberInAuth_invitedBy_userInAuth_id"
		}),
		organizationInAuth: r.one.organizationInAuth({
			from: r.organizationMemberInAuth.organizationId,
			to: r.organizationInAuth.id
		}),
		userInAuthUserId: r.one.userInAuth({
			from: r.organizationMemberInAuth.userId,
			to: r.userInAuth.id,
			alias: "organizationMemberInAuth_userId_userInAuth_id"
		}),
	},
	subscriptionInAuth: {
		userInAuth: r.one.userInAuth({
			from: r.subscriptionInAuth.userId,
			to: r.userInAuth.id
		}),
	},
	twoFactorInAuth: {
		userInAuth: r.one.userInAuth({
			from: r.twoFactorInAuth.userId,
			to: r.userInAuth.id
		}),
	},
	userOnboardings: {
		userInAuth: r.one.userInAuth({
			from: r.userOnboardings.userId,
			to: r.userInAuth.id
		}),
	},
	userPreferences: {
		userInAuth: r.one.userInAuth({
			from: r.userPreferences.userId,
			to: r.userInAuth.id
		}),
	},
	qualificationAssignmentsInQualifications: {
		userInAuth: r.one.userInAuth({
			from: r.qualificationAssignmentsInQualifications.assignedToUserId,
			to: r.userInAuth.id
		}),
		campaignsInCampaign: r.one.campaignsInCampaigns({
			from: r.qualificationAssignmentsInQualifications.campaignId,
			to: r.campaignsInCampaigns.id
		}),
		instagramProspectsInProspect: r.one.instagramProspectsInProspects({
			from: r.qualificationAssignmentsInQualifications.prospectId,
			to: r.instagramProspectsInProspects.id
		}),
	},
	campaignsInCampaigns: {
		qualificationAssignmentsInQualifications: r.many.qualificationAssignmentsInQualifications(),
		instagramProspectsInProspects: r.many.instagramProspectsInProspects({
			from: r.campaignsInCampaigns.id.through(r.swipeResultInQualifications.campaignId),
			to: r.instagramProspectsInProspects.id.through(r.swipeResultInQualifications.prospectId)
		}),
	},
	instagramProspectsInProspects: {
		qualificationAssignmentsInQualifications: r.many.qualificationAssignmentsInQualifications(),
		swipeLockInQualifications: r.many.swipeLockInQualifications(),
		campaignsInCampaigns: r.many.campaignsInCampaigns(),
	},
	swipeLockInQualifications: {
		instagramProspectsInProspect: r.one.instagramProspectsInProspects({
			from: r.swipeLockInQualifications.prospectId,
			to: r.instagramProspectsInProspects.id
		}),
	},
}))