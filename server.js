const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const dotenv = require('dotenv');
const http = require('http');
const socketIO = require('socket.io');
const User = require('./models/User');
const Message = require('./models/Message');

const app = express();
const port = process.env.PORT || 3001;

dotenv.config();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.set('view engine', 'ejs');

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch((err) => console.error('Error connecting to MongoDB:', err));

const server = http.createServer(app);
const io = socketIO(server);




app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/public/register.html');
});

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/chat', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('chat', { username: req.session.user });
});




// log out

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error logging out.');
        }
        res.redirect('/login');
    });
});


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

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (user) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                req.session.user = user.name;
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

app.get('/messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp: 1 });
        res.json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving messages.');
    }
});

app.post('/messages', async (req, res) => {
    const { content, user, isImage, timestamp } = req.body;

    try {
        if (!req.session.user) {
            return res.status(401).send('Unauthorized');
        }

        const newMessage = new Message({
            user: user || req.session.user,
            content: content,
            isImage: isImage || false,
            timestamp: timestamp || new Date()
        });

        await newMessage.save();
        io.emit('newMessage', newMessage);
        res.status(201).send('Message saved.');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error saving message.');
    }
});

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('newMessage', (message) => {
        io.emit('newMessage', message);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});


server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
