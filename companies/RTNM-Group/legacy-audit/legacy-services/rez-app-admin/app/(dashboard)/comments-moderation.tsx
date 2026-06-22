import { useEffect } from 'react';
import { useRouter } from 'expo-router';

/**
 * Comments Moderation — redirects to the working offer-comments page.
 * The previous implementation called non-existent API endpoints
 * (admin/content/comments). The offer-comments page uses the correct
 * backend endpoints and has full moderation capabilities.
 */
export default function CommentsModerationScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(dashboard)/offer-comments');
  }, [router]);

  return null;
}
