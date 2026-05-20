const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { protect, optionalAuth } = require('../middleware/auth');

// GET all posts (public)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, tag, search, author } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (tag) filter.tags = tag;
    if (author) filter.author = author;
    if (search) filter.title = { $regex: search, $options: 'i' };
    const posts = await Post.find(filter)
      .select('-comments')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: posts });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET single post with comments (public)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    res.json({ success: true, data: post });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST create post (auth required)
router.post('/', protect, async (req, res) => {
  try {
    const { title, content, category, tags, coverEmoji } = req.body;
    if (!title || !content)
      return res.status(400).json({ success: false, message: 'Title and content required' });
    const post = await Post.create({
      author: req.user._id,
      authorName: req.user.name,
      title, content, category: category || 'General',
      tags: tags || [],
      coverEmoji: coverEmoji || '📝'
    });
    res.status(201).json({ success: true, data: post });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT update post (author only)
router.put('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (post.author.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your post' });
    const { title, content, category, tags, coverEmoji } = req.body;
    post.title = title || post.title;
    post.content = content || post.content;
    post.category = category || post.category;
    post.tags = tags || post.tags;
    post.coverEmoji = coverEmoji || post.coverEmoji;
    post.excerpt = '';
    post.updatedAt = Date.now();
    await post.save();
    res.json({ success: true, data: post });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE post (author only)
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (post.author.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your post' });
    await Post.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST add comment (auth required)
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ success: false, message: 'Comment cannot be empty' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    post.comments.push({ user: req.user._id, userName: req.user.name, content });
    await post.save();
    res.status(201).json({ success: true, data: post.comments });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE comment (author of comment only)
router.delete('/:id/comments/:commentId', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
    if (comment.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your comment' });
    comment.deleteOne();
    await post.save();
    res.json({ success: true, data: post.comments });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT like post
router.put('/:id/like', async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } }, { new: true });
    res.json({ success: true, likes: post.likes });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
