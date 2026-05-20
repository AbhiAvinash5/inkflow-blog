const API = '';
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let allPosts = [];
let currentPostId = null;
let currentCategory = 'all';

// ── INIT ──────────────────────────────────────────────────
window.onload = () => {
  updateNavUI();
  showPage('home');
  loadPosts();
};

// ── PAGE ROUTER ───────────────────────────────────────────
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(`page-${page}`)?.classList.remove('hidden');
  window.scrollTo(0, 0);
  if (page === 'write' && !currentUser) { showPage('auth'); return; }
  if (page === 'write') resetWriteForm();
}

// ── NAV UI ────────────────────────────────────────────────
function updateNavUI() {
  const li = !!currentUser;
  document.getElementById('nav-login').style.display = li ? 'none' : 'block';
  document.getElementById('nav-write').style.display = li ? 'block' : 'none';
  document.getElementById('nav-user').classList.toggle('hidden', !li);
  if (li) {
    document.getElementById('nav-name').textContent = currentUser.name;
    document.getElementById('nav-avatar').textContent = currentUser.name.charAt(0).toUpperCase();
  }
}

// ── AUTH ──────────────────────────────────────────────────
function switchTab(tab) {
  document.getElementById('fl').classList.toggle('hidden', tab !== 'login');
  document.getElementById('fr').classList.toggle('hidden', tab !== 'register');
  document.getElementById('tl').classList.toggle('active', tab === 'login');
  document.getElementById('tr').classList.toggle('active', tab !== 'login');
}

async function login() {
  const email = document.getElementById('l-email').value.trim();
  const password = document.getElementById('l-pass').value;
  const err = document.getElementById('l-err');
  err.textContent = '';
  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!data.success) { err.textContent = data.message; return; }
    saveSession(data.token, data.user);
    showPage('home');
  } catch { err.textContent = 'Server error.'; }
}

async function register() {
  const name = document.getElementById('r-name').value.trim();
  const email = document.getElementById('r-email').value.trim();
  const password = document.getElementById('r-pass').value;
  const bio = document.getElementById('r-bio').value.trim();
  const err = document.getElementById('r-err');
  err.textContent = '';
  if (!name || !email || !password) { err.textContent = 'Fill required fields'; return; }
  try {
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, bio })
    });
    const data = await res.json();
    if (!data.success) { err.textContent = data.message; return; }
    saveSession(data.token, data.user);
    showPage('home');
  } catch { err.textContent = 'Server error.'; }
}

function saveSession(t, user) {
  token = t; currentUser = user;
  localStorage.setItem('token', t);
  localStorage.setItem('user', JSON.stringify(user));
  updateNavUI();
}

function logout() {
  token = null; currentUser = null;
  localStorage.clear();
  updateNavUI();
  showPage('home');
}

// ── LOAD POSTS ────────────────────────────────────────────
async function loadPosts() {
  try {
    const res = await fetch(`${API}/api/posts`);
    const data = await res.json();
    if (!data.success) return;
    allPosts = data.data;
    renderPosts(allPosts);
    renderCategories();
    renderTags();
  } catch { document.getElementById('posts-list').innerHTML = '<p class="loading">Failed to load posts.</p>'; }
}

function renderCategories() {
  const cats = ['all', ...new Set(allPosts.map(p => p.category))];
  document.getElementById('category-bar').innerHTML = cats.map(c => `
    <button class="cat-pill ${c === currentCategory ? 'active' : ''}" onclick="filterByCategory('${c}')">${c === 'all' ? 'All' : c}</button>
  `).join('');
}

function renderTags() {
  const tags = [...new Set(allPosts.flatMap(p => p.tags))].slice(0, 15);
  document.getElementById('tag-cloud').innerHTML = tags.map(t => `
    <span class="tag-pill" onclick="searchByTag('${t}')">#${t}</span>
  `).join('');
}

