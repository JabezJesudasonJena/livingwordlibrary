const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createUser, getUserByEmail } = require("../db/users");

function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Email and password are required"
      });
    }

    const existingUser = await getUserByEmail(email.trim().toLowerCase());
    if (existingUser) {
      return res.status(409).json({
        success: false,
        data: null,
        message: "Email is already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await createUser({
      name: name ? name.trim() : null,
      email: email.trim().toLowerCase(),
      password: hashedPassword
    });

    const token = createToken(newUser);

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: newUser
      },
      message: "Registration successful"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to register user"
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Email and password are required"
      });
    }

    const user = await getUserByEmail(email.trim().toLowerCase());
    if (!user) {
      return res.status(401).json({
        success: false,
        data: null,
        message: "Invalid email or password"
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        data: null,
        message: "Invalid email or password"
      });
    }

    const token = createToken(user);

    return res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email }
      },
      message: "Login successful"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to login"
    });
  }
}

module.exports = {
  register,
  login
};
