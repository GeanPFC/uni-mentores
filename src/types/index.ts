export * from './database'

// Helper type for API responses
export interface ApiResponse<T> {
    data: T | null
    error: string | null
}

// Auth types
export interface SignUpData {
    email: string
    password: string
    name: string
    faculty: string
}

export interface SignInData {
    email: string
    password: string
}

// Conversation with participants and other user
export interface ConversationWithDetails {
    id: string
    context_type: string
    context_id: string | null
    last_message_at: string | null
    last_message_preview: string | null
    created_at: string
    other_user: {
        id: string
        name: string
        avatar_url: string | null
        faculty: string
        last_seen: string | null
    }
    unread_count: number
}

// Message with sender info for display
export interface MessageWithSender {
    id: string
    conversation_id: string
    sender_id: string
    type: string
    content: string | null
    client_id: string
    created_at: string
    sender: {
        id: string
        name: string
        avatar_url: string | null
    }
}

// Post with author for display
export interface PostWithAuthor {
    id: string
    user_id: string
    type: string
    course: string
    topic: string
    description: string | null
    price_or_budget: number | null
    mode: string | null
    urgency: string | null
    tags: string[] | null
    availability: Array<{ day: string; start: string; end: string }> | null
    status: string
    created_at: string
    like_count: number
    user_has_liked: boolean
    author: {
        id: string
        name: string
        avatar_url: string | null
        faculty: string
    }
}

// Session with user details
export interface SessionWithUsers {
    id: string
    mentor_id: string
    mentee_id: string
    post_id: string | null
    conversation_id: string | null
    course: string
    topic: string | null
    scheduled_at: string | null
    mode: string | null
    price: number | null
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
    cancelled_by: string | null
    cancellation_reason: string | null
    completed_at: string | null
    created_at: string
    updated_at: string
    mentor: {
        id: string
        name: string
        avatar_url: string | null
        faculty: string
    }
    mentee: {
        id: string
        name: string
        avatar_url: string | null
        faculty: string
    }
    review?: ReviewData | null
}

// Review
export interface ReviewData {
    id: string
    session_id: string
    reviewer_id: string
    reviewee_id: string
    rating: number
    comment: string | null
    created_at: string
}

// Comment with author for display
export interface CommentWithAuthor {
    id: string
    post_id: string
    user_id: string
    content: string
    parent_id: string | null
    created_at: string
    author: {
        id: string
        name: string
        avatar_url: string | null
        faculty: string
    }
}

// Notification
export interface NotificationData {
    id: string
    user_id: string
    actor_id: string
    type: 'like' | 'comment' | 'follow' | 'new_post'
    post_id: string | null
    comment_id: string | null
    is_read: boolean
    created_at: string
    actor: {
        id: string
        name: string
        avatar_url: string | null
    }
    post?: {
        course: string
        topic: string
    } | null
}
