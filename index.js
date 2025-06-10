const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const port = 3000;

// Настройка базы данных
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',       // замените при необходимости
    password: '1234567890aA',
    database: 'todolist'
});

// Подключение
db.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL');
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

// Главная страница
app.get('/', (req, res) => {
    db.query('SELECT * FROM items', (err, results) => {
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

// Добавление нового дела
app.post('/add', (req, res) => {
    const text = req.body.text;
    if (text && text.trim() !== '') {
        db.query('INSERT INTO items (text) VALUES (?)', [text], (err) => {
            if (err) throw err;
            res.redirect('/');
        });
    } else {
        res.redirect('/');
    }
});

// Удаление
app.post('/delete/:id', (req, res) => {
    const id = req.params.id;
    db.query('DELETE FROM items WHERE id = ?', [id], (err) => {
        if (err) throw err;
        res.redirect('/');
    });
});

// Отображение формы редактирования
app.get('/edit/:id', (req, res) => {
    const id = req.params.id;
    db.query('SELECT * FROM items WHERE id = ?', [id], (err, results) => {
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

// Обработка редактирования
app.post('/edit/:id', (req, res) => {
    const id = req.params.id;
    const newText = req.body.text;
    if (newText && newText.trim() !== '') {
        db.query('UPDATE items SET text = ? WHERE id = ?', [newText, id], (err) => {
            if (err) throw err;
            res.redirect('/');
        });
    } else {
        res.redirect('/');
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
