import { supabase } from '@/lib/supabase';

// Komentarze pod ogłoszeniami. Baza wymusza jeden komentarz na (announcement_id, author_id)
// unikalnym constraintem — stąd obsługa błędu 23505 w addComment zamiast sprawdzania z wyprzedzeniem.
export type Comment = {
  id: string;
  announcement_id: string;
  author_id: string;
  content: string;
  created_at: string;
  players?: { full_name: string; roles?: { name: string } | null } | null;
};

const COMMENT_SELECT =
  'id, announcement_id, author_id, content, created_at, players:author_id ( full_name, roles:role_id ( name ) )';

export async function fetchComments(announcementId: string) {
  const { data, error } = await supabase
    .from('announcement_comments')
    .select(COMMENT_SELECT)
    .eq('announcement_id', announcementId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Comment[];
}

export async function addComment(announcementId: string, authorId: string, content: string) {
  const text = content.trim();
  if (!text) return null;
  const { data, error } = await supabase
    .from('announcement_comments')
    .insert({ announcement_id: announcementId, author_id: authorId, content: text })
    .select(COMMENT_SELECT)
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('Możesz dodać tylko jeden komentarz do ogłoszenia.');
    throw error;
  }
  return data as unknown as Comment;
}

export async function deleteComment(commentId: string, authorId: string) {
  const { error } = await supabase.from('announcement_comments').delete().eq('id', commentId).eq('author_id', authorId);
  if (error) throw error;
}
