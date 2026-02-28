// Database Types - Generated from schema v2.1

export type UserRole = 'user' | 'moderator' | 'admin'
export type MentorStatus = 'none' | 'approved'
export type PostType = 'OFFER' | 'REQUEST'
export type PostStatus = 'active' | 'paused' | 'closed'
export type PostMode = 'virtual' | 'presencial' | 'hibrido'
export type Urgency = 'baja' | 'media' | 'alta'
export type MessageType = 'text' | 'image' | 'file' | 'system'
export type SessionStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed'
export type ContextType = 'post' | 'session' | 'direct'

export interface AvailabilitySlot {
    day: string
    start: string
    end: string
}

export interface Profile {
    id: string
    name: string
    faculty: string
    cycle: string | null
    avatar_url: string | null
    bio: string | null
    role: UserRole
    mentor_status: MentorStatus
    whatsapp: string | null
    is_active: boolean
    last_seen: string | null
    created_at: string
    updated_at: string
}

export interface Post {
    id: string
    user_id: string
    type: PostType
    course: string
    topic: string
    description: string | null
    price_or_budget: number | null
    mode: PostMode | null
    urgency: Urgency | null
    tags: string[] | null
    availability: AvailabilitySlot[]
    status: PostStatus
    created_at: string
    updated_at: string
    // Relations
    user?: Profile
}

export interface Conversation {
    id: string
    context_type: ContextType
    context_id: string | null
    dm_key: string
    last_message_at: string | null
    last_message_preview: string | null
    created_at: string
    updated_at: string
    // Relations
    participants?: ConversationParticipant[]
}

export interface ConversationParticipant {
    conversation_id: string
    user_id: string
    last_read_at: string
    is_archived: boolean
    is_muted: boolean
    joined_at: string
    // Relations
    user?: Profile
}

export interface Message {
    id: string
    conversation_id: string
    sender_id: string
    type: MessageType
    content: string | null
    metadata: Record<string, unknown> | null
    client_id: string
    edited_at: string | null
    deleted_at: string | null
    created_at: string
    // Relations
    sender?: Profile
}

export interface Session {
    id: string
    mentor_id: string
    mentee_id: string
    post_id: string | null
    conversation_id: string | null
    course: string
    topic: string | null
    scheduled_at: string | null
    mode: PostMode | null
    price: number | null
    status: SessionStatus
    cancelled_by: string | null
    cancellation_reason: string | null
    completed_at: string | null
    created_at: string
    updated_at: string
    // Relations
    mentor?: Profile
    mentee?: Profile
    post?: Post
}

export interface Review {
    id: string
    session_id: string
    reviewer_id: string
    reviewee_id: string
    rating: number
    comment: string | null
    created_at: string
    // Relations
    reviewer?: Profile
    reviewee?: Profile
    session?: Session
}

export interface Report {
    id: string
    reporter_id: string
    reported_user_id: string | null
    reported_post_id: string | null
    reported_message_id: string | null
    reason: string
    status: ReportStatus
    admin_notes: string | null
    created_at: string
}

export interface Block {
    blocker_id: string
    blocked_id: string
    created_at: string
}

// Utility types for forms
export interface CreatePostInput {
    type: PostType
    course: string
    topic: string
    description?: string
    price_or_budget?: number
    mode?: PostMode
    urgency?: Urgency
    tags?: string[]
    availability?: AvailabilitySlot[]
}

export interface UpdatePostInput {
    course?: string
    topic?: string
    description?: string
    price_or_budget?: number
    mode?: PostMode
    urgency?: Urgency
    tags?: string[]
    status?: PostStatus
}

export interface UpdateProfileInput {
    name?: string
    faculty?: string
    cycle?: string
    avatar_url?: string
    bio?: string
}

export interface CreateSessionInput {
    mentor_id: string
    post_id?: string
    course: string
    topic?: string
    scheduled_at?: string
    mode?: PostMode
    price?: number
}

export interface CreateReviewInput {
    session_id: string
    rating: number
    comment?: string
}
