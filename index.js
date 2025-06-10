const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

// Настройка базы данных
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',       // замените на вашего пользователя MySQL
    password: '1234567890aA',       // замените на ваш пароль
    database: 'todolist'
});

// Подключение к базе данных
db.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL database');
});

// Настройка шаблонизатора
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

// Отображение списка дел
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
                </td>
            </tr>
        `).join('');

        const fs = require('fs');
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

// Удаление дела
app.post('/delete/:id', (req, res) => {
    const id = req.params.id;
    db.query('DELETE FROM items WHERE id = ?', [id], (err) => {
        if (err) throw err;
        res.redirect('/');
    });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
