import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hosteleats';
const JWT_SECRET = process.env.JWT_SECRET || 'development_only_change_me';
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  roomNumber: { type: String, default: '', trim: true, maxlength: 20 },
  department: { type: String, default: '', trim: true, maxlength: 80 },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['student', 'admin'], default: 'student' }
}, { timestamps: true });

const menuSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  breakfast: { type: String, default: '' },
  lunch: { type: String, default: '' },
  snacks: { type: String, default: '' },
  dinner: { type: String, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const feedbackSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  date: { type: String, required: true },
  meal: { type: String, enum: ['Breakfast','Lunch','Snacks','Dinner'], required: true },
  taste: { type: Number, min: 1, max: 5, required: true },
  quality: { type: Number, min: 1, max: 5, required: true },
  quantity: { type: Number, min: 1, max: 5, required: true },
  cleanliness: { type: Number, min: 1, max: 5, required: true },
  overall: { type: Number, min: 1, max: 5, required: true },
  comments: { type: String, default: '', maxlength: 1000, trim: true }
}, { timestamps: true });

const complaintSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  category: { type: String, enum: ['Food taste/quality','Insufficient quantity','Hygiene/cleanliness','Delayed service','Other'], required: true },
  description: { type: String, required: true, maxlength: 1500, trim: true },
  meal: { type: String, enum: ['Breakfast','Lunch','Snacks','Dinner','Not applicable'], default: 'Not applicable' },
  date: { type: String, required: true },
  status: { type: String, enum: ['Pending','In Progress','Resolved'], default: 'Pending' },
  adminNote: { type: String, default: '', maxlength: 1000 }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Menu = mongoose.model('Menu', menuSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);
const Complaint = mongoose.model('Complaint', complaintSchema);

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Please sign in to continue.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Your session expired. Please sign in again.' });
  }
}
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Administrator access required.' });
  next();
}
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  next();
}
function dateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10) === value;
}
function publicUser(u) {
  return { id: u._id, name: u.name, email: u.email, roomNumber: u.roomNumber, department: u.department, role: u.role };
}
function issueToken(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
}

app.get('/api/health', (req, res) => res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));

app.post('/api/auth/register',
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be between 2 and 80 characters.'),
  body('email').trim().isEmail().withMessage('Enter a valid email address.'),
  body('password').isLength({ min: 8, max: 100 }).withMessage('Password must contain at least 8 characters.'),
  validate,
  async (req, res, next) => {
    try {
      const email = req.body.email.toLowerCase().trim();
      if (await User.exists({ email })) return res.status(409).json({ message: 'An account with this email already exists.' });
      const hashed = await bcrypt.hash(req.body.password, 12);
      const user = await User.create({
        name: req.body.name.trim(), email, password: hashed,
        roomNumber: String(req.body.roomNumber || '').trim(),
        department: String(req.body.department || '').trim()
      });
      res.status(201).json({ token: issueToken(user), user: publicUser(user) });
    } catch (e) { next(e); }
  }
);

app.post('/api/auth/login',
  body('email').trim().isEmail().withMessage('Enter a valid email address.'),
  body('password').notEmpty().withMessage('Enter your password.'),
  validate,
  async (req, res, next) => {
    try {
      const user = await User.findOne({ email: req.body.email.toLowerCase().trim() }).select('+password');
      if (!user || !(await bcrypt.compare(req.body.password, user.password))) return res.status(401).json({ message: 'Incorrect email or password.' });
      res.json({ token: issueToken(user), user: publicUser(user) });
    } catch (e) { next(e); }
  }
);
app.get('/api/auth/me', auth, async (req, res, next) => {
  try { const user = await User.findById(req.user.id); if (!user) return res.status(404).json({ message: 'Account not found.' }); res.json({ user: publicUser(user) }); }
  catch (e) { next(e); }
});

