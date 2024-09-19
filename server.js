const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const session = require('express-session'); // Added for session handling
const User = require('./models/User'); // User schema
const Message = require('./models/Message'); // Message schema

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static HTML files

// Session middleware
app.use(session({
    secret: '1a2b3c4d5e6f7g8h9i10j11k12l13m14n', // Replace with a secure secret key
    resave: false,
    saveUninitialized: false
}));

app.set('view engine', 'ejs');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/chatDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Serve the registration page
app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/public/register.html');
});

// Serve the login page
app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});


// serve the chat page
app.get('/chat', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('chat', { username: req.session.user }); // Render EJS template with username
});




// Registration route
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const existingName = await User.findOne({ name });
        if (existingName) {
            return res.send('User with this name already exists!');
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.send('User with this email already exists!');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();
        res.redirect('/login');
    } catch (error) {
        console.error(error);
        res.send('Error occurred during registration.');
    }
});

// Login route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (user) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                req.session.user = user.name; // Save user's name in session
                res.redirect('/chat');
            } else {
                res.send('Invalid password!');
            }
        } else {
            res.send('No user found with this email!');
        }
    } catch (error) {
        console.error(error);
        res.send('Error occurred during login.');
    }
});

// Route to get messages
app.get('/messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp: 1 });
        res.json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving messages.');
    }
});

// Route to post a new message
app.post('/messages', async (req, res) => {
    const { content } = req.body;

    try {
        if (!req.session.user) {
            return res.status(401).send('Unauthorized');
        }

        const newMessage = new Message({ user: req.session.user, content });
        await newMessage.save();
        res.status(201).send('Message saved.');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error saving message.');
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
