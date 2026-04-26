import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const MONGODB_URI = 'mongodb+srv://enockmugisha367_db_user:YFrZAkCatWCKWtSp@ikawa.lxqwhwv.mongodb.net/ikawa?retryWrites=true&w=majority&appName=Ikawa';

const admin = {
  email: 'admin@ikawa.com',
  password: 'Admin@1234',
  name: 'System Admin',
  phone: '+250700000000',
  role: 'admin',
  isActive: true,
  profilePicture: '',
  resetOtp: null,
  resetOtpExpiry: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('Connected to MongoDB');

  const db = client.db('ikawa');
  const users = db.collection('users');

  // Check if admin already exists
  const existing = await users.findOne({ email: admin.email });
  if (existing) {
    console.log('Admin user already exists:', admin.email);
    await client.close();
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(admin.password, salt);

  await users.insertOne({ ...admin, password: hashed });

  console.log('✅ Admin user created successfully!');
  console.log('   Email:    ', admin.email);
  console.log('   Password: ', admin.password);

  await client.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
