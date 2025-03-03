const bcrypt = require('bcrypt');
const { prisma } = require('../utils/prismaClient');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../.env' });

const registerUser = async (req, res) => {
    try {
        const { email, password, name } = req.body;

        //valildate input
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        //check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
            },
        });

        return res.status(200).send({
            success: true,
            message: "User created successfully",
            data: newUser
        });
    }
    catch (err) {
        return res.status(404).send({
            success: false,
            message: 'internam server error',
            error: err.message
        });
    }
}

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Verify password
        const isPasswordValid = bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, role: user.role,email: user.email},
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.status(200).json({ success: true, message: 'login successful', token });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: 'internal error for login attempt',
            message: error.message
        });
    }
};

module.exports = { registerUser, loginUser }


