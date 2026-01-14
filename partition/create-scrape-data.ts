import rawData from "../small-thunder-35613190_production_neondb_2025-12-11_21-00-45.json" with {type: 'json'};
import rawFollowing from '../following.json' with {type: 'json'};

const OUTPUT_DIR = "dist/scrape_data.json";

function getScrapeDataFromDb() {
    return rawData.map((u) => {

        return u.pk;
    }).filter((u) => u !== undefined);
}

function getScrapeDataFromFollowing() {
    return rawFollowing.users.slice(0, 500).map((u) => {
        return u.pk;
    });
}

async function main() {
    const fromDb = Bun.argv.includes('--fd');
    const fromFollowing = Bun.argv.includes('--ff');

    let data: { id: string; profileURL: string; username: string; }[] = [];
    if (fromDb) {
        console.log('--fd flag provided, scraping data from db');
        data = getScrapeDataFromDb();
    }
    if (fromFollowing) {
        console.log('--ff flag provided, scraping data from following');
        data = getScrapeDataFromFollowing();
    }

    try {
        await Bun.write(OUTPUT_DIR, JSON.stringify(data));
        console.log(`${data.length} scrape data written to ${OUTPUT_DIR}`);
    } catch (error) {
        console.error(error);
    }
}

main().catch(console.error);