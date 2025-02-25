'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MessageSquare, Edit, Trash, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { getUserIdToken } from '@/lib/firebase/firebaseUtils';

interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  timestamp: string;
  comments: Comment[];
  isPinned?: boolean;
}

interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  timestamp: string;
}

interface EventDiscussionBoardProps {
  eventId: string;
  eventTitle: string;
  isOrganizer: boolean;
}

export default function EventDiscussionBoard({ eventId, eventTitle, isOrganizer }: EventDiscussionBoardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const token = await getUserIdToken();
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`/api/events/discussion?eventId=${eventId}`, {
          headers
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch discussion posts');
        }
        
        const data = await response.json();
        
        // Sort posts with pinned posts first, then by timestamp
        const sortedPosts = [...(data.posts || [])].sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
        
        setPosts(sortedPosts);
      } catch (err) {
        console.error('Error fetching discussion posts:', err);
        setError('Failed to load discussion posts. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchPosts, 30000);
    
    return () => clearInterval(interval);
  }, [eventId]);
  
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim()) return;
    
    try {
      setSubmitting(true);
      const token = await getUserIdToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/events/discussion', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          eventId,
          title: newPostTitle,
          content: newPostContent,
          isPinned: isOrganizer // Only organizers can create pinned posts
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create post');
      }
      
      const data = await response.json();
      
      // Add the new post to the list
      const newPost: Post = {
        id: data.postId,
        title: newPostTitle,
        content: newPostContent,
        authorId: user?.uid || 'dev_user_123',
        authorName: user?.displayName || 'Anonymous',
        timestamp: new Date().toISOString(),
        comments: [],
        isPinned: isOrganizer
      };
      
      // Add to the beginning if pinned, otherwise after pinned posts
      const pinnedPosts = posts.filter(post => post.isPinned);
      const unpinnedPosts = posts.filter(post => !post.isPinned);
      
      if (isOrganizer) {
        setPosts([...pinnedPosts, newPost, ...unpinnedPosts]);
      } else {
        setPosts([...pinnedPosts, newPost, ...unpinnedPosts.slice(0, -1)]);
      }
      
      // Reset form
      setNewPostTitle('');
      setNewPostContent('');
      setShowNewPostForm(false);
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleAddComment = async (postId: string) => {
    const commentContent = commentText[postId];
    if (!commentContent?.trim()) return;
    
    try {
      setSubmitting(true);
      const token = await getUserIdToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/events/discussion/comment', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          eventId,
          postId,
          content: commentContent
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add comment');
      }
      
      const data = await response.json();
      
      // Add the comment to the post
      const newComment: Comment = {
        id: data.commentId,
        content: commentContent,
        authorId: user?.uid || 'dev_user_123',
        authorName: user?.displayName || 'Anonymous',
        timestamp: new Date().toISOString()
      };
      
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: [...post.comments, newComment]
          };
        }
        return post;
      }));
      
      // Clear the comment input
      setCommentText({
        ...commentText,
        [postId]: ''
      });
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleDeletePost = async (postId: string) => {
    if (!isOrganizer) return;
    
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }
    
    try {
      const token = await getUserIdToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/events/discussion?eventId=${eventId}&postId=${postId}`, {
        method: 'DELETE',
        headers
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete post');
      }
      
      // Remove the post from the list
      setPosts(posts.filter(post => post.id !== postId));
    } catch (err) {
      console.error('Error deleting post:', err);
      setError('Failed to delete post. Please try again.');
    }
  };
  
  const handleTogglePin = async (postId: string, currentPinned: boolean) => {
    if (!isOrganizer) return;
    
    try {
      const token = await getUserIdToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/events/discussion/pin`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          eventId,
          postId,
          isPinned: !currentPinned
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update pin status');
      }
      
      // Update the post in the list
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            isPinned: !currentPinned
          };
        }
        return post;
      }).sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }));
    } catch (err) {
      console.error('Error updating pin status:', err);
      setError('Failed to update pin status. Please try again.');
    }
  };
  
  const togglePostExpanded = (postId: string) => {
    setExpandedPosts({
      ...expandedPosts,
      [postId]: !expandedPosts[postId]
    });
  };
  
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Discussion Board: {eventTitle}</h2>
          <p className="text-sm text-gray-500">Share updates and discuss with other attendees</p>
        </div>
        
        <button
          onClick={() => setShowNewPostForm(!showNewPostForm)}
          className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
        >
          <Plus className="h-4 w-4 mr-1" />
          New Post
        </button>
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 text-red-500 border-b border-red-100">
          {error}
        </div>
      )}
      
      {showNewPostForm && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <form onSubmit={handleCreatePost}>
            <div className="mb-4">
              <label htmlFor="post-title" className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                id="post-title"
                placeholder="Enter post title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="post-content" className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                id="post-content"
                placeholder="Write your post here..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                rows={4}
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                required
              ></textarea>
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowNewPostForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 mr-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newPostTitle.trim() || !newPostContent.trim() || submitting}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  newPostTitle.trim() && newPostContent.trim() && !submitting
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-indigo-300 text-white cursor-not-allowed'
                }`}
              >
                {submitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="divide-y divide-gray-200">
        {posts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-2" />
            <p>No posts yet. Start the discussion!</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className={`p-4 ${post.isPinned ? 'bg-yellow-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    {post.isPinned && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mr-2">
                        Pinned
                      </span>
                    )}
                    <h3 className="text-md font-medium text-gray-900">{post.title}</h3>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Posted by {post.authorName} on {formatDate(post.timestamp)}
                  </p>
                </div>
                
                {(isOrganizer || post.authorId === user?.uid) && (
                  <div className="flex space-x-2">
                    {isOrganizer && (
                      <button
                        onClick={() => handleTogglePin(post.id, !!post.isPinned)}
                        className="text-gray-400 hover:text-gray-600"
                        title={post.isPinned ? "Unpin post" : "Pin post"}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="text-red-400 hover:text-red-600"
                      title="Delete post"
                    >
                      <Trash className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="mt-2">
                <p className="text-gray-800 whitespace-pre-line">{post.content}</p>
              </div>
              
              <div className="mt-4">
                <button
                  onClick={() => togglePostExpanded(post.id)}
                  className="flex items-center text-sm text-indigo-600 hover:text-indigo-800"
                >
                  {expandedPosts[post.id] ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Hide comments ({post.comments.length})
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Show comments ({post.comments.length})
                    </>
                  )}
                </button>
              </div>
              
              {expandedPosts[post.id] && (
                <div className="mt-4 pl-4 border-l-2 border-gray-200">
                  {post.comments.length === 0 ? (
                    <p className="text-sm text-gray-500">No comments yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {post.comments.map(comment => (
                        <div key={comment.id} className="bg-gray-50 p-3 rounded-md">
                          <p className="text-sm text-gray-800">{comment.content}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {comment.authorName} • {formatDate(comment.timestamp)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <div className="flex">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                        value={commentText[post.id] || ''}
                        onChange={(e) => setCommentText({
                          ...commentText,
                          [post.id]: e.target.value
                        })}
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        disabled={!commentText[post.id]?.trim() || submitting}
                        className={`px-4 py-2 rounded-r-md ${
                          commentText[post.id]?.trim() && !submitting
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-indigo-300 text-white cursor-not-allowed'
                        }`}
                      >
                        Comment
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
} 