function filterByCategory(cat) {
  currentCategory = cat;
  const filtered = cat === 'all' ? allPosts : allPosts.filter(p => p.category === cat);
  renderPosts(filtered);
  renderCategories();
}

function searchPosts() {
  const q = document.getElementById('nav-search').value.toLowerCase();
  const filtered = allPosts.filter(p => p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q));
  renderPosts(filtered);
}

function searchByTag(tag) {
  const filtered = allPosts.filter(p => p.tags.includes(tag));
  renderPosts(filtered);
}

function renderPosts(posts) {
  const el = document.getElementById('posts-list');
  if (posts.length === 0) { el.innerHTML = '<p class="loading">No posts found.</p>'; return; }
  el.innerHTML = posts.map(p => `
    <div class="post-card" onclick="openPost('${p._id}')">
      <div class="post-card-left">
        <div class="post-card-meta">
          <span class="post-card-author">${p.authorName}</span>
          <span class="post-card-date">${formatDate(p.createdAt)}</span>
        </div>
        <div class="post-card-title">${p.title}</div>
        <div class="post-card-excerpt">${p.excerpt || p.content.substring(0, 140) + '...'}</div>
        <div class="post-card-footer">
          <span class="post-card-tag">${p.category}</span>
          ${p.tags.slice(0, 2).map(t => `<span class="post-card-tag">#${t}</span>`).join('')}
          <span class="post-card-likes">♡ ${p.likes}</span>
        </div>
      </div>
      <div class="post-card-emoji">${p.coverEmoji || '📝'}</div>
    </div>
  `).join('');
}

// ── OPEN POST ─────────────────────────────────────────────
async function openPost(id) {
  currentPostId = id;
  showPage('post');
  try {
    const res = await fetch(`${API}/api/posts/${id}`);
    const data = await res.json();
    if (!data.success) return;
    const p = data.data;
    const isAuthor = currentUser && currentUser.id === p.author;

    document.getElementById('post-detail').innerHTML = `
      <div class="post-detail-cover">${p.coverEmoji || '📝'}</div>
      <div class="post-detail-category">${p.category}</div>
      <h1 class="post-detail-title">${p.title}</h1>
      <div class="post-detail-byline">
        <div class="byline-avatar">${p.authorName.charAt(0)}</div>
        <div class="byline-info">
          <div class="byline-name">${p.authorName}</div>
          <div class="byline-date">${formatDate(p.createdAt)}${p.updatedAt !== p.createdAt ? ' · Updated' : ''}</div>
        </div>
        ${isAuthor ? `
        <div class="post-detail-actions">
          <button class="btn-edit-post" onclick="editPost('${p._id}')">Edit</button>
          <button class="btn-del-post" onclick="deletePost('${p._id}')">Delete</button>
        </div>` : ''}
      </div>
      <div class="post-detail-content">${p.content}</div>
      <div class="post-detail-tags">
        ${p.tags.map(t => `<span class="post-card-tag">#${t}</span>`).join('')}
      </div>
      <div class="post-detail-likes">
        <button class="btn-like" onclick="likePost('${p._id}')">♡ Like</button>
        <span class="like-count" id="like-count">${p.likes} likes</span>
      </div>
    `;

    renderComments(p.comments, p._id);
  } catch { document.getElementById('post-detail').innerHTML = '<p class="loading">Failed to load post.</p>'; }
}

// ── COMMENTS ──────────────────────────────────────────────
function renderComments(comments, postId) {
  const el = document.getElementById('comments-section');
  const commentForm = currentUser ? `
    <div class="comment-form">
      <textarea id="comment-input" placeholder="Add a comment..." rows="3"></textarea>
      <button class="btn-green" onclick="addComment('${postId}')">Post Comment</button>
    </div>
  ` : `<div class="login-to-comment">
    <span onclick="showPage('auth')">Sign in</span> to join the conversation.
  </div>`;

  const commentList = comments.length === 0
    ? '<p class="no-comments">No comments yet. Be the first!</p>'
    : comments.map(c => `
      <div class="comment-item">
        <div class="comment-header">
          <div class="comment-author">
            <div class="comment-avatar">${c.userName.charAt(0)}</div>
            <span class="comment-name">${c.userName}</span>
            <span class="comment-date">${formatDate(c.createdAt)}</span>
          </div>
          ${currentUser && currentUser.id === c.user ? `<button class="btn-del-comment" onclick="deleteComment('${postId}','${c._id}')">Delete</button>` : ''}
        </div>
        <div class="comment-text">${c.content}</div>
      </div>
    `).join('');

  el.innerHTML = `
    <h3 class="comments-title">Comments (${comments.length})</h3>
    ${commentForm}
    ${commentList}
  `;
}

async function addComment(postId) {
  const content = document.getElementById('comment-input').value.trim();
  if (!content) return;
  try {
    const res = await fetch(`${API}/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content })
    });
    const data = await res.json();
    if (!data.success) return;
    renderComments(data.data, postId);
  } catch {}
}

