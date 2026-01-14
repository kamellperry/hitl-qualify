import type {
    WebProfileInfoResponse,
    InstagramFollowingResponse,
    InstagramFollowingUser
} from './types';


const sleepRandomBetween = async (min: number, max: number) => {
    const random = Math.floor(Math.random() * (max - min + 1)) + min;

    console.info(`sleeping for ${random} seconds...`);
    return new Promise(resolve => setTimeout(resolve, random * 1000));
};

const endpoints = () => ({
    web_profile_info(username: string): string {
        return `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`;
    },
    following(uid: string, cursor: string | null = null, count: number = 200): string {
        const params = new URLSearchParams({ count: String(count) });
        if (cursor) params.set('max_id', cursor);
        return `https://www.instagram.com/api/v1/friendships/${uid}/following/?${params.toString()}`;
    },
    followers(uid: string, cursor: string | null = null, count: number = 200): string {
        const params = new URLSearchParams({ count: String(count) });
        if (cursor) params.set('max_id', cursor);
        return `https://www.instagram.com/api/v1/friendships/${uid}/followers/?${params.toString()}`;
    }
});

const APP_ID = "936619743392459";
const CSRFTOKEN = 'WN7LBVyNyNz9SETi2wsNdJcB6BPRRjAZ';
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
const COOKIES = `
datr=uhA9aTYBBJZ6-jB7Ctyod0ig; ig_did=5AF12BAA-31B6-4CFC-A35A-466CE1EB6EB4; mid=aT0QugAEAAHOFSE60T6nWrRPcTuB; ig_nrcb=1; ds_user_id=58776246651; ps_l=1; ps_n=1; csrftoken=WN7LBVyNyNz9SETi2wsNdJcB6BPRRjAZ; sessionid=58776246651%3A6SHOLLJ2MLnMl1%3A1%3AAYi1XwFnG0TNV6XnyG4JR7h2wp_ACWSNYa06HHQhHw; wd=1286x1048; rur="NCG\x2c58776246651\x2c1797737950:01fe0eaa8d8c6519efdb485e468d3f8177fb765b04e8e123e1479cfaa677647cfb939a26"
`;

const headers = {
    'x-ig-app-id': APP_ID,
    'user-agent': USER_AGENT,
    'x-csrftoken': CSRFTOKEN,
    'Cookie': COOKIES
};

const OUTPUT_FILE = "./following.json";

async function getProfileId(username: string): Promise<string> {
    try {
        console.log(`fetching profile id for ${username}`);
        const r = await fetch(endpoints().web_profile_info(username), { headers });
        if (!r.ok) {
            throw new Error(`Failed to fetch profile id: ${r.status} ${r.statusText}`);
        }

        const { data } = await r.json() as WebProfileInfoResponse;
        console.log(`successfully fetched profile id for ${username}: ${data.user.id}`);
        return data.user.id;
    }
    catch (error) {
        console.error("unable to fetch the user id", error);
        return "";
    }
}

async function fetchFollowingPage(userId: string, cursor: string | null): Promise<InstagramFollowingResponse> {
    await sleepRandomBetween(2, 4);
    try {
        const r = await fetch(endpoints().following(userId, cursor), { headers });
        if (!r.ok) {
            throw new Error(`Failed to fetch following: ${r.status} ${r.statusText}`);
        }
        return r.json() as Promise<InstagramFollowingResponse>;
    }
    catch (error) {
        console.error(`error fetching following page for user: ${userId}`, error);
        throw error;
    }
}

async function saveProgress(params: {
    userId: string;
    cursor: string | null;
    users: InstagramFollowingUser[];
    error?: unknown;
}) {
    const { userId, cursor, users, error } = params;
    const payload = {
        scrapedUserId: userId,
        cursor,
        totalCollected: users.length,
        users,
        error:
            error instanceof Error
                ? { message: error.message, stack: error.stack }
                : error ?? null,
    };

    await Bun.write(OUTPUT_FILE, JSON.stringify(payload, null, 2));
}

async function getFollowing(userId: string): Promise<InstagramFollowingUser[]> {
    const collected: InstagramFollowingUser[] = [];
    let cursor: string | null = null;

    try {
        while (true) {
            console.log(`fetching following page with cursor: ${cursor}`);
            const page = await fetchFollowingPage(userId, cursor);

            collected.push(...page.users);
            console.info(`successfully fetched ${collected.length} following from user: ${userId}`);
            await saveProgress({ userId, cursor: page.next_max_id ?? null, users: collected });
            console.info(`successfully saved progress for user: ${userId}`);

            // Stop when API indicates there are no more pages.
            console.info(`stopping following fetch for user: ${userId} because ${page.has_more ? 'has more' : 'no more'} pages and ${page.next_max_id ? 'next max id' : 'no next max id'}`);
            if (!page.has_more || !page.next_max_id) break;
            cursor = page.next_max_id;
        }
    } catch (error) {
        console.error(`error fetching following for user: ${userId}`, error);
        await saveProgress({ userId, cursor, users: collected, error });
        throw error;
    }

    return collected;
}

async function main() {
    const args = Bun.argv;
    const username = args[2];

    if (!username) throw new Error("missing username");

    console.info(`starting main function`);
    const userId = await getProfileId(username);
    if (userId.length < 1) throw new Error("profile lookup did not return a user id");

    const users = await getFollowing(userId);
    console.log(`successfully fetched ${users.length} following from user: ${username}`);
}

main().catch(console.error);
