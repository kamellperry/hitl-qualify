import data from '../following.json';
import * as p from "drizzle-orm";
import { db } from "./database";
import { swipeResultInQualifications, campaignsInCampaigns } from "./drizzle/schema";

async function main() {
    const result = await db.select().from(swipeResultInQualifications).where(p.eq(swipeResultInQualifications.decision, "yes"));

    console.log(result);
}

await main().catch(console.error);