import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { supabase } from "../../database/db.js";
import { tokenBlacklist } from "../../utils/tokenBlacklist.js";

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate 
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .limit(1);

    if (error) throw error;

    const user = users?.[0];
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    //Compare password with hashed password stored in DB
    //const passwordMatch = await bcrypt.compare(password, user.password); // Change depending on how our create user hashing was made
    const passwordMatch = (password, user.password)
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign( //Creates JWT token
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" } //Expires in 1 hour
    );

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
      },
      token,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }

};

export const logoutUser = async (req, res) => {
  try {

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(400).json({ message: "No token provided." });
    }

    const token = authHeader.split(" ")[1];
    tokenBlacklist.add(token);

    return res.status(200).json({ message: "Logout successful." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};