app.get('/api/menus', auth, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.date) filter.date = req.query.date;
    res.json(await Menu.find(filter).sort({ date: -1 }).limit(90));
  } catch (e) { next(e); }
});
app.put('/api/menus/:date', auth, adminOnly,
  body('breakfast').optional().isString().isLength({ max: 500 }),
  body('lunch').optional().isString().isLength({ max: 500 }),
  body('snacks').optional().isString().isLength({ max: 500 }),
  body('dinner').optional().isString().isLength({ max: 500 }),
  validate,
  async (req, res, next) => {
    try {
      if (!dateString(req.params.date)) return res.status(400).json({ message: 'Use a valid date in YYYY-MM-DD format.' });
      const data = {};
      for (const key of ['breakfast','lunch','snacks','dinner']) data[key] = String(req.body[key] || '').trim();
      const menu = await Menu.findOneAndUpdate({ date: req.params.date }, { ...data, updatedBy: req.user.id }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
      res.json(menu);
    } catch (e) { next(e); }
  }
);

app.post('/api/feedback', auth,
  body('date').custom(dateString).withMessage('Choose a valid meal date.'),
  body('meal').isIn(['Breakfast','Lunch','Snacks','Dinner']).withMessage('Choose a valid meal.'),
  ...['taste','quality','quantity','cleanliness','overall'].map(k => body(k).isInt({ min: 1, max: 5 }).withMessage(`${k} rating must be between 1 and 5.`)),
  body('comments').optional().isString().isLength({ max: 1000 }).withMessage('Comments must be 1000 characters or fewer.'),
  validate,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(401).json({ message: 'Account not found.' });
      const item = await Feedback.create({
        student: user._id, studentName: user.name, studentEmail: user.email,
        date: req.body.date, meal: req.body.meal,
        taste: Number(req.body.taste), quality: Number(req.body.quality), quantity: Number(req.body.quantity),
        cleanliness: Number(req.body.cleanliness), overall: Number(req.body.overall), comments: String(req.body.comments || '').trim()
      });
      res.status(201).json(item);
    } catch (e) { next(e); }
  }
);
app.get('/api/feedback/mine', auth, async (req, res, next) => {
  try { res.json(await Feedback.find({ student: req.user.id }).sort({ date: -1, createdAt: -1 }).limit(300)); }
  catch (e) { next(e); }
});
app.get('/api/admin/feedback', auth, adminOnly, async (req, res, next) => {
  try { res.json(await Feedback.find().sort({ createdAt: -1 }).limit(500)); }
  catch (e) { next(e); }
});

app.post('/api/complaints', auth,
  body('category').isIn(['Food taste/quality','Insufficient quantity','Hygiene/cleanliness','Delayed service','Other']).withMessage('Choose a valid complaint category.'),
  body('description').trim().isLength({ min: 5, max: 1500 }).withMessage('Description must be between 5 and 1500 characters.'),
  body('meal').optional().isIn(['Breakfast','Lunch','Snacks','Dinner','Not applicable']),
  body('date').custom(dateString).withMessage('Choose a valid date.'),
  validate,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      const complaint = await Complaint.create({
        student: user._id, studentName: user.name, studentEmail: user.email,
        category: req.body.category, description: req.body.description.trim(),
        meal: req.body.meal || 'Not applicable', date: req.body.date
      });
      res.status(201).json(complaint);
    } catch (e) { next(e); }
  }
);
app.get('/api/complaints/mine', auth, async (req, res, next) => {
  try { res.json(await Complaint.find({ student: req.user.id }).sort({ createdAt: -1 }).limit(300)); }
  catch (e) { next(e); }
});
app.get('/api/admin/complaints', auth, adminOnly, async (req, res, next) => {
  try { res.json(await Complaint.find().sort({ createdAt: -1 }).limit(500)); }
  catch (e) { next(e); }
});
app.patch('/api/admin/complaints/:id', auth, adminOnly,
  body('status').isIn(['Pending','In Progress','Resolved']).withMessage('Choose a valid status.'),
  body('adminNote').optional().isString().isLength({ max: 1000 }),
  validate,
  async (req, res, next) => {
    try {
      const complaint = await Complaint.findByIdAndUpdate(req.params.id,
        { status: req.body.status, adminNote: String(req.body.adminNote || '').trim() },
        { new: true, runValidators: true });
      if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });
      res.json(complaint);
    } catch (e) { next(e); }
  }
);
app.get('/api/admin/analytics', auth, adminOnly, async (req, res, next) => {
  try {
    const [feedbackCount, complaintCount, pendingCount, averages, mealAverages] = await Promise.all([
      Feedback.countDocuments(), Complaint.countDocuments(), Complaint.countDocuments({ status: 'Pending' }),
      Feedback.aggregate([{ $group: { _id: null, overall: { $avg: '$overall' }, taste: { $avg: '$taste' }, quality: { $avg: '$quality' }, quantity: { $avg: '$quantity' }, cleanliness: { $avg: '$cleanliness' } } }]),
      Feedback.aggregate([{ $group: { _id: '$meal', average: { $avg: '$overall' }, count: { $sum: 1 } } }, { $sort: { average: -1 } }])
    ]);
    res.json({ feedbackCount, complaintCount, pendingCount, averages: averages[0] || null, mealAverages });
  } catch (e) { next(e); }
});

app.use((req, res) => res.status(404).json({ message: 'API route not found.' }));
app.use((err, req, res, next) => {
  console.error(err);
  if (err?.code === 11000) return res.status(409).json({ message: 'A record with this value already exists.' });
  if (err?.name === 'ValidationError') return res.status(400).json({ message: 'Please check the submitted data.' });
  res.status(500).json({ message: 'Unexpected server error. Check the backend terminal for details.' });
});

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log(`MongoDB connected: ${mongoose.connection.name}`);
    app.listen(PORT, () => console.log(`HostelEats API running at http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection failed. Check that MongoDB is running and MONGODB_URI is correct.', err.message);
    process.exit(1);
  });
