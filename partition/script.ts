import { userInAuth as users, campaignsInCampaigns as campaigns, instagramProspectsInProspects as prospects, instagramAccountsInAccounts as accounts } from './drizzle/schema';
import allData from "./split.json" with { type: "json" };
import { db } from './database';
import * as p from 'drizzle-orm';
import rohanData from '../out/rohan/swipe_result.json';
import johnData from '../out/john/swipe_result.json';
import acDataOne from '../out/ac/swipe_result_one.json';
import acDataTwo from '../out/ac/swipe_result_two.json';
import accountsData from './accounts.json';

// const acData = [...acDataOne, ...acDataTwo];

// const rohanProspectIds = extractProspectIds(rohanData);
// const johnProspectIds = extractProspectIds(johnData);
// const acProspectIds = extractProspectIds(acData);

async function main() {
    const response = await db.query.instagramProspectsInProspects.findMany({
        columns: {
            pk: true
        },
        where: {
            id: {
                in: allData
            }
        }
    });
    Bun.write('result.json', JSON.stringify(response.map(p => p.pk)));
}

await main().catch(console.error);

function extractProspectIds(decisions: QualificationJsonData[]) {
    const prospectIds = [];
    for (const d of decisions) {
        if (d.consumed_at === null) continue;
        prospectIds.push(d.prospect_id);
    }
    return prospectIds;
}

async function getPksFromProspectIds(prospectIds: string[]) {
    const response = await db.query.instagramProspectsInProspects.findMany({
        columns: {
            pk: true
        },
        where: {
            id: {
                in: prospectIds
            }
        }
    });
    const pks = response.map(p => p.pk);
    await Bun.write('./out/joint.json', JSON.stringify(pks));
}

async function getProspectIdsFromAccounts() {
    const result = await db.select({
        name: users.name,
        username: accounts.username,
        prospectIds: campaigns.prospectIds,
    })
        .from(users)
        // Cast users.id to uuid explicitly
        .innerJoin(campaigns, p.sql`${users.id}::uuid = ${campaigns.userId}`)
        .innerJoin(accounts, p.sql`${users.id}::uuid = ${accounts.userId}`);
}

interface QualificationJsonData {
    id: string;
    prospect_id: string;
    campaign_id: string;
    decision: string;
    decided_by: string;
    consumed_at?: string | null;
    created_at: string;
}