async function deleteComment(postId, commentId) {
  if (!confirm('Delete comment?')) return;
  try {
    const res = await fetch(`${API}/api/posts/${postId}/comments/${commentId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) renderComments(data.data, postId);
  } catch {}
}

// ── LIKE ──────────────────────────────────────────────────
async function likePost(id) {
  try {
    const res = await fetch(`${API}/api/posts/${id}/like`, { method: 'PUT' });
    const data = await res.json();
    if (data.success) document.getElementById('like-count').textContent = `${data.likes} likes`;
  } catch {}
}

// ── WRITE / EDIT POST ─────────────────────────────────────
function resetWriteForm() {
  document.getElementById('edit-post-id').value = '';
  document.getElementById('post-emoji').value = '📝';
  document.getElementById('post-title').value = '';
  document.getElementById('post-category').value = 'General';
  document.getElementById('post-tags').value = '';
  document.getElementById('post-content').value = '';
  document.getElementById('write-err').textContent = '';
  document.getElementById('write-title-label').textContent = 'New Post';
}

function editPost(id) {
  const post = { ...allPosts.find(p => p._id === id) };
  if (!post) return;
  // Fetch full post for content
  fetch(`${API}/api/posts/${id}`)
    .then(r => r.json())
    .then(data => {
      const p = data.data;
      document.getElementById('edit-post-id').value = p._id;
      document.getElementById('post-emoji').value = p.coverEmoji || '📝';
      document.getElementById('post-title').value = p.title;
      document.getElementById('post-category').value = p.category;
      document.getElementById('post-tags').value = p.tags.join(', ');
      document.getElementById('post-content').value = p.content;
      document.getElementById('write-title-label').textContent = 'Edit Post';
      document.getElementById('write-err').textContent = '';
      showPage('write');
    });
}

async function publishPost() {
  const editId = document.getElementById('edit-post-id').value;
  const title = document.getElementById('post-title').value.trim();
  const content = document.getElementById('post-content').value.trim();
  const err = document.getElementById('write-err');
  err.textContent = '';

  if (!title || !content) { err.textContent = 'Title and content are required'; return; }

  const payload = {
    title, content,
    category: document.getElementById('post-category').value,
    tags: document.getElementById('post-tags').value.split(',').map(t => t.trim()).filter(Boolean),
    coverEmoji: document.getElementById('post-emoji').value || '📝'
  };

  const url = editId ? `${API}/api/posts/${editId}` : `${API}/api/posts`;
  const method = editId ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.success) { err.textContent = data.message; return; }
    await loadPosts();
    editId ? openPost(editId) : showPage('home');
  } catch { err.textContent = 'Server error.'; }
}

async function deletePost(id) {
  if (!confirm('Delete this post?')) return;
  try {
    await fetch(`${API}/api/posts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    await loadPosts();
    showPage('home');
  } catch {}
}

// ── HELPERS ───────────────────────────────────────────────
function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
