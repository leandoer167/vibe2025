const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const fs = require('fs');

const app = express();
const port = 3000;

// Подключение к MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234567890aA',
    database: 'todolist'
});

db.connect(err => {
    if (err) throw err;
    console.log('Connected to MySQL');
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

// Middleware для проверки авторизации
function isAuthenticated(req, res, next) {
    if (req.session.userId) return next();
    res.redirect('/login');
}

// Главная страница: список дел пользователя
app.get('/', isAuthenticated, (req, res) => {
    db.query('SELECT * FROM items WHERE user_id = ?', [req.session.userId], (err, results) => {
        if (err) throw err;

        const rowsHtml = results.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${item.text}</td>
                <td>
                    <form action="/delete/${item.id}" method="POST" style="display:inline;">
                        <button type="submit">Remove</button>
                    </form>
                    <form action="/edit/${item.id}" method="GET" style="display:inline;">
                        <button type="submit">Edit</button>
                    </form>
                </td>
            </tr>
        `).join('');

        fs.readFile('index.html', 'utf8', (err, html) => {
            if (err) throw err;
            res.send(html.replace('{{rows}}', rowsHtml));
        });
    });
});

// Регистрация
app.get('/register', (req, res) => {
    res.send(`
        <h2 style="text-align:center;">Register</h2>
        <form action="/register" method="POST" style="width: 70%; margin: 20px auto;">
            <input name="username" placeholder="Username" required style="width: 70%; padding: 8px;"><br><br>
            <input type="password" name="password" placeholder="Password" required style="width: 70%; padding: 8px;"><br><br>
            <button type="submit" style="padding: 8px; width: 20%;">Register</button>
        </form>
        <div style="text-align:center;"><a href="/login">Login</a></div>
    `);
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);

    db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashed], (err) => {
        if (err) {
            console.log(err);
            return res.send('Username already taken. <a href="/register">Try again</a>');
        }
        res.redirect('/login');
    });
});

// Вход
app.get('/login', (req, res) => {
    res.send(`
        <h2 style="text-align:center;">Login</h2>
        <form action="/login" method="POST" style="width: 70%; margin: 20px auto;">
            <input name="username" placeholder="Username" required style="width: 70%; padding: 8px;"><br><br>
            <input type="password" name="password" placeholder="Password" required style="width: 70%; padding: 8px;"><br><br>
            <button type="submit" style="padding: 8px; width: 20%;">Login</button>
        </form>
        <div style="text-align:center;"><a href="/register">Register</a></div>
    `);
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) throw err;
        if (results.length === 0) return res.send('Invalid login. <a href="/login">Try again</a>');

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);

        if (match) {
            req.session.userId = user.id;
            res.redirect('/');
        } else {
            res.send('Wrong password. <a href="/login">Try again</a>');
        }
    });
});

// Выход
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Добавление
app.post('/add', isAuthenticated, (req, res) => {
    const text = req.body.text;
    if (text && text.trim() !== '') {
        db.query('INSERT INTO items (text, user_id) VALUES (?, ?)', [text, req.session.userId], (err) => {
            if (err) throw err;
            res.redirect('/');
        });
    } else {
        res.redirect('/');
    }
});

// Удаление
app.post('/delete/:id', isAuthenticated, (req, res) => {
    db.query('DELETE FROM items WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId], (err) => {
        if (err) throw err;
        res.redirect('/');
    });
});

// Форма редактирования
app.get('/edit/:id', isAuthenticated, (req, res) => {
    db.query('SELECT * FROM items WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId], (err, results) => {
        if (err) throw err;
        if (results.length === 0) return res.redirect('/');
        const item = results[0];
        res.send(`
            <h2 style="text-align: center;">Edit Item</h2>
            <form action="/edit/${item.id}" method="POST" style="width: 70%; margin: 20px auto;">
                <input type="text" name="text" value="${item.text}" style="width: 70%; padding: 8px;" required>
                <button type="submit" style="padding: 8px; width: 20%;">Save</button>
            </form>
            <div style="text-align: center;"><a href="/">Back</a></div>
        `);
    });
});

// Сохранение редактирования
app.post('/edit/:id', isAuthenticated, (req, res) => {
    const text = req.body.text;
    db.query('UPDATE items SET text = ? WHERE id = ? AND user_id = ?', [text, req.params.id, req.session.userId], (err) => {
        if (err) throw err;
        res.redirect('/');
    });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
