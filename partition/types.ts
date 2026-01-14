export type ApiResponse<T, E = string | Error> = SuccessResponse<T> | ErrorResponse<E>;

export type SuccessResponse<T> = {
    success: true;
    message: string;
    data: T;
};

export type ErrorResponse<E> = {
    success: false;
    err: E;
};

export interface WebProfileInfoResponse {
    data: {
        user: UserProfileInfo;
    };
}

export interface UserProfileInfo {
    ai_agent_owner_username?: string;
    ai_agent_type?: string;
    biography: string;
    bio_links: Array<unknown>;
    fb_profile_biolink?: string;
    biography_with_entities: unknown;
    blocked_by_viewer: boolean;
    restricted_by_viewer?: boolean;
    country_block: boolean;
    eimu_id: string;
    external_url?: string;
    external_url_linkshimmed?: string;
    edge_followed_by: unknown;
    fbid: string;
    followed_by_viewer: boolean;
    edge_follow: unknown;
    follows_viewer: boolean;
    full_name: string;
    group_metadata?: unknown;
    has_ar_effects: boolean;
    has_clips: boolean;
    has_guides: boolean;
    has_channel: boolean;
    has_blocked_viewer: boolean;
    highlight_reel_count: number;
    has_onboarded_to_text_post_app: boolean;
    has_requested_viewer: boolean;
    hide_like_and_view_counts: boolean;
    id: string;
    is_business_account: boolean;
    is_professional_account: boolean;
    is_supervision_enabled: boolean;
    is_guardian_of_viewer: boolean;
    is_supervised_by_viewer: boolean;
    is_supervised_user: boolean;
    is_embeds_disabled: boolean;
    is_joined_recently: boolean;
    guardian_id?: string;
    business_address_json?: string;
    business_contact_method?: string;
    business_email?: string;
    business_phone_number?: string;
    business_category_name?: string;
    overall_category_name?: string;
    category_enum?: string;
    category_name?: string;
    is_private: boolean;
    is_verified: boolean;
    is_verified_by_mv4b: boolean;
    is_regulated_c18: boolean;
    edge_mutual_followed_by: unknown;
    pinned_channels_list_count: number;
    profile_pic_url: string;
    profile_pic_url_hd: string;
    requested_by_viewer: boolean;
    should_show_category: boolean;
    should_show_public_contacts: boolean;
    show_account_transparency_details: boolean;
    show_text_post_app_badge?: string;
    remove_message_entrypoint: boolean;
    transparency_label?: string;
    transparency_product?: string;
    username: string;
    pronouns: string[];
    edge_felix_video_timeline: unknown;
    edge_owner_to_timeline_media: unknown;
    edge_saved_media: unknown;
    edge_media_collections: unknown;
    edge_related_profiles: unknown;
};

export interface InstagramFollowingResponse {
    users: InstagramFollowingUser[];
    big_list: boolean;
    page_size: number;
    next_max_id: string | null;
    has_more: boolean;
    should_limit_list_of_followers: boolean;
    use_clickable_see_more: boolean;
    follow_ranking_token: string | null;
    status: string;
}

type InstagramAccountBadge = Record<string, unknown>;
export interface InstagramFollowingUser {
    pk: string;
    pk_id: string;
    id: string;
    full_name: string;
    fbid_v2: string;
    third_party_downloads_enabled: number;
    strong_id__: string;
    profile_pic_id: string;
    profile_pic_url: string;
    is_verified: boolean;
    username: string;
    is_private: boolean;
    has_anonymous_profile_picture: boolean;
    account_badges: InstagramAccountBadge[];
    latest_reel_media: number;
    is_favorite: boolean;
}
