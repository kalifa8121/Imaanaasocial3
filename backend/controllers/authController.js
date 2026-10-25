const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// SIGNUP
exports.signup = async (req, res) => {
  try {
    const { full_name, username, email, phone, password, sex, age } = req.body;

    if (!full_name || !username || !password)
      return res.status(400).json({ msg: 'Name, username, password barbaachisa' });

    const exists = await pool.query(
      'SELECT id FROM users WHERE username=$1 OR email=$2',
      [username, email || '']
    );
    if (exists.rows.length)
      return res.status(400).json({ msg: 'Username/email already used' });

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (full_name, username, email, phone, password_hash, sex, age)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, full_name, username, email, phone, sex, age, role, is_vip`,
      [full_name, username, email, phone, hash, sex, age]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: 'Server error' });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password)
      return res.status(400).json({ msg: 'Missing credentials' });

    const result = await pool.query(
      'SELECT * FROM users WHERE username=$1 OR email=$1 OR phone=$1 LIMIT 1',
      [identifier]
    );
    if (!result.rows.length)
      return res.status(400).json({ msg: 'User not found' });

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).json({ msg: 'Wrong password' });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    delete user.password_hash;
    res.json({ token, user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: 'Server error' });
  }
};

// LOGOUT (JWT stateless — client token delete)
exports.logout = (req, res) => {
  res.json({ msg: 'Logged out ✅ (client deletes token)' });
};

// GET ME
exports.getMe = async (req, res) => {
  const result = await pool.query(
    `SELECT id, full_name, username, email, phone, sex, age, photo_url, work, role, is_vip
     FROM users WHERE id=$1`,
    [req.user.id]
  );
  res.json({ user: result.rows[0] });
};

// EDIT PROFILE
exports.editProfile = async (req, res) => {
  const { full_name, sex, age, work, bio, photo_url } = req.body;
  const result = await pool.query(
    `UPDATE users SET
       full_name = COALESCE($1, full_name),
       sex       = COALESCE($2, sex),
       age       = COALESCE($3, age),
       work      = COALESCE($4, work),
       bio       = COALESCE($5, bio),
       photo_url = COALESCE($6, photo_url)
     WHERE id=$7
     RETURNING id, full_name, username, email, phone, sex, age, photo_url, work, bio, role, is_vip`,
    [full_name, sex, age, work, bio, photo_url, req.user.id]
  );
  res.json({ user: result.rows[0] });
};
