require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Post = require('./models/Post');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await Post.deleteMany({});
    await User.deleteMany({});

    const user = await User.create({ name: 'Avinash Kamella', email: 'avinash@blog.com', password: 'avinash123', bio: 'Full-stack developer & blogger.' });

    await Post.insertMany([
      {
        author: user._id, authorName: user.name,
        title: 'Getting Started with Full-Stack Development',
        content: 'Full-stack development means working on both frontend and backend. In this post, I share my journey from zero to building complete web applications. The key is to start with HTML/CSS, move to JavaScript, then pick Node.js for backend. MongoDB is perfect for beginners as a database. Deploy on Vercel for free and you have a live project!',
        category: 'Tech', tags: ['javascript', 'nodejs', 'mongodb'], coverEmoji: '🚀', likes: 12
      },
      {
        author: user._id, authorName: user.name,
        title: 'Why Every Developer Should Learn Git',
        content: 'Git is the most important tool after your code editor. Version control saves you from disasters. You can track every change, go back in time, collaborate with teams, and deploy confidently. Learn git init, add, commit, push, pull, branch, and merge. These 7 commands will cover 90% of your daily needs.',
        category: 'Tips', tags: ['git', 'tools', 'beginners'], coverEmoji: '🐙', likes: 8
      },
      {
        author: user._id, authorName: user.name,
        title: 'MongoDB vs PostgreSQL: Which Should You Choose?',
        content: 'Both are excellent databases but serve different use cases. MongoDB is document-based, flexible schema, great for rapid development and when your data structure is not fixed. PostgreSQL is relational, ACID compliant, perfect for complex queries and when data integrity is critical. For most web apps starting out, MongoDB is easier to get started with.',
        category: 'Database', tags: ['mongodb', 'postgresql', 'database'], coverEmoji: '🗄️', likes: 15
      }
    ]);

    console.log('✅ Seeded 3 posts');
    console.log('✅ User: avinash@blog.com / avinash123');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
