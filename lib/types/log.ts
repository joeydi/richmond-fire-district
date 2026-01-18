export interface LogPost {
  id: string;
  author_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  // Joined data
  author?: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
}

export interface LogPostImage {
  id: string;
  log_post_id: string;
  storage_path: string;
  filename: string;
  size_bytes?: number;
  mime_type?: string;
  url?: string; // Signed URL for display
  created_at: string;
  created_by?: string;
}

export interface LogPostWithImages extends LogPost {
  images: LogPostImage[];
}

export interface GetLogPostsOptions {
  limit?: number;
  offset?: number;
  search?: string;
}

export interface LogPostInput {
  content: string;
  author_id?: string; // Only admins can set this for other users
}
