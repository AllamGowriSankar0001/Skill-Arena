const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in backend/.env');
  }

  try {
    await mongoose.connect(uri);
    try {
      await mongoose.connection.collection('resumes').dropIndex('userId_1');
      console.log('Dropped legacy unique index on resumes.userId');
    } catch {
      // Index may not exist after first migration.
    }
    console.log('MongoDB connected');
  } catch (error) {
    if (error.message?.includes('ENOTFOUND') || error.message?.includes('querySrv')) {
      const host = uri.match(/@([^/]+)/)?.[1] ?? 'unknown host';
      throw new Error(
        `Cannot resolve MongoDB host "${host}". ` +
          'The cluster URL in MONGODB_URI is invalid or the cluster was deleted. ' +
          'In MongoDB Atlas: Database → Connect → Drivers → copy the connection string.',
      );
    }

    throw error;
  }
};

module.exports = connectDB;
