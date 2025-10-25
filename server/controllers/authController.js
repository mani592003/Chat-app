// controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.register = async (req, res) => {
  // --- ADD A TRY...CATCH BLOCK ---
  try {
    const { username, password } = req.body;

    // 1. Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      // 400 means "Bad Request" - a user error
      return res.status(400).json({ message: "Username already exists." });
    }

    // 2. Hash password and save new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    
    // 201 means "Created" - success
    res.status(201).json({ message: "User registered successfully" });

  } catch (error) {
    // 500 means "Internal Server Error" - a server/DB error
    console.error("Registration Error:", error.message); // Log the real error on the server
    res.status(500).json({ message: "Server error during registration." });
  }
  // --------------------------------
};

exports.login = async (req, res) => {
  // ... (Your login code is fine, no changes needed)
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ message: "Invalid credentials" });
  }
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
  res.json({ token, user: { username: user.username } });
};